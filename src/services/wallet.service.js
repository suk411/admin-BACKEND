import mongoose from "mongoose";
import accountModel from "../models/account.model.js";
import transactionLedgerModel from "../models/transactionLedger.model.js";
import DepositOrder from "../models/depositOrder.model.js";
import DepositBonusConfig from "../models/depositBonusConfig.model.js";
import VipConfig, { ensureDefaultVipConfig } from "../models/vipConfig.model.js";
import TurnoverConfig from "../models/turnoverConfig.model.js";

export async function deposit(userId, amount, orderId) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const account = await accountModel.findOne({ user: userId }).session(session);
    if (!account) throw new Error("Account not found");

    const order = await DepositOrder.findOne({ orderId }).session(session);
    const bonusOptIn = order ? order.bonusOptIn : false;

    let bonusAmount = 0;
    let bonusDepositCount = 0;
    if (bonusOptIn) {
      const bonusClaimedCount = await transactionLedgerModel.countDocuments({
        userId, type: "DEPOSIT_BONUS", status: "SUCCESS",
      }).session(session);
      const nextBonusCount = bonusClaimedCount + 1;
      if (nextBonusCount >= 1 && nextBonusCount <= 3) {
        bonusDepositCount = nextBonusCount;
        await DepositBonusConfig.getDefaultConfigs();
        const rate = await DepositBonusConfig.getRate(nextBonusCount);
        bonusAmount = rate > 0 ? Math.round(amount * rate) : 0;
      }
    }

    const totalAmount = amount + bonusAmount;
    const newBalance = account.balance + totalAmount;

    await transactionLedgerModel.create(
      [
        {
          userId,
          type: "DEPOSIT",
          amount,
          balanceAfter: newBalance,
          status: "SUCCESS",
          orderId,
        },
      ],
      { session },
    );

    if (bonusAmount > 0) {
      await transactionLedgerModel.create(
        [
          {
            userId,
            type: "DEPOSIT_BONUS",
            amount: bonusAmount,
            balanceAfter: newBalance,
            status: "SUCCESS",
            orderId,
            remark: `Deposit bonus for deposit #${bonusDepositCount}`,
          },
        ],
        { session },
      );
    }

    const config = await ensureDefaultVipConfig();
    const levels = (config && config.levels) || [];
    const prevLevelName = account.vipLevel || "VIP 1";
    const newTotalDeposits = (account.totalDeposits || 0) + amount;

    let newLevel = { name: "VIP 1", weeklyBonus: 0, upgradeBonus: 0, weeklyDepositRequirement: 0, minDeposit: 0 };
    const sortedLevels = [...levels].sort((a, b) => a.minDeposit - b.minDeposit);
    for (const lvl of sortedLevels) {
      if (newTotalDeposits >= lvl.minDeposit) newLevel = lvl;
    }
    const levelChanged = newLevel.name !== prevLevelName;

    let crossedReward = 0;
    const prevIdx = sortedLevels.findIndex((l) => l.name === prevLevelName);
    const newIdx = sortedLevels.findIndex((l) => l.name === newLevel.name);
    if (newIdx > prevIdx) {
      for (let i = Math.max(prevIdx + 1, 0); i <= newIdx; i++) {
        crossedReward += Number(sortedLevels[i].upgradeBonus || 0);
      }
    }

    const update = {
      $inc: {
        balance: totalAmount,
        totalDeposits: amount,
        ...(crossedReward > 0 ? { pendingUpgradeBonus: crossedReward } : {}),
      },
    };
    if (levelChanged) {
      update.$set = {
        ...(update.$set || {}),
        vipLevel: newLevel.name,
        vipSince: new Date(),
      };
    }

    const updatedAccount = await accountModel.findOneAndUpdate({ user: userId }, update, {
      returnDocument: "after",
      session,
    });

    await TurnoverConfig.getDefaultConfig();
    const depositMultiplier = await TurnoverConfig.getMultiplier("DEPOSIT");
    const depositRequired = amount * depositMultiplier;
    const turnoverUpdate = {
      $inc: { turnover_requirement: depositRequired },
      $push: {
        turnover_batches: {
          type: "DEPOSIT",
          amount,
          multiplier: depositMultiplier,
          required: depositRequired,
          completed: 0,
          createdAt: new Date(),
          sourceRef: orderId,
        },
      },
    };
    await accountModel.updateOne({ user: userId }, turnoverUpdate, { session });

    if (bonusAmount > 0) {
      const bonusMultiplier = await TurnoverConfig.getMultiplier("DEPOSIT_BONUS");
      const bonusRequired = bonusAmount * bonusMultiplier;
      await accountModel.updateOne(
        { user: userId },
        {
          $inc: { turnover_requirement: bonusRequired },
          $push: {
            turnover_batches: {
              type: "DEPOSIT_BONUS",
              amount: bonusAmount,
              multiplier: bonusMultiplier,
              required: bonusRequired,
              completed: 0,
              createdAt: new Date(),
              sourceRef: orderId,
            },
          },
        },
        { session },
      );

      await DepositOrder.updateOne({ orderId }, { $set: { bonusAmount } }, { session });
    }

    await session.commitTransaction();

    return {
      ...updatedAccount.toObject(),
      bonusAmount,
    };
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}
