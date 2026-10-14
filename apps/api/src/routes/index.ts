import { Router } from "express";

import { merchantsRouter } from "./merchants.js";

export const apiRouter = Router();

apiRouter.use("/merchants", merchantsRouter);
