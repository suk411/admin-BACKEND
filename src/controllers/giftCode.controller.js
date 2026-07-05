import mongoose from "mongoose";
import GiftCode from "../models/giftCode.model.js";
import GiftCodeRedemption from "../models/giftCodeRedemption.model.js";
import accountModel from "../models/account.model.js";
import transactionLedgerModel from "../models/transactionLedger.model.js";
import DepositOrder from "../models/depositOrder.model.js";
import { addTurnoverRequirement } from "../services/turnover.service.js";
import logger from "../utils/logger.js";
import { parseISTDate } from "../utils/time.js";

async function createGiftCode(req, res) {
  try {
    const {
      code: providedCode,
      rewardAmount,
      turnoverMultiplier = 1,
      maxRedemptions,
      expiryDate,
      minDepositToday = 0,
      isActive = true,
      description = "",
      codeLength = 12,
    } = req.body;

    if (!rewardAmount || rewardAmount <= 0) {
      return res.status(400).json({ status: "failed", msg: "Invalid rewardAmount" });
    }
    if (!maxRedemptions || maxRedemptions < 1) {
      return res.status(400).json({ status: "failed", msg: "Invalid maxRedemptions" });
    }
    if (!expiryDate) {
      return res.status(400).json({ status: "failed", msg: "expiryDate is required" });
    }

    const expiry = parseISTDate(expiryDate);
    if (isNaN(expiry.getTime()) || expiry <= new Date()) {
      return res.status(400).json({ status: "failed", msg: "expiryDate must be a valid future date" });
    }

    let code;
    if (providedCode && providedCode.trim()) {
      code = providedCode.trim().toUpperCase();
      const existing = await GiftCode.findOne({ code });
      if (existing) {
        return res.status(400).json({ status: "failed", msg: "Code already exists" });
      }
    } else {
      code = await GiftCode.generateUniqueCode(codeLength || 12);
    }

    const giftCode = await GiftCode.create({
      code,
      rewardAmount: Number(rewardAmount),
      turnoverMultiplier: Number(turnoverMultiplier),
      maxRedemptions: Number(maxRedemptions),
      expiryDate: expiry,
      minDepositToday: Number(minDepositToday),
      isActive,
      description,
    });

    logger.info(`[GiftCode] Created code: ${code} by admin ${req.user.userId}`);

    res.status(201).json({
      status: "success",
      msg: "Gift code created",
      giftCode,
    });
  } catch (error) {
    logger.error(error, { where: "createGiftCode", body: req.body });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function updateGiftCode(req, res) {
  try {
    const { code } = req.params;
    const {
      rewardAmount,
      turnoverMultiplier,
      maxRedemptions,
      expiryDate,
      minDepositToday,
      isActive,
      description,
    } = req.body;

    const giftCode = await GiftCode.findOne({ code: code.toUpperCase() });
    if (!giftCode) {
      return res.status(404).json({ status: "failed", msg: "Gift code not found" });
    }

    if (rewardAmount !== undefined) giftCode.rewardAmount = Number(rewardAmount);
    if (turnoverMultiplier !== undefined) giftCode.turnoverMultiplier = Number(turnoverMultiplier);
    if (maxRedemptions !== undefined) {
      const newMax = Number(maxRedemptions);
      if (newMax < giftCode.usedCount) {
        return res.status(400).json({
          status: "failed",
          msg: `maxRedemptions cannot be less than already used count (${giftCode.usedCount})`,
        });
      }
      giftCode.maxRedemptions = newMax;
    }
    if (expiryDate !== undefined) {
      const expiry = parseISTDate(expiryDate);
      if (isNaN(expiry.getTime())) {
        return res.status(400).json({ status: "failed", msg: "Invalid expiryDate" });
      }
      giftCode.expiryDate = expiry;
    }
    if (minDepositToday !== undefined) giftCode.minDepositToday = Number(minDepositToday);
    if (isActive !== undefined) giftCode.isActive = isActive === true || isActive === "true";
    if (description !== undefined) giftCode.description = String(description);

    await giftCode.save();

    logger.info(`[GiftCode] Updated code: ${code} by admin ${req.user.userId}`);

    res.json({
      status: "success",
      msg: "Gift code updated",
      giftCode,
    });
  } catch (error) {
    logger.error(error, { where: "updateGiftCode", params: req.params, body: req.body });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function toggleGiftCode(req, res) {
  try {
    const { code } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ status: "failed", msg: "isActive is required" });
    }

    const giftCode = await GiftCode.findOne({ code: code.toUpperCase() });
    if (!giftCode) {
      return res.status(404).json({ status: "failed", msg: "Gift code not found" });
    }

    giftCode.isActive = isActive === true || isActive === "true";
    await giftCode.save();

    logger.info(`[GiftCode] ${giftCode.isActive ? "Enabled" : "Disabled"} code: ${code} by admin ${req.user.userId}`);

    res.json({
      status: "success",
      msg: `Gift code ${isActive ? "enabled" : "disabled"}`,
      giftCode,
    });
  } catch (error) {
    logger.error(error, { where: "toggleGiftCode", params: req.params, body: req.body });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function getGiftCode(req, res) {
  try {
    const { code } = req.params;

    const giftCode = await GiftCode.findOne({ code: code.toUpperCase() }).select("-__v");
    if (!giftCode) {
      return res.status(404).json({ status: "failed", msg: "Gift code not found" });
    }

    res.json({
      status: "success",
      giftCode,
    });
  } catch (error) {
    logger.error(error, { where: "getGiftCode", params: req.params });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function listGiftCodes(req, res) {
  try {
    const { page = 1, limit = 25, isActive, search } = req.query;
    const lm = Math.max(1, Math.min(100, Number(limit) || 25));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lm;

    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }
    if (search) {
      query.code = { $regex: search.toUpperCase(), $options: "i" };
    }

    const [items, total] = await Promise.all([
      GiftCode.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lm)
        .select("-__v"),
      GiftCode.countDocuments(query),
    ]);

    res.json({
      status: "success",
      total,
      page: pg,
      limit: lm,
      items,
    });
  } catch (error) {
    logger.error(error, { where: "listGiftCodes", query: req.query });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function getGiftCodeRedemptions(req, res) {
  try {
    const { code } = req.params;
    const { page = 1, limit = 25 } = req.query;
    const lm = Math.max(1, Math.min(100, Number(limit) || 25));
    const pg = Math.max(1, Number(page) || 1);
    const skip = (pg - 1) * lm;

    const giftCode = await GiftCode.findOne({ code: code.toUpperCase() });
    if (!giftCode) {
      return res.status(404).json({ status: "failed", msg: "Gift code not found" });
    }

    const [items, total] = await Promise.all([
      GiftCodeRedemption.find({ code: code.toUpperCase() })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lm)
        .select("-__v"),
      GiftCodeRedemption.countDocuments({ code: code.toUpperCase() }),
    ]);

    res.json({
      status: "success",
      code: giftCode.code,
      usedCount: giftCode.usedCount,
      maxRedemptions: giftCode.maxRedemptions,
      total,
      page: pg,
      limit: lm,
      items,
    });
  } catch (error) {
    logger.error(error, { where: "getGiftCodeRedemptions", params: req.params, query: req.query });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

async function deleteGiftCode(req, res) {
  try {
    const { code } = req.params;

    const giftCode = await GiftCode.findOneAndDelete({ code: code.toUpperCase() });
    if (!giftCode) {
      return res.status(404).json({ status: "failed", msg: "Gift code not found" });
    }

    await GiftCodeRedemption.deleteMany({ code: code.toUpperCase() });

    logger.info(`[GiftCode] Deleted code: ${code} by admin ${req.user.userId}`);

    res.json({
      status: "success",
      msg: "Gift code deleted",
      code: code.toUpperCase(),
    });
  } catch (error) {
    logger.error(error, { where: "deleteGiftCode", params: req.params });
    res.status(500).json({ status: "failed", msg: error.message });
  }
}

export default {
  createGiftCode,
  updateGiftCode,
  toggleGiftCode,
  getGiftCode,
  listGiftCodes,
  getGiftCodeRedemptions,
  deleteGiftCode,
};
