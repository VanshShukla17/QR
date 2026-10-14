import cors from "cors";
import dotenv from "dotenv";
import express, { type Request, type Response } from "express";

import { VerdictSchema } from "@qraksha/shared";
import { errorHandler } from "./middleware/index.js";
import { apiRouter } from "./routes/index.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    supportedVerdicts: VerdictSchema.options,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1", apiRouter);

app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`QRaksha API listening on port ${port}`);
  });
}

export default app;
