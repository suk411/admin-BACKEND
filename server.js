process.env.TZ = "Asia/Kolkata";

import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import { connectWingoDB } from "./src/config/wingo-db.js";
import { connectRedis } from "./src/config/redis.js";

async function startServer() {
  try {
    await connectDB();
    await connectWingoDB();
    await connectRedis();

    const server = app.listen(process.env.PORT || 5000, () => {
      console.log(`[Admin] Listening on port ${process.env.PORT || 5000}`);
    });

    return server;
  } catch (error) {
    console.error("[Admin] Failed to start:", error.message);
    process.exit(1);
  }
}

startServer();
