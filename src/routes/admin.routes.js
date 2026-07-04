import express from "express";
import adminController from "../controllers/admin.controller.js";
import giftCodeController from "../controllers/giftCode.controller.js";
import { setMode, getMode, getAdminCurrentRound, getCurrentRoundBets, getRoundStats, getRounds } from "../controllers/wingoAdmin.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// Dashboard
router.get("/dashboard", adminController.getAdminDashboard);

// User management
router.get("/user", adminController.searchUserOrAccount);
router.patch("/user", adminController.updateUserStatusAdmin);
router.get("/users-by-ip", adminController.getUsersByIp);
router.get("/user/full", adminController.searchUserFull);

// User payments
router.put("/user/payments", adminController.adminUpdateUserPayments);
router.get("/user/payment-methods", adminController.adminGetPaymentMethods);
router.put("/user/payment-methods/:id", adminController.adminUpdatePaymentMethod);

// Deposit orders
router.get("/deposits", adminController.getAdminDepositOrders);
router.post("/deposits/approve", adminController.approveDepositOrder);

// Withdrawal orders
router.get("/withdrawals", adminController.getAdminWithdrawalOrders);
router.post("/withdrawals/approve", adminController.approveWithdrawalOrder);
router.post("/withdrawals/cancel", adminController.cancelWithdrawalOrder);

// Transactions
router.get("/transactions", adminController.getUserTransactionsPaginated);

// Config: VIP
router.get("/vip-config", adminController.getVipConfig);
router.put("/vip-config", adminController.updateVipConfig);

// Config: Deposit channels
router.get("/deposit-config", adminController.getDepositConfig);
router.put("/deposit-config/:channel", adminController.updateDepositConfig);

// Config: Deposit bonus
router.get("/deposit-bonus-config", adminController.getDepositBonusConfig);
router.put("/deposit-bonus-config", adminController.updateDepositBonusConfig);

// Config: Withdrawal
router.get("/withdrawal-config", adminController.getWithdrawalConfig);
router.put("/withdrawal-config", adminController.updateWithdrawalConfig);

// Config: Turnover
router.get("/turnover-config", adminController.getTurnoverConfig);
router.put("/turnover-config", adminController.updateTurnoverConfig);
router.get("/turnover-status", adminController.getUserTurnoverStatus);
router.post("/turnover/clear", adminController.clearUserTurnover);
router.post("/turnover/add", adminController.addUserTurnover);

// Agency levels
router.get("/agency-levels", adminController.getAgencyLevelConfigs);
router.put("/agency-levels/:level", adminController.updateAgencyLevelConfig);

// Agent team stats
router.get("/agent/team-stats", adminController.getUserTeamStats);
router.get("/agent/team-members", adminController.getUserTeamMembers);
router.get("/agent/agentcomm", adminController.getAgentCommissionRecords);
router.get("/agent/commision-records", adminController.getCommissionRecords);
router.post("/agent/runmidnightcalc", adminController.adminRunMidnightBatch);

// Bet search
router.get("/bets/wingo", adminController.getWingoAllBets);
router.get("/bets/provider", adminController.getGameAllBets);
router.get("/bets/daily-stats", adminController.getUserBetDailyStats);

// Gift codes
router.post("/gift-codes", giftCodeController.createGiftCode);
router.get("/gift-codes", giftCodeController.listGiftCodes);
router.get("/gift-codes/:code", giftCodeController.getGiftCode);
router.put("/gift-codes/:code", giftCodeController.updateGiftCode);
router.patch("/gift-codes/:code/toggle", giftCodeController.toggleGiftCode);
router.delete("/gift-codes/:code", giftCodeController.deleteGiftCode);
router.get("/gift-codes/:code/redemptions", giftCodeController.getGiftCodeRedemptions);

// Game operations
router.post("/move-game-to-wallet", adminController.adminMoveGameToWallet);

// Server logs
router.get("/logs", adminController.getServerLogs);

// Wingo Admin
router.post("/result-mode", setMode);
router.get("/result-mode", getMode);
router.get("/current-round", getAdminCurrentRound);
router.get("/current-round/bets", getCurrentRoundBets);
router.get("/round-stats/:issueNumber", getRoundStats);
router.get("/rounds", getRounds);

export default router;
