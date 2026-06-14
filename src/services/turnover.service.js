import mongoose from "mongoose";
import accountModel from "../models/account.model.js";
import TurnoverConfig from "../models/turnoverConfig.model.js";
import logger from "../utils/logger.js";

export async function addTurnoverRequirement(userId, amount, type, sourceRef = null) {
  if (amount <= 0) {
    logger.warn(`[turnover] Skipping invalid amount ${amount} for user ${userId}`);
    return null;
  }

  const multiplier = await TurnoverConfig.getMultiplier(type);
  const required = amount * multiplier;

  const batch = {
    _id: new mongoose.Types.ObjectId(),
    type,
    amount,
    multiplier,
    required,
    completed: 0,
    createdAt: new Date(),
    sourceRef,
  };

  const account = await accountModel.findOneAndUpdate(
    { user: userId },
    {
      $inc: { turnover_requirement: required },
      $push: { turnover_batches: batch },
    },
    { returnDocument: "after", projection: { turnover_requirement: 1 } },
  );

  if (!account) {
    throw new Error("Account not found");
  }

  logger.info(`[turnover] Added ${required} turnover for user ${userId}, type: ${type}`);

  return {
    batchId: batch._id,
    type,
    amount,
    multiplier,
    required,
    totalTurnover: account.turnover_requirement,
  };
}

export async function getTurnoverStatus(userId) {
  const account = await accountModel.findOne({ user: userId });
  if (!account) {
    throw new Error("Account not found");
  }

  let progress = 100;
  let totalRequired = 0;
  let totalCompleted = 0;

  for (const batch of account.turnover_batches) {
    totalRequired += batch.required;
    totalCompleted += batch.completed;
  }

  if (account.turnover_requirement > 0 && totalRequired > 0) {
    progress = (totalCompleted / totalRequired) * 100;
  }

  return {
    total_required: totalRequired,
    requirement: account.turnover_requirement,
    completed: totalCompleted,
    progress: Math.min(100, Math.max(0, progress)),
    batches: account.turnover_batches.map((b) => ({
      type: b.type,
      amount: b.amount,
      multiplier: b.multiplier,
      required: b.required,
      completed: b.completed,
      remaining: Math.max(0, b.required - b.completed),
      createdAt: b.createdAt,
    })),
    canWithdraw: account.turnover_requirement <= 0,
  };
}

export async function clearAllTurnover(userId, reason = "Manual clear") {
  const account = await accountModel.findOne({ user: userId });
  if (!account) {
    throw new Error("Account not found");
  }

  account.turnover_requirement = 0;
  account.turnover_batches = [];
  account.total_turnover_completed = 0;
  await account.save();

  logger.info(`[turnover] Cleared all turnover for user ${userId}, reason: ${reason}`);

  return { cleared: true, userId };
}
