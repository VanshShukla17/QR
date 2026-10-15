import { Router } from "express";
import { healthRouter } from "./health.js";
import { merchantRouter } from "./merchants.js";
import { verifyRouter } from "./verify.js";
import { auditRouter } from "./audit.js";
import { checkRouter } from "./check.js";
import { credentialsRouter } from "./credentials.js";
import { disputesRouter } from "./disputes.js";
import { adminRouter } from "./admin.js";
import { voiceRouter } from "./voice.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/merchants", merchantRouter);
apiRouter.use("/verify", verifyRouter);
apiRouter.use("/audit", auditRouter);
apiRouter.use("/check", checkRouter);
apiRouter.use("/credentials", credentialsRouter);
apiRouter.use("/disputes", disputesRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/voice", voiceRouter);
