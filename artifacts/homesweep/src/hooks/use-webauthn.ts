/**
 * WebAuthn hook — wraps the browser's credential API for face/fingerprint login.
 * Works with Face ID (iOS Safari), fingerprint / face on Android Chrome,
 * and Windows Hello on desktop.
 */

const RP_NAME = "HomeSwipe";

function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

function randomChallenge(): ArrayBuffer {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return arr.buffer as ArrayBuffer;
}

export function useWebAuthn() {
  const isSupported =
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined";

  async function register(userId: number, userName: string): Promise<string> {
    if (!isSupported) throw new Error("WebAuthn not supported on this device");

    const challenge = randomChallenge();
    const userIdBuf = new TextEncoder().encode(String(userId));

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: RP_NAME },
        user: { id: userIdBuf, name: userName, displayName: userName },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential) throw new Error("No credential returned");
    return bufferToBase64(credential.rawId);
  }

  async function authenticate(credentialId: string): Promise<string> {
    if (!isSupported) throw new Error("WebAuthn not supported on this device");

    const challenge = randomChallenge();
    const allowCredentials: PublicKeyCredentialDescriptor[] = [
      {
        type: "public-key",
        id: base64ToBuffer(credentialId),
        transports: ["internal"],
      },
    ];

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials,
        userVerification: "required",
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) throw new Error("Authentication cancelled");
    return bufferToBase64(assertion.rawId);
  }

  return { isSupported, register, authenticate };
}
