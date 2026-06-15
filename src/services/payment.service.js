import WithdrawalOrder from "../models/withdrawalOrder.model.js";
import accountModel from "../models/account.model.js";
import transactionLedgerModel from "../models/transactionLedger.model.js";
import { createPayoutOrder } from "./paysimply.service.js";
import { createPayoutOrder as createUpayPayoutOrder } from "./upay.service.js";
import { createPayoutOrder as createGspayPayoutOrder } from "./gspay.service.js";
import { CHANNEL_MAP as GSPAY_CHANNEL_MAP } from "./gspay.service.js";
import { incrementWithdrawalTally } from "./agency.service.js";
import mongoose from "mongoose";
import logger from "../utils/logger.js";

export async function createPayoutOrderForWithdrawal(withdrawalOrder, user, payoutAmount) {
  const pmType = withdrawalOrder.paymentMethod || "BANK";
  const pd = withdrawalOrder.paymentDetails;
  const hasPd = pd && (pd.holderName || pd.upiId || pd.accountNo || pd.rplId);
  const bankDetails = hasPd
    ? {
        bankName: pd.bankName || withdrawalOrder.bankDetails?.bankName || "",
        bankCode: pd.ifsc || withdrawalOrder.bankDetails?.bankCode || "",
        accountNumber: pmType === "UPI"
          ? (pd.upiId || withdrawalOrder.bankDetails?.accountNumber || "")
          : (pd.accountNo || withdrawalOrder.bankDetails?.accountNumber || ""),
        accountHolder: pd.holderName || withdrawalOrder.bankDetails?.accountHolder || "",
        ifsc: pd.ifsc || withdrawalOrder.bankDetails?.ifsc || "",
      }
    : withdrawalOrder.bankDetails;

  const accountNumber = pmType === "UPI" ? bankDetails?.accountNumber : bankDetails?.accountNumber;
  const ifscCode = pmType === "UPI" ? "" : bankDetails?.ifsc;
  if (!accountNumber) {
    throw new Error(`Missing ${pmType === "UPI" ? "UPI ID (vpa)" : "bank account number"} for withdrawal ${withdrawalOrder.orderId}`);
  }
  if (pmType !== "UPI" && !ifscCode) {
    throw new Error(`Missing IFSC code for withdrawal ${withdrawalOrder.orderId}`);
  }

  const gatewayRes = await createPayoutOrder({
    merOrderNo: withdrawalOrder.orderId,
    amount: payoutAmount ?? withdrawalOrder.amount,
    bankDetails,
    user,
    paymentMethodType: pmType,
  });

  if (gatewayRes.code !== 0) {
    throw new Error(`Payout gateway error: ${gatewayRes.msg || gatewayRes.message || gatewayRes.error || JSON.stringify(gatewayRes)}`);
  }

  const gwData = gatewayRes.data;
  withdrawalOrder.gatewayOrderNo = gwData.orderNo;
  withdrawalOrder.status = "AUDITING";
  await withdrawalOrder.save();

  return gwData;
}

export async function createUpayPayoutOrderForWithdrawal(withdrawalOrder, payoutAmount) {
  const address = withdrawalOrder.paymentDetails?.rplId || withdrawalOrder.bankDetails?.accountNumber || "";

  const gatewayRes = await createUpayPayoutOrder({
    orderCode: withdrawalOrder.orderId,
    amount: payoutAmount ?? withdrawalOrder.amount,
    address,
    callbackUrl: process.env.UPAY_PAYOUT_CALLBACK_URL || process.env.UPAY_CALLBACK_URL,
  });

  if (gatewayRes.code !== 200) {
    throw new Error(`UPay payout error: ${gatewayRes.message || JSON.stringify(gatewayRes)}`);
  }

  const gwOrderNo = gatewayRes.data?.orderNo || gatewayRes.orderNo || "";
  withdrawalOrder.gatewayOrderNo = gwOrderNo;
  withdrawalOrder.status = "AUDITING";
  await withdrawalOrder.save();

  return gatewayRes;
}

export async function createGspayPayoutOrderForWithdrawal(withdrawalOrder, payoutAmount) {
  const channelKey = (withdrawalOrder.channelName || "GSPayINR").toLowerCase();
  const gspayChannel = GSPAY_CHANNEL_MAP[channelKey] || GSPAY_CHANNEL_MAP.gspayinr;

  const bankDetails = withdrawalOrder.paymentDetails || withdrawalOrder.bankDetails || {};

  const gatewayRes = await createGspayPayoutOrder({
    transactionId: withdrawalOrder.orderId,
    amount: payoutAmount ?? withdrawalOrder.amount,
    accountName: bankDetails.holderName || bankDetails.accountHolder || "",
    accountNumber: bankDetails.accountNo || bankDetails.accountNumber || bankDetails.upiId || bankDetails.rplId || "",
    bankCode: bankDetails.ifsc || bankDetails.bankCode || "MBB",
    pgCode: gspayChannel.pgCode,
  });

  if (gatewayRes.success === false || gatewayRes.code === "error" || gatewayRes.status === "error") {
    throw new Error(`GSPay payout error: ${gatewayRes.message || gatewayRes.msg || gatewayRes.error || JSON.stringify(gatewayRes)}`);
  }

  const gwOrderNo = gatewayRes.data?.payoutData || "";
  withdrawalOrder.gatewayOrderNo = gwOrderNo;
  withdrawalOrder.status = "AUDITING";
  await withdrawalOrder.save();

  return gatewayRes;
}

export async function processRefund(order, gatewayLabel) {
  if (!order || !["FAILED", "CANCELLED"].includes(order.status)) return;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const account = await accountModel.findOne({ user: order.userId }).session(session);
    if (account) {
      const refundAmount = order.amount;
      account.balance += refundAmount;
      await account.save({ session });

      await transactionLedgerModel.create([{
        userId: order.userId,
        type: "WITHDRAW_REFUND",
        amount: refundAmount,
        charge: order.charge || 0,
        balanceAfter: account.balance,
        status: "SUCCESS",
        orderId: order.orderId,
        remark: `Withdrawal ${order.status} via ${gatewayLabel || "gateway"} - amount refunded (${order.amount})`,
      }], { session });
    }
    await session.commitTransaction();
  } catch (refundErr) {
    await session.abortTransaction();
  } finally {
    session.endSession();
  }
}
