import mongoose from "mongoose";
import accountModel from "../models/account.model.js";
import transactionLedgerModel from "../models/transactionLedger.model.js";
import userModel from "../models/user.model.js";
import DepositOrder from "../models/depositOrder.model.js";
import WithdrawalOrder from "../models/withdrawalOrder.model.js";
import PaymentMethod from "../models/paymentMethod.model.js";
import { deposit } from "../services/wallet.service.js";
import { incrementDepositTally } from "../services/agency.service.js";
import logger from "../utils/logger.js";
import VipConfig, { ensureDefaultVipConfig } from "../models/vipConfig.model.js";
import DepositConfig, { ensureDefaultDepositConfigs } from "../models/depositConfig.model.js";
import DeviceLog from "../models/deviceLog.model.js";
import BetRecord from "../models/betRecord.model.js";
import WingoBet from "../models/wingoBet.model.js";
import WithdrawalConfig from "../models/withdrawalConfig.model.js";
import { parseISTDate, parseISTDateEnd, toISTDate } from "../utils/time.js";
import { calculateBetBalances } from "../services/betCalculation.service.js";
import { buildUsername, buildPassword, buildReferenceId, resolveProviderCode, ensureProviderMember, makeTransfer, getGameBalance } from "../services/gameProvider.service.js";
import {
  createPayoutOrderForWithdrawal,
  createUpayPayoutOrderForWithdrawal,
  createGspayPayoutOrderForWithdrawal,
} from "../services/payment.service.js";

async function createAdminTransaction(req, res) {
  const { targetUserId, type, amount } = req.body;

  try {
    const account = await accountModel.findOne({ user: targetUserId });
    if (!account) {
      return res.status(404).json({ msg: "Target user account not found" });
    }

    const newBalance =
      account.balance +
      (["DEPOSIT", "WIN", "BONUS"].includes(type) ? amount : -amount);
    await accountModel.updateOne(
      { user: targetUserId },
      { balance: newBalance },
    );
    const ledger = await transactionLedgerModel.create({
      userId: targetUserId,
      type,
      amount: Math.abs(amount),
      balanceAfter: newBalance,
      status: "SUCCESS",
      orderId: `ADMIN${Date.now()}`,
    });

    res.json({
      msg: "Transaction created",
      targetUserId,
      type,
      amount,
      newBalance,
      orderId: ledger.orderId,
    });
  } catch (error) {
    logger.error(error, { where: "createAdminTransaction", targetUserId, type, amount });
    res.status(500).json({ msg: error.message });
  }
}

async function getAdminDashboard(req, res) {
  try {
    const { date, period } = req.query;

    let createdAtFilter = {};

    if (period === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      createdAtFilter = { $gte: today, $lt: tomorrow };
    } else if (period === "month") {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      createdAtFilter = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      createdAtFilter = { $gte: d, $lt: nextDay };
    }

    const hasDateFilter = Object.keys(createdAtFilter).length > 0;
    const dateMatch = hasDateFilter ? { createdAt: createdAtFilter } : {};
    const commissionMatch = hasDateFilter ? { ...dateMatch, type: "AGENT_COMMISSION" } : { type: "AGENT_COMMISSION" };

    const [totalUsers, newUsers, depositStats, withdrawalStats, agentCommissions] = await Promise.all([
      accountModel.countDocuments(),
      hasDateFilter ? userModel.countDocuments({ createdAt: createdAtFilter }) : Promise.resolve(0),
      DepositOrder.aggregate([
        { $match: dateMatch },
        { $group: { _id: "$status", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      WithdrawalOrder.aggregate([
        { $match: dateMatch },
        { $group: { _id: "$status", total: { $sum: "$amount" }, chargeTotal: { $sum: { $ifNull: ["$charge", 0] } }, count: { $sum: 1 } } },
      ]),
      transactionLedgerModel.aggregate([
        { $match: commissionMatch },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
    ]);

    const deposits = { total: 0, count: 0, pendingCount: 0 };
    for (const d of depositStats) {
      if (d._id === "SUCCESS") { deposits.total = d.total; deposits.count = d.count; }
      if (d._id === "PENDING") deposits.pendingCount = d.count;
    }

    const byStatus = {};
    let wCount = 0, wTotal = 0, wChargeTotal = 0;
    const wSuccess = { count: 0, total: 0, chargeTotal: 0 };
    const wPending = { count: 0, total: 0, chargeTotal: 0 };
    const wFailed = { count: 0, total: 0, chargeTotal: 0 };

    for (const s of withdrawalStats) {
      byStatus[s._id] = { count: s.count, total: s.total };
      wCount += s.count;
      wTotal += s.total;
      wChargeTotal += s.chargeTotal;
      if (s._id === "SUCCESS") { wSuccess.count = s.count; wSuccess.total = s.total; wSuccess.chargeTotal = s.chargeTotal; }
      else if (["PENDING", "AUDITING"].includes(s._id)) { wPending.count += s.count; wPending.total += s.total; wPending.chargeTotal += s.chargeTotal; }
      else if (s._id === "FAILED") { wFailed.count = s.count; wFailed.total = s.total; wFailed.chargeTotal = s.chargeTotal; }
    }

    res.json({
      status: "success",
      period: period || date || "all",
      overview: { totalUsers, newUsers: newUsers || 0 },
      deposits,
      withdrawals: {
        total: wTotal,
        chargeTotal: wChargeTotal,
        count: wCount,
        success: wSuccess,
        pending: wPending,
        failed: wFailed,
        byStatus,
      },
      agentCommission: {
        total: agentCommissions[0]?.total || 0,
        count: agentCommissions[0]?.count || 0,
      },
    });
  } catch (error) {
    logger.error(error, { where: "getAdminDashboard" });
    res.status(500).json({
      msg: "Error fetching admin dashboard data",
      status: "failed",
      error: error.message,
    });
  }
}

async function getUserLedgerByAdmin(req, res) {
  const { targetUserId, limit = 50 } = req.query;
  try {
    const ledger = await transactionLedgerModel
      .find({ userId: targetUserId })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .select("-_id -__v");
    if (!ledger || ledger.length === 0) {
      return res
        .status(404)
        .json({ msg: "No transactions found for this user" });
    }
    res.json({ targetUserId, transactions: ledger });
  } catch (error) {
    logger.error(error, { where: "getUserLedgerByAdmin", targetUserId, limit });
    res.status(500).json({ msg: error.message });
  }
}

async function searchUserOrAccount(req, res) {
  const { userId, mobile } = req.query;
  let idNum;
  if (userId) {
    idNum = Number(userId);
    if (Number.isNaN(idNum)) {
      return res.status(400).json({ msg: "Invalid userId" });
    }
  } else if (mobile) {
    const userByMobile = await userModel.findOne({ mobile: String(mobile) }).select("userId");
    if (!userByMobile) {
      return res.status(404).json({ msg: "User not found with this mobile" });
    }
    idNum = userByMobile.userId;
  } else {
    return res.status(400).json({ msg: "Provide userId or mobile" });
  }
  try {
    const [user, accountDoc, paymentMethod, lastDevice] = await Promise.all([
      userModel.findOne({ userId: idNum }).select("-password -__v"),
      accountModel.findOne({ user: idNum }).select("-__v -bindAccount").lean(),
      PaymentMethod.findOne({ userId: idNum }).select("-_id -__v").lean(),
      DeviceLog.findOne({ userId: idNum }).sort({ createdAt: -1 }).lean(),
    ]);
    if (!user && !accountDoc) {
      return res.status(404).json({ msg: "User or account not found" });
    }
    let sameIpUsers = 0;
    if (lastDevice?.ip) {
      const userIds = await DeviceLog.distinct("userId", { ip: lastDevice.ip, userId: { $ne: idNum } });
      sameIpUsers = userIds.length;
    }
    const { _id, turnover_batches, lastWeeklyBonusAt, pendingUpgradeBonus, firstDepositBonusGiven, ...accountRest } = accountDoc || {};
    const account = accountDoc
      ? {
          ...accountRest,
          turnover_batches: turnover_batches?.map(({ _id, lastCalcAt, lastBetId, sourceRef, ...batch }) => batch) || [],
        }
      : null;
    res.json({
      user: user
        ? {
            userId: user.userId,
            mobile: user.mobile,
            admin: user.admin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          }
        : null,
      account,
      paymentMethods: paymentMethod || null,
      sameIpUsers,
      lastIp: lastDevice?.ip || null,
      deviceInfo: lastDevice
        ? { ip: lastDevice.ip || "", city: lastDevice.city || "", region: lastDevice.region || "" }
        : null,
    });
  } catch (error) {
    logger.error(error, { where: "searchUserOrAccount", userId });
    res.status(500).json({ msg: error.message });
  }
}

async function getUsersByIp(req, res) {
  const { ip } = req.query;
  if (!ip) {
    return res.status(400).json({ status: "failed", msg: "ip is required" });
  }
  try {
    const userIds = await DeviceLog.distinct("userId", { ip });
    const users = await userModel
      .find({ userId: { $in: userIds } })
      .select("userId mobile createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ status: "success", ip, totalUsers: users.length, users });
  } catch (error) {
    logger.error(error, { where: "getUsersByIp", ip });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function getAdminDepositOrders(req, res) {
  const { orderId, userId, mobile, page = 1, limit = 50, status, dateFrom, dateTo } = req.query;
  try {
    const lm = Math.max(1, Math.min(100, Number(limit) || 50));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lm;

    if (orderId) {
      const order = await DepositOrder.findOne({ orderId }).select("-_id").lean();
      if (!order) {
        return res.status(404).json({ status: "failed", msg: "Order not found" });
      }
      return res.json({ status: "success", items: [order] });
    }

    let idNum;
    if (userId) {
      idNum = Number(userId);
      if (Number.isNaN(idNum)) {
        return res.status(400).json({ status: "failed", msg: "Invalid userId" });
      }
    } else if (mobile) {
      const user = await userModel.findOne({ mobile: String(mobile) }).select("userId").lean();
      if (!user) {
        return res.status(404).json({ status: "failed", msg: "User not found with this mobile" });
      }
      idNum = user.userId;
    }

    const query = {};
    if (idNum) query.userId = idNum;

    if (status) {
      query.status = status.toUpperCase();
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = parseISTDate(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    const [items, total] = await Promise.all([
      DepositOrder
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lm)
        .select("-_id -paymentLinks"),
      DepositOrder.countDocuments(query),
    ]);

    if (items.length === 0) {
      return res.json({ status: "success", total: 0, page: pg, limit: lm, items: [] });
    }

    res.json({ status: "success", total, page: pg, limit: lm, items });
  } catch (error) {
    logger.error(error, { where: "getAdminDepositOrders", orderId, userId, page, limit, status, dateFrom, dateTo });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function getUserTransactionsPaginated(req, res) {
  const { userId, orderId, transactionId, type, dateFrom, dateTo, page = 1, limit = 25 } = req.query;
  const pg = Math.max(1, Number(page) || 1);
  const lm = Math.max(1, Math.min(100, Number(limit) || 25));

  if (!userId && !orderId && !transactionId) {
    return res.status(400).json({ msg: "Provide userId, orderId, or transactionId" });
  }

  const filter = {};

  if (orderId) {
    filter.orderId = orderId;
  }

  if (transactionId) {
    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      return res.status(400).json({ msg: "Invalid transactionId" });
    }
    filter._id = new mongoose.Types.ObjectId(transactionId);
  }

  if (userId) {
    const idNum = Number(userId);
    if (Number.isNaN(idNum)) {
      return res.status(400).json({ msg: "Invalid userId" });
    }
    filter.userId = idNum;
  }

  if (type) {
    const validTypes = ["DEPOSIT","WITHDRAW","WITHDRAW_REFUND","BET","WIN","REFUND","BONUS","ADMIN","SIGNUP_BONUS","FIRST_DEPOSIT_BONUS","GIFT_CODE","AGENT_COMMISSION","WEEKLY_BONUS","UPGRADE_BONUS","gameIn","gameOut"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ msg: `Invalid type. Must be one of: ${validTypes.join(", ")}` });
    }
    filter.type = type;
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = parseISTDate(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  try {
    const skip = (pg - 1) * lm;
    const [items, total] = await Promise.all([
      transactionLedgerModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lm)
        .select("-_id -__v"),
      transactionLedgerModel.countDocuments(filter),
    ]);
    if (!items || items.length === 0) {
      return res.status(404).json({ msg: "No transactions found" });
    }
    res.json({ filter, total, page: pg, limit: lm, items });
  } catch (error) {
    logger.error(error, { where: "getUserTransactionsPaginated", userId, orderId, transactionId, page, limit });
    res.status(500).json({ msg: error.message });
  }
}

async function approveDepositOrder(req, res) {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ msg: "orderId is required" });
    }
    const order = await DepositOrder.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }
    if (order.status === "SUCCESS") {
      return res.json({ msg: "Already approved", orderId, status: order.status });
    }
    const acc = await accountModel.findOne({ user: order.userId }).select("totalDeposits");
    const isFirst = !acc || acc.totalDeposits === 0;
    const creditAmount = order.receivedAmount || order.amount;
    const depositResult = await deposit(order.userId, creditAmount, order.orderId);
    try {
      await incrementDepositTally(order.userId, creditAmount, isFirst);
    } catch (e) {
      console.error("Deposit tally error (admin approve):", e.message);
    }
    order.status = "SUCCESS";
    await order.save();
    res.json({
      msg: "Deposit approved",
      orderId: order.orderId,
      userId: order.userId,
      amount: order.amount,
      status: order.status,
      bonusAmount: depositResult.bonusAmount || 0,
    });
  } catch (error) {
    logger.error(error, { where: "approveDepositOrder", orderId: req.body && req.body.orderId });
    res.status(500).json({ msg: error.message });
  }
}

async function getAgencyLevelConfigs(req, res) {
  try {
    const { getAllLevelConfigs } = await import("../services/agency.service.js");
    const configs = await getAllLevelConfigs();
    res.json({ status: "success", configs });
  } catch (error) {
    logger.error(error, { where: "getAgencyLevelConfigs" });
    res.status(500).json({ msg: error.message });
  }
}

async function updateAgencyLevelConfig(req, res) {
  try {
    const { level } = req.params;
    const { updateLevelConfig } = await import("../services/agency.service.js");
    const levelNum = Number(level);
    if (isNaN(levelNum) || levelNum < 0 || levelNum > 10) {
      return res.status(400).json({ msg: "Level must be 0-10" });
    }
    const updated = await updateLevelConfig(levelNum, req.body);
    if (!updated) return res.status(404).json({ msg: "Level config not found" });
    res.json({ status: "success", config: updated });
  } catch (error) {
    logger.error(error, { where: "updateAgencyLevelConfig", body: req.body });
    res.status(500).json({ msg: error.message });
  }
}

async function updateUserStatusAdmin(req, res) {
  try {
    const { userId, status, remark } = req.body || {};
    const idNum = Number(userId);
    if (!userId || Number.isNaN(idNum)) {
      return res.status(400).json({ msg: "Invalid or missing userId" });
    }
    if (!status) {
      return res.status(400).json({ msg: "Missing status" });
    }
    const normalized =
      String(status).toLowerCase() === "active"
        ? "active"
        : String(status).toLowerCase() === "suspended"
          ? "suspended"
          : ["ban", "banned", "inactive"].includes(String(status).toLowerCase())
            ? "inactive"
            : null;
    if (!normalized) {
      return res.status(400).json({ msg: "Invalid status" });
    }
    if ((normalized === "inactive" || normalized === "suspended") && !remark) {
      return res.status(400).json({ msg: "Remark is required when banning or suspending" });
    }
    const account = await accountModel.findOneAndUpdate(
      { user: idNum },
      { $set: { status: normalized, statusRemark: String(remark || "") } },
      { returnDocument: "after" },
    );
    if (!account) {
      return res.status(404).json({ msg: "Account not found" });
    }
    res.json({
      msg: "Status updated",
      userId: idNum,
      status: account.status,
      statusRemark: account.statusRemark,
      updatedAt: account.updatedAt,
    });
  } catch (error) {
    logger.error(error, { where: "updateUserStatusAdmin", body: req.body });
    res.status(500).json({ msg: error.message });
  }
}

async function getServerLogs(req, res) {
  try {
    const { level, since, limit } = req.query;
    const entries = logger.getLogs({ level, since, limit: Number(limit) || 200 });
    res.json({ status: "success", count: entries.length, entries });
  } catch (error) {
    logger.error(error, { where: "getServerLogs", query: req.query });
    res.status(500).json({ msg: error.message });
  }
}

async function getVipConfig(req, res) {
  try {
    const cfg = await ensureDefaultVipConfig();
    res.json({ levels: cfg.levels });
  } catch (error) {
    logger.error(error, { where: "getVipConfig" });
    res.status(500).json({ msg: error.message });
  }
}

async function updateVipConfig(req, res) {
  try {
    const { levels } = req.body || {};
    if (!Array.isArray(levels) || levels.length === 0) {
      return res.status(400).json({ msg: "levels must be a non-empty array" });
    }
    for (const lvl of levels) {
      if (
        typeof lvl.name !== "string" ||
        typeof lvl.minDeposit !== "number" ||
        typeof lvl.weeklyBonus !== "number"
      ) {
        return res.status(400).json({ msg: "invalid level shape" });
      }
    }
    const doc = await VipConfig.findOneAndUpdate(
      {},
      { $set: { levels } },
      { upsert: true, returnDocument: "after" },
    );
    res.json({ msg: "Updated", levels: doc.levels });
  } catch (error) {
    logger.error(error, { where: "updateVipConfig", body: req.body });
    res.status(500).json({ msg: error.message });
  }
}

async function adminUpdateUserPayments(req, res) {
  try {
    const { userId, type, upiId, accountNo, ifsc, bankName, bankCode, accountHolder, rplId } = req.body || {};
    const idNum = Number(userId);
    if (!userId || Number.isNaN(idNum)) {
      return res.status(400).json({ msg: "Invalid or missing userId" });
    }
    const validTypes = ["BANK", "UPI", "UPAY"];
    const upperType = String(type).toUpperCase();
    if (!validTypes.includes(upperType)) {
      return res.status(400).json({ msg: "type must be BANK, UPI, or UPAY" });
    }

    const update = { userId: idNum, isActive: true, isDefault: true };
    if (accountHolder) update.holderName = accountHolder;

    if (upperType === "BANK") {
      update.bank = {
        bankName: bankName || "",
        ifsc: ifsc || bankCode || "",
        accountNo: accountNo || "",
      };
    } else if (upperType === "UPI") {
      update.upi = { address: upiId || "" };
    } else if (upperType === "UPAY") {
      update.upay = { address: rplId || "" };
    }

    const method = await PaymentMethod.findOneAndUpdate(
      { userId: idNum },
      { $set: update },
      { upsert: true, returnDocument: "after", select: "-_id -__v" },
    );

    res.json({ msg: "Updated", userId: idNum, paymentMethods: method });
  } catch (error) {
    logger.error(error, { where: "adminUpdateUserPayments", body: req.body });
    res.status(500).json({ msg: error.message });
  }
}

async function adminGetPaymentMethods(req, res) {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ status: "failed", msg: "userId is required" });
    }
    const idNum = Number(userId);
    if (Number.isNaN(idNum)) {
      return res.status(400).json({ status: "failed", msg: "Invalid userId" });
    }

    const method = await PaymentMethod.findOne({ userId: idNum }).select("-_id -__v").lean();

    res.json({ status: "success", data: method || null });
  } catch (error) {
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function adminUpdatePaymentMethod(req, res) {
  try {
    const { id } = req.params;
    const { upiId, accountNo, ifsc, bankName, rplId, holderName, isActive, isDefault } = req.body || {};

    const method = await PaymentMethod.findById(id);
    if (!method) {
      return res.status(404).json({ status: "failed", msg: "Payment method not found" });
    }

    if (holderName !== undefined) method.holderName = holderName;
    if (isActive !== undefined) method.isActive = isActive;
    if (isDefault !== undefined) method.isDefault = isDefault;

    if (upiId !== undefined) method.upi = { address: upiId };
    if (accountNo !== undefined || ifsc !== undefined || bankName !== undefined) {
      if (!method.bank) method.bank = {};
      if (accountNo !== undefined) method.bank.accountNo = accountNo;
      if (ifsc !== undefined) method.bank.ifsc = ifsc;
      if (bankName !== undefined) method.bank.bankName = bankName;
    }
    if (rplId !== undefined) method.upay = { address: rplId };

    await method.save();

    res.json({ status: "success", data: method });
  } catch (error) {
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function getDepositConfig(req, res) {
  try {
    await ensureDefaultDepositConfigs();
    const configs = await DepositConfig.find().sort({ sortOrder: 1 }).select("-_id").lean();
    res.json({ status: "success", data: configs });
  } catch (error) {
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function updateDepositConfig(req, res) {
  try {
    const { channel } = req.params;
    const { isActive, minAmount, maxAmount, exchangeRate, name, description, sortOrder } = req.body || {};
    const cfg = await DepositConfig.findOne({ channel: channel.toLowerCase() });
    if (!cfg) {
      return res.status(404).json({ status: "failed", msg: "Channel not found" });
    }
    if (isActive !== undefined) cfg.isActive = isActive;
    if (minAmount !== undefined) cfg.minAmount = minAmount;
    if (maxAmount !== undefined) cfg.maxAmount = maxAmount;
    if (exchangeRate !== undefined) cfg.exchangeRate = exchangeRate;
    if (name !== undefined) cfg.name = name;
    if (description !== undefined) cfg.description = description;
    if (sortOrder !== undefined) cfg.sortOrder = sortOrder;
    await cfg.save();
    const { _id, ...data } = cfg.toObject();
    res.json({ status: "success", data });
  } catch (error) {
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function getDepositBonusConfig(req, res) {
  try {
    const DepositBonusConfig = (await import("../models/depositBonusConfig.model.js")).default;
    await DepositBonusConfig.getDefaultConfigs();
    const configs = await DepositBonusConfig.find({}).sort({ depositCount: 1 }).select("-_id -__v").lean();
    res.json({ status: "success", configs });
  } catch (error) {
    logger.error(error, { where: "getDepositBonusConfig" });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function updateDepositBonusConfig(req, res) {
  try {
    const { depositCount, bonusRate, active } = req.body;

    if (!depositCount || ![1, 2, 3].includes(Number(depositCount))) {
      return res.status(400).json({ status: "failed", msg: "depositCount must be 1, 2, or 3" });
    }
    if (bonusRate === undefined) {
      return res.status(400).json({ status: "failed", msg: "bonusRate is required" });
    }

    const DepositBonusConfig = (await import("../models/depositBonusConfig.model.js")).default;
    const updated = await DepositBonusConfig.findOneAndUpdate(
      { depositCount: Number(depositCount) },
      {
        $set: {
          bonusRate: Number(bonusRate),
          ...(active !== undefined && { active }),
        },
      },
      { returnDocument: "after", upsert: true, projection: { _id: 0, __v: 0 } },
    );

    logger.info(`[updateDepositBonusConfig] Updated deposit ${depositCount}: bonusRate=${bonusRate}, active=${active}`);

    res.json({ status: "success", config: updated });
  } catch (error) {
    logger.error(error, { where: "updateDepositBonusConfig", body: req.body });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function getTurnoverConfig(req, res) {
  try {
    const TurnoverConfig = (await import("../models/turnoverConfig.model.js")).default;
    await TurnoverConfig.getDefaultConfig();
    const configs = await TurnoverConfig.find({}).sort({ type: 1 });
    res.json({ status: "success", configs });
  } catch (error) {
    logger.error(error, { where: "getTurnoverConfig" });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function updateTurnoverConfig(req, res) {
  try {
    const { type, multiplier, active, description } = req.body;

    if (!type || multiplier === undefined) {
      return res.status(400).json({ status: "failed", msg: "type and multiplier are required" });
    }

    const TurnoverConfig = (await import("../models/turnoverConfig.model.js")).default;
    const updated = await TurnoverConfig.findOneAndUpdate(
      { type },
      {
        $set: {
          ...(multiplier !== undefined && { multiplier }),
          ...(active !== undefined && { active }),
          ...(description !== undefined && { description }),
        },
      },
      { returnDocument: "after", upsert: true }
    );

    res.json({ status: "success", config: updated });
  } catch (error) {
    logger.error(error, { where: "updateTurnoverConfig", body: req.body });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function getUserTurnoverStatus(req, res) {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ status: "failed", msg: "userId is required" });
    }
    const { getTurnoverStatus } = await import("../services/turnover.service.js");
    const status = await getTurnoverStatus(Number(userId));
    res.json({ status: "success", ...status });
  } catch (error) {
    logger.error(error, { where: "getUserTurnoverStatus", query: req.query });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function clearUserTurnover(req, res) {
  try {
    const { userId, reason = "Admin cleared" } = req.body;
    if (!userId) {
      return res.status(400).json({ status: "failed", msg: "userId is required" });
    }
    const { clearAllTurnover } = await import("../services/turnover.service.js");
    const result = await clearAllTurnover(Number(userId), reason);
    res.json({ status: "success", ...result });
  } catch (error) {
    logger.error(error, { where: "clearUserTurnover", body: req.body });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function addUserTurnover(req, res) {
  try {
    const { userId, amount, type = "ADMIN_BONUS", sourceRef = null } = req.body;
    if (!userId || !amount) {
      return res.status(400).json({ status: "failed", msg: "userId and amount are required" });
    }
    const { addTurnoverRequirement } = await import("../services/turnover.service.js");
    const result = await addTurnoverRequirement(Number(userId), Number(amount), type, sourceRef);
    res.json({ status: "success", ...result });
  } catch (error) {
    logger.error(error, { where: "addUserTurnover", body: req.body });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function getAdminWithdrawalOrders(req, res) {
  const { orderId, userId, page = 1, limit = 50, status, dateFrom, dateTo } = req.query;
  try {
    const lm = Math.max(1, Math.min(100, Number(limit) || 50));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lm;

    if (orderId) {
      const order = await WithdrawalOrder.findOne({ orderId }).select("-_id -__v -bankDetails");
      if (!order) {
        return res.status(404).json({ status: "failed", msg: "Order not found" });
      }
      return res.json({ status: "success", items: [order] });
    }

    const query = {};
    if (userId) {
      const idNum = Number(userId);
      if (Number.isNaN(idNum)) {
        return res.status(400).json({ status: "failed", msg: "Invalid userId" });
      }
      query.userId = idNum;
    }
    if (status) query.status = status.toUpperCase();
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = parseISTDate(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    const [items, total] = await Promise.all([
      WithdrawalOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(lm).select("-_id -__v -bankDetails"),
      WithdrawalOrder.countDocuments(query),
    ]);

    if (items.length === 0) {
      return res.json({ status: "success", total: 0, page: pg, limit: lm, items: [] });
    }

    res.json({ status: "success", total, page: pg, limit: lm, items });
  } catch (error) {
    logger.error(error, { where: "getAdminWithdrawalOrders", orderId, userId, page, limit, status, dateFrom, dateTo });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function approveWithdrawalOrder(req, res) {
  try {
    const { orderId, chargeFrom } = req.body;
    if (!orderId) {
      return res.status(400).json({ status: "failed", msg: "orderId is required" });
    }
    if (!chargeFrom || !["user", "platform"].includes(chargeFrom)) {
      return res.status(400).json({ status: "failed", msg: "chargeFrom is required: 'user' or 'platform'" });
    }

    const orderCheck = await WithdrawalOrder.findOne({ orderId }).select("amount status");
    if (!orderCheck) {
      return res.status(404).json({ status: "failed", msg: "Withdrawal order not found" });
    }
    if (orderCheck.status !== "PENDING") {
      return res.status(409).json({ status: "failed", msg: `Cannot approve: order is in ${orderCheck.status} status`, currentStatus: orderCheck.status });
    }

    const chargePercentage = 0.035;
    const chargeFlat = 6;
    const charge = parseFloat((orderCheck.amount * chargePercentage + chargeFlat).toFixed(2));
    const actualCharge = chargeFrom === "user" ? charge : 0;
    const payoutAmount = chargeFrom === "user"
      ? parseFloat((orderCheck.amount - charge).toFixed(2))
      : orderCheck.amount;

    if (payoutAmount <= 0) {
      return res.status(400).json({ status: "failed", msg: `Payout amount (${payoutAmount}) must be greater than 0.`, amount: orderCheck.amount, charge, payoutAmount });
    }

    const withdrawalOrder = await WithdrawalOrder.findOneAndUpdate(
      { orderId, status: "PENDING" },
      { $set: { chargeFrom, charge: actualCharge } },
      { new: true },
    );
    if (!withdrawalOrder) {
      const existing = await WithdrawalOrder.findOne({ orderId }).select("status");
      return res.status(409).json({ status: "failed", msg: `Cannot approve: order is in ${existing ? existing.status : "unknown"} status`, currentStatus: existing ? existing.status : "unknown" });
    }

    const user = await userModel.findOne({ userId: withdrawalOrder.userId }).select("userId name email mobileNumber");
    if (!user) {
      await WithdrawalOrder.findOneAndUpdate({ orderId }, { $set: { chargeFrom: null, charge: 0 } });
      return res.status(404).json({ status: "failed", msg: "User not found" });
    }

    const channel = (withdrawalOrder.channelName || "SimplyPay").toLowerCase();

    let gwData;
    try {
      if (channel === "upay") {
        withdrawalOrder.channelName = "Upay";
        gwData = await createUpayPayoutOrderForWithdrawal(withdrawalOrder, payoutAmount);
      } else if (channel === "gspayusdt" || channel === "gspayinr") {
        withdrawalOrder.channelName = channel === "gspayusdt" ? "GSPayUSDT" : "GSPayINR";
        gwData = await createGspayPayoutOrderForWithdrawal(withdrawalOrder, payoutAmount);
      } else {
        withdrawalOrder.channelName = "SimplyPay";
        gwData = await createPayoutOrderForWithdrawal(withdrawalOrder, user, payoutAmount);
      }
    } catch (gwErr) {
      const gwMsg = gwErr.message || "Gateway error";
      await WithdrawalOrder.findOneAndUpdate({ orderId }, { $set: { gatewayResponse: gwMsg, chargeFrom: null, charge: 0 } });
      return res.status(502).json({ status: "failed", msg: gwMsg, orderId, gatewayError: gwMsg });
    }

    res.json({
      status: "success",
      msg: "Withdrawal approved and payout order created",
      orderId: withdrawalOrder.orderId,
      userId: withdrawalOrder.userId,
      amount: withdrawalOrder.amount,
      charge: withdrawalOrder.charge,
      payoutAmount,
      chargeFrom,
      gatewayOrderNo: gwData.orderCode || gwData.orderNo || "",
      gatewayResponse: withdrawalOrder.gatewayResponse || null,
      status: withdrawalOrder.status,
    });
  } catch (error) {
    logger.error(error, { where: "approveWithdrawalOrder", orderId: req.body && req.body.orderId });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function cancelWithdrawalOrder(req, res) {
  try {
    const { orderId, note } = req.body;
    if (!orderId) {
      return res.status(400).json({ status: "failed", msg: "orderId is required" });
    }

    const withdrawalOrder = await WithdrawalOrder.findOneAndUpdate(
      { orderId, status: { $in: ["PENDING", "AUDITING"] } },
      { $set: { status: "CANCELLED", note: note || "Cancelled by admin" } },
      { new: true },
    );
    if (!withdrawalOrder) {
      const existing = await WithdrawalOrder.findOne({ orderId }).select("status");
      if (!existing) return res.status(404).json({ status: "failed", msg: "Withdrawal order not found" });
      return res.status(409).json({ status: "failed", msg: `Cannot cancel: order is in ${existing.status} status`, currentStatus: existing.status });
    }

    const refundAmount = withdrawalOrder.amount;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const account = await accountModel.findOne({ user: withdrawalOrder.userId }).session(session);
      if (account) {
        account.balance = parseFloat((account.balance + refundAmount).toFixed(2));
        await account.save({ session });

        await transactionLedgerModel.create([{
          userId: withdrawalOrder.userId,
          type: "WITHDRAW_REFUND",
          amount: refundAmount,
          charge: withdrawalOrder.charge || 0,
          balanceAfter: account.balance,
          status: "SUCCESS",
          orderId: withdrawalOrder.orderId,
          remark: `Withdrawal CANCELLED by admin - amount refunded (${withdrawalOrder.amount})${note ? ` - ${note}` : ""}`,
        }], { session });
      }
      await session.commitTransaction();
    } catch (refundErr) {
      await session.abortTransaction();
      throw refundErr;
    } finally {
      session.endSession();
    }

    res.json({
      status: "success",
      msg: "Withdrawal cancelled and refunded",
      orderId: withdrawalOrder.orderId,
      userId: withdrawalOrder.userId,
      amount: withdrawalOrder.amount,
      charge: withdrawalOrder.charge || 0,
      refundAmount,
      note: withdrawalOrder.note,
    });
  } catch (error) {
    logger.error(error, { where: "cancelWithdrawalOrder", body: req.body });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function adminMoveGameToWallet(req, res) {
  try {
    const { userId, userIdTo, userIds, providerCode: rawProvider } = req.body;

    let userIdList = [];

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      userIdList = userIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id));
    } else if (userId && userIdTo) {
      const start = Number(userId);
      const end = Number(userIdTo);
      if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
        return res.status(400).json({ status: "failed", msg: "Invalid userId range" });
      }
      if (end - start + 1 > 100) {
        return res.status(400).json({ status: "failed", msg: "Maximum 100 users per request" });
      }
      for (let i = start; i <= end; i++) userIdList.push(i);
    } else if (userId) {
      const userIdNum = Number(userId);
      if (Number.isNaN(userIdNum)) return res.status(400).json({ status: "failed", msg: "Invalid userId" });
      userIdList = [userIdNum];
    } else {
      return res.status(400).json({ status: "failed", msg: "userId or userIds or userId+userIdTo is required" });
    }

    let providers = [];
    if (rawProvider && rawProvider.toUpperCase() !== "ALL") {
      providers = [rawProvider.toUpperCase()];
    } else {
      providers = ["PG", "JE", "JD", "TU", "IB"];
    }

    const password = buildPassword();
    const allResults = [];
    let totalUsersProcessed = 0;
    let totalAmountMoved = 0;

    for (const uid of userIdList) {
      const account = await accountModel.findOne({ user: uid });
      if (!account) {
        allResults.push({ userId: uid, success: false, error: "Account not found", providers: [], moved: 0 });
        continue;
      }

      const username = buildUsername(uid);
      let userMoved = 0;
      let userResults = [];
      let currentBalance = Number(account.balance || 0);

      for (const providerCode of providers) {
        if (!account.gameMemberCreated) {
          try {
            await ensureProviderMember(username, providerCode);
          } catch (err) {
            userResults.push({ provider: providerCode, amount: 0, success: false, error: "Member creation failed: " + (err.message || err.code) });
            continue;
          }
        }

        let gameBalance;
        try {
          gameBalance = await getGameBalance(username, password, providerCode);
        } catch (err) {
          console.error(`[adminMoveGameToWallet] getBalance failed for ${providerCode}:`, err.message);
          userResults.push({ provider: providerCode, amount: 0, success: true, message: "Balance check skipped: " + (err.message || "Provider unavailable") });
          continue;
        }

        if (gameBalance <= 0) {
          userResults.push({ provider: providerCode, amount: 0, success: true, message: "No balance" });
          continue;
        }

        const referenceId = buildReferenceId("GMOUT", uid);
        let transferResult;
        try {
          transferResult = await makeTransfer({ username, password, referenceId, type: 1, amount: gameBalance, providerCode });
        } catch (e) {
          userResults.push({ provider: providerCode, amount: 0, success: false, error: "Transfer failed" });
          continue;
        }

        if (transferResult?.errCode !== "0") {
          userResults.push({ provider: providerCode, amount: 0, success: false, error: transferResult?.errMsg || "Transfer failed" });
          continue;
        }

        userMoved += gameBalance;
        currentBalance += gameBalance;

        await transactionLedgerModel.create({
          userId: uid,
          type: "gameOut",
          amount: gameBalance,
          balanceAfter: currentBalance,
          status: "SUCCESS",
          orderId: referenceId,
        });

        userResults.push({ provider: providerCode, amount: gameBalance, success: true, referenceId });
      }

      if (userMoved > 0 || !account.gameMemberCreated) {
        account.balance = currentBalance;
        if (!account.gameMemberCreated) account.gameMemberCreated = true;
        await account.save();
      }

      totalUsersProcessed++;
      totalAmountMoved += userMoved;

      allResults.push({ userId: uid, success: true, providers: userResults, moved: userMoved, walletBalance: currentBalance });
    }

    res.json({ status: "success", msg: "Balance moved from all games to wallet", totalUsersProcessed, totalAmountMoved, users: allResults });
  } catch (error) {
    logger.error(error, { where: "adminMoveGameToWallet", body: req.body });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function getWithdrawalConfig(req, res) {
  try {
    const config = await WithdrawalConfig.getConfig();
    res.json({ status: "success", data: config });
  } catch (error) {
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function updateWithdrawalConfig(req, res) {
  try {
    const { perDayLimit, limits } = req.body;
    const config = await WithdrawalConfig.getConfig();
    if (perDayLimit !== undefined) config.perDayLimit = perDayLimit;
    if (limits) {
      if (limits.BANK) {
        if (limits.BANK.min !== undefined) config.limits.BANK.min = limits.BANK.min;
        if (limits.BANK.max !== undefined) config.limits.BANK.max = limits.BANK.max;
      }
      if (limits.UPI) {
        if (limits.UPI.min !== undefined) config.limits.UPI.min = limits.UPI.min;
        if (limits.UPI.max !== undefined) config.limits.UPI.max = limits.UPI.max;
      }
      if (limits.UPAY) {
        if (limits.UPAY.min !== undefined) config.limits.UPAY.min = limits.UPAY.min;
        if (limits.UPAY.max !== undefined) config.limits.UPAY.max = limits.UPAY.max;
      }
    }
    await config.save();
    res.json({ status: "success", data: config });
  } catch (error) {
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function getUserTeamStats(req, res) {
  try {
    const { userId, tier, dateFrom, dateTo } = req.query;
    const idNum = Number(userId);
    if (!userId || Number.isNaN(idNum)) {
      return res.status(400).json({ msg: "Invalid or missing userId" });
    }

    const user = await userModel.findOne({ userId: idNum }).select("userId").lean();
    if (!user) return res.status(404).json({ msg: "User not found" });

    const teamMembers = await userModel.find({ path: idNum }).select("userId path").lean();

    const l1 = [], l2 = [], l3 = [];
    for (const m of teamMembers) {
      const p = m.path;
      const len = p.length;
      if (len >= 1 && p[len - 1] === idNum) l1.push(m.userId);
      else if (len >= 2 && p[len - 2] === idNum) l2.push(m.userId);
      else if (len >= 3 && p[len - 3] === idNum) l3.push(m.userId);
    }

    const tiers = { l1, l2, l3 };
    const tierKeys = ["l1", "l2", "l3"];

    const createdAtFilter = {};
    if (dateFrom || dateTo) {
      createdAtFilter.createdAt = {};
      if (dateFrom) createdAtFilter.createdAt.$gte = parseISTDate(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        createdAtFilter.createdAt.$lte = end;
      }
    }
    const hasDateFilter = Object.keys(createdAtFilter).length > 0;

    const [depositResults, withdrawalResults, firstDepositResults] = await Promise.all([
      Promise.all(tierKeys.map((t) =>
        tiers[t].length > 0
          ? DepositOrder.aggregate([
              { $match: { userId: { $in: tiers[t] }, ...createdAtFilter } },
              { $group: { _id: "$status", total: { $sum: "$amount" }, count: { $sum: 1 } } },
            ])
          : Promise.resolve([]),
      )),
      Promise.all(tierKeys.map((t) =>
        tiers[t].length > 0
          ? WithdrawalOrder.aggregate([
              { $match: { userId: { $in: tiers[t] }, ...createdAtFilter } },
              { $group: { _id: "$status", total: { $sum: "$amount" }, count: { $sum: 1 } } },
            ])
          : Promise.resolve([]),
      )),
      Promise.all(tierKeys.map((t) =>
        tiers[t].length > 0
          ? DepositOrder.aggregate([
              { $match: { userId: { $in: tiers[t] }, status: "SUCCESS" } },
              { $sort: { createdAt: 1 } },
              { $group: { _id: "$userId", amount: { $first: "$amount" }, date: { $first: "$createdAt" } } },
              ...(hasDateFilter ? [{ $match: { date: { $gte: createdAtFilter.createdAt.$gte, $lte: createdAtFilter.createdAt.$lte } } }] : []),
              { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: "$amount" } } },
            ])
          : Promise.resolve([]),
      )),
    ]);

    const deposits = {};
    const withdrawals = {};
    const firstDeposit = {};
    for (let i = 0; i < 3; i++) {
      const t = tierKeys[i];

      const d = { totalAmount: 0, totalCount: 0 };
      for (const s of depositResults[i]) {
        d[s._id] = { amount: s.total, count: s.count };
        d.totalAmount += s.total;
        d.totalCount += s.count;
      }
      deposits[t] = d;

      const w = { totalAmount: 0, totalCount: 0 };
      for (const s of withdrawalResults[i]) {
        w[s._id] = { amount: s.total, count: s.count };
        w.totalAmount += s.total;
        w.totalCount += s.count;
      }
      withdrawals[t] = w;

      firstDeposit[t] = firstDepositResults[i][0]
        ? { count: firstDepositResults[i][0].count, totalAmount: firstDepositResults[i][0].totalAmount }
        : { count: 0, totalAmount: 0 };
    }

    res.json({
      status: "success",
      userId: idNum,
      team: { l1: l1.length, l2: l2.length, l3: l3.length, total: l1.length + l2.length + l3.length },
      firstDeposit,
      deposits,
      withdrawals,
    });
  } catch (error) {
    logger.error(error, { where: "getUserTeamStats", query: req.query });
    res.status(500).json({ msg: error.message });
  }
}

async function getUserTeamMembers(req, res) {
  try {
    const { userId, tier, search, page = 1, limit = 50, dateFrom, dateTo } = req.query;
    const idNum = Number(userId);
    if (!userId || Number.isNaN(idNum)) {
      return res.status(400).json({ msg: "Invalid or missing userId" });
    }

    const user = await userModel.findOne({ userId: idNum }).select("userId").lean();
    if (!user) return res.status(404).json({ msg: "User not found" });

    const teamMembers = await userModel.find({ path: idNum }).select("userId path createdAt").lean();

    const l1 = [], l2 = [], l3 = [];
    for (const m of teamMembers) {
      const p = m.path;
      const len = p.length;
      if (len >= 1 && p[len - 1] === idNum) l1.push(m);
      else if (len >= 2 && p[len - 2] === idNum) l2.push(m);
      else if (len >= 3 && p[len - 3] === idNum) l3.push(m);
    }

    let selected;
    if (tier === "L1") selected = l1;
    else if (tier === "L2") selected = l2;
    else if (tier === "L3") selected = l3;
    else selected = [...l1, ...l2, ...l3];

    if (search) {
      const searchNum = Number(search);
      if (!Number.isNaN(searchNum)) {
        selected = selected.filter((m) => m.userId === searchNum);
      }
    }

    if (dateFrom || dateTo) {
      const from = dateFrom ? parseISTDate(dateFrom) : new Date(0);
      const to = dateTo ? (() => { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); return d; })() : new Date(864e13);
      selected = selected.filter((m) => m.createdAt >= from && m.createdAt <= to);
    }

    const pg = Math.max(1, Number(page) || 1);
    const lm = Math.max(1, Math.min(100, Number(limit) || 50));
    const total = selected.length;
    const skip = (pg - 1) * lm;
    const pageItems = selected.slice(skip, skip + lm);
    const pageIds = pageItems.map((m) => m.userId);

    const levelMap = {};
    for (const m of l1) levelMap[m.userId] = "L1";
    for (const m of l2) levelMap[m.userId] = "L2";
    for (const m of l3) levelMap[m.userId] = "L3";

    if (pageIds.length === 0) {
      return res.json({ status: "success", userId: idNum, total, page: pg, limit: lm, items: [] });
    }

    const [depositData, withdrawalData, accounts, paymentMethods, ipData] = await Promise.all([
      DepositOrder.aggregate([
        { $match: { userId: { $in: pageIds }, status: "SUCCESS" } },
        { $group: { _id: "$userId", total: { $sum: "$amount" } } },
      ]),
      WithdrawalOrder.aggregate([
        { $match: { userId: { $in: pageIds }, status: "SUCCESS" } },
        { $group: { _id: "$userId", total: { $sum: "$amount" } } },
      ]),
      accountModel.find({ user: { $in: pageIds } }).select("user balance").lean(),
      PaymentMethod.find({ userId: { $in: pageIds } }).select("userId").lean(),
      DeviceLog.aggregate([
        { $match: { userId: { $in: pageIds }, ip: { $ne: "" } } },
        { $group: { _id: "$ip", userIds: { $addToSet: "$userId" } } },
        { $match: { $expr: { $gt: [{ $size: "$userIds" }, 1] } } },
      ]),
    ]);

    const depositMap = {};
    for (const d of depositData) depositMap[d._id] = d.total;
    const withdrawalMap = {};
    for (const w of withdrawalData) withdrawalMap[w._id] = w.total;
    const balanceMap = {};
    for (const a of accounts) balanceMap[a.user] = a.balance;
    const paymentSet = new Set(paymentMethods.map((p) => p.userId));

    const sharedIpUserIds = new Set();
    for (const ip of ipData) {
      for (const uid of ip.userIds) {
        sharedIpUserIds.add(uid);
      }
    }

    const items = pageItems.map((m) => ({
      userId: m.userId,
      registeredAt: m.createdAt,
      level: levelMap[m.userId],
      totalDeposit: depositMap[m.userId] || 0,
      totalWithdrawal: withdrawalMap[m.userId] || 0,
      balance: balanceMap[m.userId] ?? 0,
      bindBank: paymentSet.has(m.userId),
      multipleIp: sharedIpUserIds.has(m.userId),
    }));

    res.json({ status: "success", userId: idNum, total, page: pg, limit: lm, items });
  } catch (error) {
    logger.error(error, { where: "getUserTeamMembers", query: req.query });
    res.status(500).json({ msg: error.message });
  }
}

async function searchUserFull(req, res) {
  const { userId } = req.query;
  const idNum = Number(userId);
  if (!userId || Number.isNaN(idNum)) {
    return res.status(400).json({ msg: "Invalid or missing userId" });
  }
  try {
    const [user, accountDoc, transactions, deposits, withdrawals] = await Promise.all([
      userModel.findOne({ userId: idNum }).select("-password -__v"),
      accountModel.findOne({ user: idNum }).select("-__v -bindAccount").lean(),
      transactionLedgerModel.find({ userId: idNum }).sort({ createdAt: -1 }).limit(25).select("-_id -__v"),
      DepositOrder.find({ userId: idNum }).sort({ createdAt: -1 }).limit(25).select("-_id -__v"),
      WithdrawalOrder.find({ userId: idNum }).sort({ createdAt: -1 }).limit(25).select("-_id -__v"),
    ]);
    if (!user) return res.status(404).json({ msg: "User not found" });
    const depositTotal = await DepositOrder.aggregate([
      { $match: { userId: idNum, status: "SUCCESS" } },
      { $group: { _id: null, total: { $sum: "$receivedAmount" }, count: { $sum: 1 } } },
    ]);
    const withdrawalTotal = await WithdrawalOrder.aggregate([
      { $match: { userId: idNum, status: "SUCCESS" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    res.json({
      user,
      account: accountDoc,
      stats: {
        totalDeposits: depositTotal[0]?.total || 0,
        depositCount: depositTotal[0]?.count || 0,
        totalWithdrawals: withdrawalTotal[0]?.total || 0,
        withdrawalCount: withdrawalTotal[0]?.count || 0,
      },
      recentTransactions: transactions,
      recentDeposits: deposits,
      recentWithdrawals: withdrawals,
    });
  } catch (error) {
    logger.error(error, { where: "searchUserFull", userId });
    res.status(500).json({ msg: error.message });
  }
}

async function getUserBetDailyStats(req, res) {
  try {
    const { userId, dateFrom, dateTo, page = 1, limit = 31 } = req.query;
    const idNum = Number(userId);
    if (!userId || Number.isNaN(idNum)) {
      return res.status(400).json({ msg: "Invalid or missing userId" });
    }

    const p = Math.max(1, Number(page));
    const l = Math.max(1, Math.min(365, Number(limit)));

    const todayStr = toISTDate(new Date());
    const fromDate = dateFrom ? parseISTDate(dateFrom) : parseISTDate(todayStr);
    const toDate = dateTo ? parseISTDateEnd(dateTo) : parseISTDateEnd(todayStr);
    const dateFilter = { $gte: fromDate, $lte: toDate };

    const [wingoDaily, providerDaily] = await Promise.all([
      WingoBet.aggregate([
        { $match: { userId: String(idNum), createdAt: dateFilter } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
            betCount: { $sum: 1 },
            totalBets: { $sum: "$betAmount" },
            totalPayout: { $sum: { $ifNull: ["$result.profitAmount", 0] } },
            wonCount: { $sum: { $cond: [{ $eq: ["$status", "won"] }, 1, 0] } },
            lostCount: { $sum: { $cond: [{ $eq: ["$status", "lost"] }, 1, 0] } },
          },
        },
        { $sort: { _id: -1 } },
      ]),
      BetRecord.aggregate([
        { $match: { member: `u${idNum}`, settleTime: dateFilter } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$settleTime", timezone: "Asia/Kolkata" } },
            betCount: { $sum: 1 },
            totalBets: { $sum: "$bet" },
            totalPayout: { $sum: "$payout" },
            netPL: { $sum: { $subtract: ["$bet", "$payout"] } },
          },
        },
        { $sort: { _id: -1 } },
      ]),
    ]);

    const emptyWingo = { betCount: 0, totalBets: 0, totalPayout: 0, wonCount: 0, lostCount: 0 };
    const emptyProvider = { betCount: 0, totalBets: 0, totalPayout: 0, netPL: 0 };

    const dateMap = {};
    for (const d of wingoDaily) {
      dateMap[d._id] = { date: d._id, wingo: { betCount: d.betCount, totalBets: d.totalBets, totalPayout: d.totalPayout, wonCount: d.wonCount, lostCount: d.lostCount }, provider: { ...emptyProvider } };
    }
    for (const d of providerDaily) {
      if (dateMap[d._id]) {
        dateMap[d._id].provider = { betCount: d.betCount, totalBets: d.totalBets, totalPayout: d.totalPayout, netPL: d.netPL };
      } else {
        dateMap[d._id] = { date: d._id, wingo: { ...emptyWingo }, provider: { betCount: d.betCount, totalBets: d.totalBets, totalPayout: d.totalPayout, netPL: d.netPL } };
      }
    }

    const allDates = Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date));
    const total = allDates.length;
    const skip = (p - 1) * l;
    const items = allDates.slice(skip, skip + l);

    res.json({ status: "success", userId: idNum, total, page: p, limit: l, data: items });
  } catch (error) {
    logger.error(error, { where: "getUserBetDailyStats", query: req.query });
    res.status(500).json({ msg: error.message });
  }
}

export default {
  createAdminTransaction,
  getAdminDashboard,
  getUserLedgerByAdmin,
  searchUserOrAccount,
  getUsersByIp,
  getAdminDepositOrders,
  getUserTransactionsPaginated,
  approveDepositOrder,
  getAgencyLevelConfigs,
  updateAgencyLevelConfig,
  updateUserStatusAdmin,
  getServerLogs,
  getVipConfig,
  updateVipConfig,
  adminUpdateUserPayments,
  adminGetPaymentMethods,
  adminUpdatePaymentMethod,
  getTurnoverConfig,
  updateTurnoverConfig,
  getUserTurnoverStatus,
  clearUserTurnover,
  addUserTurnover,
  getAdminWithdrawalOrders,
  adminMoveGameToWallet,
  approveWithdrawalOrder,
  cancelWithdrawalOrder,
  getWithdrawalConfig,
  updateWithdrawalConfig,
  searchUserFull,
  getUserTeamStats,
  getUserTeamMembers,
  getDepositConfig,
  updateDepositConfig,
  getDepositBonusConfig,
  updateDepositBonusConfig,
  getUserBetDailyStats,
};
