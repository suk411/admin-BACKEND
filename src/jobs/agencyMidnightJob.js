import cron from "node-cron";
import { processMidnightBatch } from "../services/agency.service.js";

const CRON_EXPRESSION = "0 0 * * *";

let isRunning = false;
let scheduledTask = null;

async function runMidnightBatch() {
  if (isRunning) return;
  isRunning = true;
  try {
    const result = await processMidnightBatch();
    console.log(`[admin:agencyMidnightJob] Processed ${result.processed} records, total commission: ${result.totalCommission}`);
  } catch (err) {
    console.error("[admin:agencyMidnightJob] Error:", err.message);
  } finally {
    isRunning = false;
  }
}

export function startAgencyMidnightScheduler() {
  scheduledTask = cron.schedule(
    CRON_EXPRESSION,
    async () => {
      try {
        await runMidnightBatch();
      } catch (error) {
        console.error("[admin:agencyMidnightJob] Error:", error.message);
      }
    },
    { scheduled: true, timezone: "Asia/Kolkata" },
  );

  return {
    stop() {
      if (scheduledTask) scheduledTask.stop();
    },
    runNow: runMidnightBatch,
  };
}
