import AgencyLevelConfig from "../models/agencyLevelConfig.model.js";
import AgencyLevel from "../models/agencyLevel.model.js";
import AgencyDailyTally from "../models/agencyDailyTally.model.js";
import AgencyCommission from "../models/agencyCommission.model.js";
import userModel from "../models/user.model.js";
import accountModel from "../models/account.model.js";
import transactionLedgerModel from "../models/transactionLedger.model.js";
import mongoose from "mongoose";
import { parseISTDate, toISTDate, toISTString } from "../utils/time.js";

function todayDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function yesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getAncestors(path) {
  if (!path || !path.length) return { l1: null, l2: null, l3: null };
  const len = path.length;
  return {
    l1: path[len - 1],
    l2: len >= 2 ? path[len - 2] : null,
    l3: len >= 3 ? path[len - 3] : null,
  };
}

async function getPath(userId) {
  const user = await userModel.findOne({ userId }).select("path");
  return user ? user.path : null;
}

export async function getAllLevelConfigs() {
  return AgencyLevelConfig.find().sort({ level: 1 });
}

export async function updateLevelConfig(level, data) {
  return AgencyLevelConfig.findOneAndUpdate({ level }, { $set: data }, { returnDocument: "after" });
}

export async function incrementDepositTally(userId, depositAmount, isFirstDeposit = false) {
  const path = await getPath(userId);
  if (!path) return;
  const { l1, l2, l3 } = getAncestors(path);
  const today = todayDate();
  const ops = [];
  const inc = { l1Deposit: depositAmount, l1DepositCount: 1 };
  if (isFirstDeposit) { inc.l1FirstDepositCount = 1; inc.l1FirstDepositAmount = depositAmount; }
  if (l1) ops.push({ updateOne: { filter: { userId: l1, date: today }, update: { $inc: inc }, upsert: true } });
  const inc2 = { l2Deposit: depositAmount, l2DepositCount: 1 };
  if (isFirstDeposit) { inc2.l2FirstDepositCount = 1; inc2.l2FirstDepositAmount = depositAmount; }
  if (l2) ops.push({ updateOne: { filter: { userId: l2, date: today }, update: { $inc: inc2 }, upsert: true } });
  const inc3 = { l3Deposit: depositAmount, l3DepositCount: 1 };
  if (isFirstDeposit) { inc3.l3FirstDepositCount = 1; inc3.l3FirstDepositAmount = depositAmount; }
  if (l3) ops.push({ updateOne: { filter: { userId: l3, date: today }, update: { $inc: inc3 }, upsert: true } });
  if (ops.length > 0) await AgencyDailyTally.bulkWrite(ops);
}
