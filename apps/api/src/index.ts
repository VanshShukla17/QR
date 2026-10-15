import "dotenv/config";
import { app } from "./app.js";
import { initSentry } from "./config/sentry.js";

initSentry();

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(
    `[QRaksha API] Running on port ${port} in ${process.env.NODE_ENV || "development"} mode`
  );
});
