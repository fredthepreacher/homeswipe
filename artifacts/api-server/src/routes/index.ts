import { Router, type IRouter } from "express";
import healthRouter from "./health";
import listingsRouter from "./listings";
import authRouter from "./auth";
import brokerRouter from "./broker";
import adminRouter from "./admin";
import conversationsRouter from "./conversations";
import preferencesRouter from "./preferences";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(listingsRouter);
router.use(brokerRouter);
router.use(adminRouter);
router.use(conversationsRouter);
router.use(preferencesRouter);

export default router;
