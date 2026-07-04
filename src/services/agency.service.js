import AgencyLevelConfig from "../models/agencyLevelConfig.model.js";
import AgencyLevel from "../models/agencyLevel.model.js";
import AgencyCommission from "../models/agencyCommission.model.js";
import DailyGameStats from "../models/dailyGameStats.model.js";
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

function getRebateLevel(teamMembers, teamBets, teamDeposit, configs) {
  let best = 0;
  for (const cfg of configs) {
    if (teamMembers >= cfg.minMembers && teamBets >= cfg.minBets && teamDeposit >= cfg.minDeposit) {
      if (cfg.level > best) best = cfg.level;
    }
  }
  return best;
}

export async function processMidnightBatch() {
  const unprocessed = await DailyGameStats.find({ commissionProcessed: { $ne: true } }).lean();
  if (!unprocessed.length) return { processed: 0, totalCommission: 0 };

  const levelConfigs = await AgencyLevelConfig.find().sort({ level: 1 });
  const configMap = {};
  for (const c of levelConfigs) configMap[c.level] = c;

  let totalCommission = 0;
  let processedDates = 0;

  for (const doc of unprocessed) {
    if (!doc.agents || Object.keys(doc.agents).length === 0) {
      await DailyGameStats.updateOne({ _id: doc._id }, { $set: { commissionProcessed: true } });
      processedDates++;
      continue;
    }

    const commissionDocs = [];
    const levelUpdates = [];
    const walletUserIds = [];

    for (const [agentId, tally] of Object.entries(doc.agents || {})) {
      const uid = Number(agentId);
      let levelRec = await AgencyLevel.findOne({ userId: uid });
      if (!levelRec) {
        levelRec = await AgencyLevel.create({ userId: uid, level: 0 });
      }

      const l1Bets = tally.l1Bets || 0;
      const l2Bets = tally.l2Bets || 0;
      const l3Bets = tally.l3Bets || 0;
      const l1Deposit = tally.l1Deposit || 0;
      const l2Deposit = tally.l2Deposit || 0;
      const l3Deposit = tally.l3Deposit || 0;
      const l1RegCount = tally.l1RegCount || 0;
      const l2RegCount = tally.l2RegCount || 0;
      const l3RegCount = tally.l3RegCount || 0;
      const l1Withdrawal = tally.l1Withdrawal || 0;
      const l2Withdrawal = tally.l2Withdrawal || 0;
      const l3Withdrawal = tally.l3Withdrawal || 0;

      const newTeamBets = levelRec.teamBets + l1Bets + l2Bets + l3Bets;
      const newTeamDeposit = levelRec.teamDeposit + l1Deposit + l2Deposit + l3Deposit;
      const newTeamMembers = levelRec.teamMembers + l1RegCount + l2RegCount + l3RegCount;
      const newL1Bets = (levelRec.l1Bets || 0) + l1Bets;
      const newL2Bets = (levelRec.l2Bets || 0) + l2Bets;
      const newL3Bets = (levelRec.l3Bets || 0) + l3Bets;
      const newL1Deposit = (levelRec.l1Deposit || 0) + l1Deposit;
      const newL2Deposit = (levelRec.l2Deposit || 0) + l2Deposit;
      const newL3Deposit = (levelRec.l3Deposit || 0) + l3Deposit;
      const newL1Withdrawal = (levelRec.l1Withdrawal || 0) + l1Withdrawal;
      const newL2Withdrawal = (levelRec.l2Withdrawal || 0) + l2Withdrawal;
      const newL3Withdrawal = (levelRec.l3Withdrawal || 0) + l3Withdrawal;
      const newLevel = getRebateLevel(newTeamMembers, newTeamBets, newTeamDeposit, levelConfigs);
      const rates = configMap[newLevel] || configMap[0];

      const l1Amount = parseFloat((l1Bets * rates.l1Rate).toFixed(2));
      const l2Amount = parseFloat((l2Bets * rates.l2Rate).toFixed(2));
      const l3Amount = parseFloat((l3Bets * rates.l3Rate).toFixed(2));
      const total = parseFloat((l1Amount + l2Amount + l3Amount).toFixed(2));

      if (total > 0) {
        commissionDocs.push({
          userId: uid,
          date: doc.date,
          rebateLevel: newLevel,
          l1Bets,
          l2Bets,
          l3Bets,
          l1Rate: rates.l1Rate,
          l2Rate: rates.l2Rate,
          l3Rate: rates.l3Rate,
          l1Amount,
          l2Amount,
          l3Amount,
          totalAmount: total,
          status: "CREDITED",
          creditedAt: new Date(),
        });
        walletUserIds.push(uid);
      }

      levelUpdates.push({
        updateOne: {
          filter: { userId: uid },
          update: {
            $set: {
              level: newLevel,
              teamBets: newTeamBets,
              teamDeposit: newTeamDeposit,
              l1Bets: newL1Bets,
              l2Bets: newL2Bets,
              l3Bets: newL3Bets,
              l1Deposit: newL1Deposit,
              l2Deposit: newL2Deposit,
              l3Deposit: newL3Deposit,
              l1Withdrawal: newL1Withdrawal,
              l2Withdrawal: newL2Withdrawal,
              l3Withdrawal: newL3Withdrawal,
            },
          },
        },
      });
    }

    if (commissionDocs.length > 0) {
      await AgencyCommission.insertMany(commissionDocs);

      const accounts = await accountModel.find({ user: { $in: walletUserIds } });
      const balanceMap = {};
      for (const a of accounts) balanceMap[a.user] = a.balance;

      const balanceOps = [];
      const ledgerDocs = [];

      for (const doc of commissionDocs) {
        const currentBalance = balanceMap[doc.userId] || 0;
        const newBalance = currentBalance + doc.totalAmount;
        balanceOps.push({
          updateOne: {
            filter: { user: doc.userId },
            update: { $inc: { balance: doc.totalAmount } },
          },
        });
        ledgerDocs.push({
          userId: doc.userId,
          type: "AGENT_COMMISSION",
          amount: doc.totalAmount,
          balanceAfter: newBalance,
          status: "SUCCESS",
        });
      }

      if (balanceOps.length > 0) await accountModel.bulkWrite(balanceOps);
      if (ledgerDocs.length > 0) await transactionLedgerModel.insertMany(ledgerDocs);
      totalCommission += commissionDocs.reduce((s, d) => s + d.totalAmount, 0);
    }

    if (levelUpdates.length > 0) await AgencyLevel.bulkWrite(levelUpdates);
    await DailyGameStats.updateOne({ _id: doc._id }, { $set: { commissionProcessed: true } });
    processedDates++;
  }

  return { processed: processedDates, totalCommission };
}

export async function updateLevelConfig(level, data) {
  return AgencyLevelConfig.findOneAndUpdate({ level }, { $set: data }, { returnDocument: "after" });
}

export async function incrementDepositTally(userId, depositAmount, isFirstDeposit = false) {
  const path = await getPath(userId);
  if (!path) return;
  const { l1, l2, l3 } = getAncestors(path);
  const today = todayDate();
  const inc = {};
  if (l1) {
    inc[`agents.${l1}.l1Deposit`] = depositAmount;
    inc[`agents.${l1}.l1DepositCount`] = 1;
    if (isFirstDeposit) {
      inc[`agents.${l1}.l1FirstDepositCount`] = 1;
      inc[`agents.${l1}.l1FirstDepositAmount`] = depositAmount;
    }
  }
  if (l2) {
    inc[`agents.${l2}.l2Deposit`] = depositAmount;
    inc[`agents.${l2}.l2DepositCount`] = 1;
    if (isFirstDeposit) {
      inc[`agents.${l2}.l2FirstDepositCount`] = 1;
      inc[`agents.${l2}.l2FirstDepositAmount`] = depositAmount;
    }
  }
  if (l3) {
    inc[`agents.${l3}.l3Deposit`] = depositAmount;
    inc[`agents.${l3}.l3DepositCount`] = 1;
    if (isFirstDeposit) {
      inc[`agents.${l3}.l3FirstDepositCount`] = 1;
      inc[`agents.${l3}.l3FirstDepositAmount`] = depositAmount;
    }
  }
  if (Object.keys(inc).length === 0) return;
  await DailyGameStats.updateOne({ date: today }, { $inc: inc, $set: { lastUpdatedAt: new Date() } }, { upsert: true });
}
