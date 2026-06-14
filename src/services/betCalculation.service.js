import accountModel from "../models/account.model.js";
import logger from "../utils/logger.js";
import { getTurnoverStatus } from "./turnover.service.js";

export async function calculateBetBalances(userId) {
  const account = await accountModel.findOne({ user: userId });
  if (!account) {
    throw new Error("Account not found");
  }

  const turnoverStatus = await getTurnoverStatus(userId);

  logger.info(
    `[betCalc] User ${userId}: balance=${account.balance}, turnover=${turnoverStatus.turnover_requirement}`
  );

  return {
    processed: 0,
    turnover_requirement: turnoverStatus.turnover_requirement,
    canWithdraw: turnoverStatus.canWithdraw,
    total_turnover_completed: turnoverStatus.total_turnover_completed,
    progress: turnoverStatus.progress,
  };
}
