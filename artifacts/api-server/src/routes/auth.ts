import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logAction } from "../lib/audit";

const router: IRouter = Router();
const JWT_SECRET = process.env["JWT_SECRET"] || "homesweep-jwt-dev-secret-2025";
const SALT_ROUNDS = 10;

const RegisterBody = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  password: z.string().min(6),
  role: z.enum(["consumer", "broker", "landlord"]).optional().default("consumer"),
  licenseId: z.string().min(1).optional(),
  licenseState: z.string().min(1).optional(),
  brokerage: z.string().min(1).optional(),
  businessAddress: z.string().min(1).optional(),
}).refine((d) => d.email || d.phone, { message: "Email or phone required" })
  .refine((d) => d.role !== "broker" || !!d.licenseId, { message: "Broker license ID is required" })
  .refine((d) => d.role !== "broker" || !!d.licenseState, { message: "State of licensure is required" })
  .refine((d) => d.role !== "broker" || !!d.brokerage, { message: "Associated brokerage is required" })
  .refine((d) => d.role !== "broker" || !!d.businessAddress, { message: "Business address is required" })
  .refine((d) => d.role !== "landlord" || !!d.licenseState, { message: "State of operation is required" })
  .refine((d) => d.role !== "landlord" || !!d.brokerage, { message: "Company name is required" })
  .refine((d) => d.role !== "landlord" || !!d.businessAddress, { message: "Business address is required" });

const LoginBody = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

const ForgotPasswordBody = z.object({
  identifier: z.string().min(1),
});

const WebAuthnRegisterBody = z.object({
  credentialId: z.string().min(1),
});

const WebAuthnLoginBody = z.object({
  credentialId: z.string().min(1),
});

function makeToken(userId: number, role: string) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "30d" });
}

function safeUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role as "consumer" | "broker" | "landlord" | "admin",
    hasWebauthn: !!u.webauthnCredentialId,
    licenseId: u.licenseId ?? null,
    licenseState: u.licenseState ?? null,
    brokerage: u.brokerage ?? null,
    businessAddress: u.businessAddress ?? null,
  };
}

router.post("/auth/register", async (req, res) => {
  try {
    const body = RegisterBody.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

    const existing = await db
      .select()
      .from(usersTable)
      .where(
        body.email
          ? eq(usersTable.email, body.email)
          : eq(usersTable.phone, body.phone!)
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "Account already exists with that email or phone" });
    }

    const [user] = await db
      .insert(usersTable)
      .values({
        name: body.name,
        email: body.email,
        phone: body.phone,
        passwordHash,
        role: body.role,
        licenseId: body.licenseId,
        licenseState: body.licenseState,
        brokerage: body.brokerage,
        businessAddress: body.businessAddress,
      })
      .returning();

    const token = makeToken(user.id, user.role);
    res.status(201).json({ token, user: safeUser(user) });

    logAction({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "user.registered",
      entityType: "user",
      entityId: user.id,
      details: { email: user.email, phone: user.phone, role: user.role },
      ipAddress: req.ip,
    });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: "Invalid request data" });
    req.log.error({ err }, "Register failed");
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { identifier, password } = LoginBody.parse(req.body);
    const isEmail = identifier.includes("@");

    const [user] = await db
      .select()
      .from(usersTable)
      .where(isEmail ? eq(usersTable.email, identifier) : eq(usersTable.phone, identifier))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "No account found with that email or phone" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    const token = makeToken(user.id, user.role);
    res.json({ token, user: safeUser(user) });

    logAction({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "user.login",
      entityType: "user",
      entityId: user.id,
      details: { identifier, role: user.role },
      ipAddress: req.ip,
    });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: "Invalid request data" });
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { identifier } = ForgotPasswordBody.parse(req.body);
    const isEmail = identifier.includes("@");
    const [user] = await db
      .select()
      .from(usersTable)
      .where(isEmail ? eq(usersTable.email, identifier) : eq(usersTable.phone, identifier))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "No account found with that email or phone" });
    }

    res.json({ success: true, message: "If an account exists, a reset link has been sent." });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: "Invalid request data" });
    req.log.error({ err }, "Forgot password failed");
    res.status(500).json({ error: "Failed to process request" });
  }
});

router.post("/auth/webauthn/register", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as { userId: number };
    const { credentialId } = WebAuthnRegisterBody.parse(req.body);

    await db
      .update(usersTable)
      .set({ webauthnCredentialId: credentialId })
      .where(eq(usersTable.id, payload.userId));

    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "WebAuthn register failed");
    res.status(500).json({ error: "Failed to register biometric" });
  }
});

router.post("/auth/webauthn/login", async (req, res) => {
  try {
    const { credentialId } = WebAuthnLoginBody.parse(req.body);

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.webauthnCredentialId, credentialId))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "Biometric not recognized. Please use email/phone login." });
    }

    const token = makeToken(user.id, user.role);
    res.json({ token, user: safeUser(user) });
  } catch (err: any) {
    req.log.error({ err }, "WebAuthn login failed");
    res.status(500).json({ error: "Biometric login failed" });
  }
});

export default router;
