import WithdrawalOrder from "../models/withdrawalOrder.model.js";
import accountModel from "../models/account.model.js";
import transactionLedgerModel from "../models/transactionLedger.model.js";
import { createPayoutOrder } from "./paysimply.service.js";
import { createPayoutOrder as createUpayPayoutOrder } from "./upay.service.js";
import { createPayoutOrder as createGspayPayoutOrder } from "./gspay.service.js";
import logger from "../utils/logger.js";

function generateOrderId(prefix) {
  const d = new Date();
  const ts = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}${String(d.getSeconds()).padStart(2,"0")}`;
  const rnd = Math.random().toString(36).substring(2,4).toUpperCase();
  return `${prefix}${ts}${rnd}`;
}

export async function createPayoutOrderForWithdrawal(withdrawalOrder, user, payoutAmount) {
  const orderId = generateOrderId("WDP");
  const channelName = "SimplyPay";

  const paymentOrder = {
    userId: withdrawalOrder.userId,
    amount: payoutAmount,
    orderId: withdrawalOrder.orderId,
    channel: channelName,
    paymentDetails: {
      upiId: withdrawalOrder.paymentDetails?.upiId || "",
      accountNo: withdrawalOrder.bankDetails?.accountNumber || withdrawalOrder.paymentDetails?.accountNo || "",
      ifsc: withdrawalOrder.bankDetails?.ifsc || withdrawalOrder.paymentDetails?.ifsc || "",
      bankName: withdrawalOrder.bankDetails?.bankName || withdrawalOrder.paymentDetails?.bankName || "",
      rplId: withdrawalOrder.paymentDetails?.rplId || "",
      holderName: withdrawalOrder.paymentDetails?.holderName || withdrawalOrder.bankDetails?.accountHolder || user.name || user.mobile || "",
    },
  };

  const result = await createPayoutOrder(paymentOrder);

  const gwOrderNo = result.orderCode || result.orderNo || orderId;

  await WithdrawalOrder.findOneAndUpdate(
    { orderId: withdrawalOrder.orderId },
    {
      $set: {
        gatewayOrderNo: gwOrderNo,
        gatewayResponse: result.msg || result.message || JSON.stringify(result),
        channelName,
        status: "AUDITING",
      },
    },
  );

  return { orderCode: gwOrderNo };
}

export async function createUpayPayoutOrderForWithdrawal(withdrawalOrder, payoutAmount) {
  const orderId = generateOrderId("WDU");

  const paymentOrder = {
    userId: withdrawalOrder.userId,
    amount: payoutAmount,
    orderId: withdrawalOrder.orderId,
    channel: "Upay",
    paymentDetails: {
      upiId: withdrawalOrder.paymentDetails?.rplId || "",
      accountNo: "",
      ifsc: "",
      bankName: "",
      holderName: withdrawalOrder.paymentDetails?.holderName || "",
    },
  };

  const result = await createUpayPayoutOrder(paymentOrder);

  const gwOrderNo = result.orderCode || result.orderNo || orderId;

  await WithdrawalOrder.findOneAndUpdate(
    { orderId: withdrawalOrder.orderId },
    {
      $set: {
        gatewayOrderNo: gwOrderNo,
        gatewayResponse: result.msg || result.message || JSON.stringify(result),
        channelName: "Upay",
        status: "AUDITING",
      },
    },
  );

  return { orderCode: gwOrderNo };
}

export async function createGspayPayoutOrderForWithdrawal(withdrawalOrder, payoutAmount) {
  const orderId = generateOrderId("WDG");

  const calculateChannel = () => {
    const ch = (withdrawalOrder.channelName || "").toLowerCase();
    if (ch === "gspayusdt") return "USDT";
    return "INR";
  };

  const paymentOrder = {
    userId: withdrawalOrder.userId,
    amount: payoutAmount,
    orderId: withdrawalOrder.orderId,
    channel: calculateChannel(),
    paymentDetails: {
      upiId: withdrawalOrder.paymentDetails?.upiId || "",
      accountNo: withdrawalOrder.paymentDetails?.accountNo || withdrawalOrder.bankDetails?.accountNumber || "",
      ifsc: withdrawalOrder.paymentDetails?.ifsc || withdrawalOrder.bankDetails?.ifsc || "",
      bankName: withdrawalOrder.paymentDetails?.bankName || withdrawalOrder.bankDetails?.bankName || "",
      holderName: withdrawalOrder.paymentDetails?.holderName || withdrawalOrder.bankDetails?.accountHolder || "",
    },
  };

  const result = await createGspayPayoutOrder(paymentOrder);

  const gwOrderNo = result.orderCode || result.orderNo || orderId;

  await WithdrawalOrder.findOneAndUpdate(
    { orderId: withdrawalOrder.orderId },
    {
      $set: {
        gatewayOrderNo: gwOrderNo,
        gatewayResponse: result.msg || result.message || JSON.stringify(result),
        channelName: calculateChannel() === "USDT" ? "GSPayUSDT" : "GSPayINR",
        status: "AUDITING",
      },
    },
  );

  return { orderCode: gwOrderNo };
}
