import cors from "cors";
import dotenv from "dotenv";
import express, { type Request, type Response } from "express";

import { VerdictSchema } from "@qraksha/shared";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`QRaksha API listening on port ${port}`);
  });
}

export default app;
