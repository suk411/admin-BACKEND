import WingoBet from "../models/wingoBet.model.js";
import userModel from "../models/user.model.js";
import WingoIssue from "../models/WingoIssue.js";
import { getResultMode, setResultMode } from "../services/resultMode.service.js";
import { getCurrentIssueNumber, getRoundData } from "../services/roundService.js";
import logger from "../utils/logger.js";
import { extractMode } from "../config/gameModes.js";

async function setMode(req, res) {
  try {
    const { mode: resultMode } = req.body;
    const gameMode = extractMode(req);
    if (!resultMode || !["RANDOM", "MAX_PROFIT", "MAX_LOSS"].includes(resultMode)) {
      return res.status(400).json({ success: false, msg: "Invalid mode. Must be RANDOM, MAX_PROFIT, or MAX_LOSS" });
    }
    const currentIssue = getCurrentIssueNumber(gameMode);
    await setResultMode(resultMode, gameMode);
    const nextSeq = parseInt(currentIssue.slice(-5), 10) + 1;
    const applyIssue = currentIssue.slice(0, -5) + String(nextSeq).padStart(5, "0");
    logger.info(`[WingoAdmin] Result mode changed to ${resultMode} for ${gameMode}, apply from issue ${applyIssue}`);
    res.json({ success: true, currentIssue, applyIssue });
  } catch (error) {
    logger.error(`[WingoAdmin] setMode error: ${error.message}`);
    res.status(500).json({ success: false, msg: "Failed to set result mode" });
  }
}

async function getMode(req, res) {
  try {
    const gameMode = extractMode(req);
    const mode = await getResultMode(gameMode);
    res.json({ success: true, mode });
  } catch (error) {
    logger.error(`[WingoAdmin] getMode error: ${error.message}`);
    res.status(500).json({ success: false, msg: "Failed to get result mode" });
  }
}

async function getAdminCurrentRound(req, res) {
  try {
    const mode = extractMode(req);
    const roundData = getRoundData(mode);
    const currentIssue = roundData.current.issueNumber;

    let issue = await WingoIssue.findOne({ issueNumber: currentIssue }).lean();

    if (!issue) {
      const resultMode = await getResultMode(mode);
      issue = {
        issueNumber: currentIssue,
        startTime: roundData.current.startTime,
        endTime: roundData.current.endTime,
        gameMode: mode,
        result: { number: null, color: null, size: null },
        resultMode,
        status: "open",
      };
    }

    const bets = await WingoBet.find({ issueNumber: currentIssue }).lean();

    const validTypes = ["red", "green", "violet", "big", "small", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const breakdown = {};
    for (const t of validTypes) breakdown[t] = 0;

    let totalBetAmount = 0;
    for (const bet of bets) {
      totalBetAmount += bet.betAmount;
      if (breakdown[bet.selectType] !== undefined) {
        breakdown[bet.selectType] += bet.betAmount;
      }
    }

    const uniqueUsers = [...new Set(bets.map(b => b.userId))].length;

    res.json({
      success: true,
      round: issue,
      stats: {
        totalBets: bets.length,
        totalBetAmount,
        uniqueUsers,
        breakdown,
      },
    });
  } catch (error) {
    logger.error(`[WingoAdmin] getAdminCurrentRound error: ${error.message}`);
    res.status(500).json({ success: false, msg: "Failed to get current round" });
  }
}

async function getCurrentRoundBets(req, res) {
  try {
    const mode = extractMode(req);
    const currentIssue = getCurrentIssueNumber(mode);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      WingoBet.find({ issueNumber: currentIssue }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      WingoBet.countDocuments({ issueNumber: currentIssue }),
    ]);

    const userIds = [...new Set(items.map(i => Number(i.userId)))];
    const users = await userModel.find({ userId: { $in: userIds } }).lean();
    const userMap = {};
    for (const u of users) userMap[u.userId] = u.mobile;

    res.json({
      success: true,
      page, limit, total,
      issueNumber: currentIssue,
      items: items.map(i => ({
        _id: i._id,
        userId: i.userId,
        mobile: userMap[Number(i.userId)] || null,
        orderNumber: i.orderNumber,
        betAmount: i.betAmount,
        fee: i.fee,
        selectType: i.selectType,
        status: i.status,
        result: i.result,
        createdAt: i.createdAt,
      })),
    });
  } catch (error) {
    logger.error(`[WingoAdmin] getCurrentRoundBets error: ${error.message}`);
    res.status(500).json({ success: false, msg: "Failed to get current round bets" });
  }
}

async function getRoundStats(req, res) {
  try {
    const { issueNumber } = req.params;
    const issue = await WingoIssue.findOne({ issueNumber }).lean();
    if (!issue) {
      return res.status(404).json({ success: false, msg: "Issue not found" });
    }

    const bets = await WingoBet.find({ issueNumber }).lean();

    const validTypes = ["red", "green", "violet", "big", "small", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const breakdown = {};
    for (const t of validTypes) breakdown[t] = { count: 0, amount: 0 };

    let totalBetAmount = 0, totalPayout = 0, wonCount = 0, lostCount = 0;
    for (const bet of bets) {
      totalBetAmount += bet.betAmount;
      totalPayout += bet.result?.profitAmount || 0;
      if (bet.status === "won") wonCount++;
      else if (bet.status === "lost") lostCount++;
      if (breakdown[bet.selectType]) {
        breakdown[bet.selectType].count++;
        breakdown[bet.selectType].amount += bet.betAmount;
      }
    }

    const uniqueUsers = [...new Set(bets.map(b => b.userId))].length;

    res.json({
      success: true,
      issue,
      stats: {
        totalBets: bets.length,
        totalBetAmount,
        totalPayout,
        profitLoss: totalBetAmount - totalPayout,
        wonCount,
        lostCount,
        uniqueUsers,
        breakdown,
      },
    });
  } catch (error) {
    logger.error(`[WingoAdmin] getRoundStats error: ${error.message}`);
    res.status(500).json({ success: false, msg: "Failed to get round stats" });
  }
}

async function getRounds(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const mode = extractMode(req);
    const filter = { status: "settled", gameMode: mode };
    const [issues, total] = await Promise.all([
      WingoIssue.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      WingoIssue.countDocuments(filter),
    ]);

    const issueNumbers = issues.map(i => i.issueNumber);
    const betAggs = await WingoBet.aggregate([
      { $match: { issueNumber: { $in: issueNumbers } } },
      {
        $group: {
          _id: "$issueNumber",
          totalBets: { $sum: 1 },
          totalBetAmount: { $sum: "$betAmount" },
          totalPayout: { $sum: "$result.profitAmount" },
          wonCount: { $sum: { $cond: [{ $eq: ["$status", "won"] }, 1, 0] } },
          lostCount: { $sum: { $cond: [{ $eq: ["$status", "lost"] }, 1, 0] } },
        },
      },
    ]);

    const betMap = {};
    for (const agg of betAggs) betMap[agg._id] = agg;

    const items = issues.map(i => ({
      issueNumber: i.issueNumber,
      result: i.result,
      resultMode: i.resultMode,
      status: i.status,
      startTime: i.startTime,
      endTime: i.endTime,
      createdAt: i.createdAt,
      stats: betMap[i.issueNumber] || { totalBets: 0, totalBetAmount: 0, totalPayout: 0, wonCount: 0, lostCount: 0 },
    }));

    res.json({ success: true, page, limit, total, items });
  } catch (error) {
    logger.error(`[WingoAdmin] getRounds error: ${error.message}`);
    res.status(500).json({ success: false, msg: "Failed to get rounds" });
  }
}

export { setMode, getMode, getAdminCurrentRound, getCurrentRoundBets, getRoundStats, getRounds };
