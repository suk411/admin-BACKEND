import crypto from "crypto";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const APP_ID = process.env.SIMPLYPAY_APP_ID;
const SECRET = process.env.SIMPLYPAY_SECRET_KEY;
const BASE_URL = process.env.SIMPLYPAY_BASE_URL;
const PAYOUT_BASE_URL = process.env.SIMPLYPAY_PAYOUT_BASE_URL || (BASE_URL ? BASE_URL.replace("/payment/order/create", "/payout/order/create") : "");

function cleanUrl(value) {
  if (!value) return "";
  return String(value)
    .trim()
    .replace(/^`+|`+$/g, "")
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");
}

const RETURN_URL = cleanUrl(process.env.SIMPLYPAY_RETURN_URL);
const NOTIFY_URL = cleanUrl(process.env.SIMPLYPAY_NOTIFY_URL);
const PAYOUT_NOTIFY_URL = cleanUrl(process.env.SIMPLYPAY_PAYOUT_NOTIFY_URL) || NOTIFY_URL;

function parseExtra(extra) {
  const keys = Object.keys(extra).sort();
  return keys.map((k) => `${k}=${extra[k]}`).join("&");
}

function generateSign(params, secret) {
  const keys = Object.keys(params)
    .filter(
      (k) => k !== "sign" && params[k] !== null && params[k] !== undefined,
    )
    .sort();

  let signStr = keys
    .map((k) => {
      if (typeof params[k] === "object" && params[k] !== null) {
        return `${k}=${parseExtra(params[k])}`;
      }
      return `${k}=${params[k]}`;
    })
    .join("&");

  signStr += `&key=${secret}`;
  return crypto.createHash("sha256").update(signStr, "utf8").digest("hex");
}

export function verifyCallbackSign(body) {
  const receivedSign = body.sign;
  const bodyCopy = { ...body };
  delete bodyCopy.sign;

  const expectedSign = generateSign(bodyCopy, SECRET);
  return receivedSign === expectedSign;
}

export async function createPaymentOrder({ merOrderNo, amount, user }) {
  const params = {
    appId: APP_ID,
    merOrderNo,
    currency: "INR",
    amount: String(amount),
    returnUrl: RETURN_URL,
    notifyUrl: NOTIFY_URL,
    attach: `deposit_${merOrderNo}`,
    extra: {
      name: user?.name || "User",
      email: user?.email || `${user?.userId}@example.com`,
      mobile: user?.mobileNumber || "9999999999",
    },
  };

  params.sign = generateSign(params, SECRET);

  try {
    const res = await axios.post(BASE_URL, params, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });
    return res.data;
  } catch (error) {
    const apiErr = error.response?.data;
    const details =
      apiErr?.msg ||
      apiErr?.error ||
      (apiErr ? JSON.stringify(apiErr) : null) ||
      error.message;
    throw new Error(details);
  }
}

export async function createPayoutOrder({ merOrderNo, amount, bankDetails, user, paymentMethodType }) {
  const extra = {};

  if (paymentMethodType === "UPI") {
    extra.payoutType = "UPI";
    extra.vpa = bankDetails.accountNumber || "";
    extra.name = bankDetails.accountHolder || "User";
    extra.email = user?.email || `${user?.userId}@example.com`;
    extra.mobile = user?.mobileNumber || "9999999999";
  } else {
    extra.payoutType = "IFSC";
    extra.ifsc = bankDetails.ifsc || "";
    extra.account = bankDetails.accountNumber || "";
    extra.name = bankDetails.accountHolder || "User";
    extra.email = user?.email || `${user?.userId}@example.com`;
    extra.mobile = user?.mobileNumber || "9999999999";
  }

  const params = {
    appId: APP_ID,
    merOrderNo,
    currency: "INR",
    amount: String(amount),
    notifyUrl: PAYOUT_NOTIFY_URL,
    attach: `withdraw_${merOrderNo}`,
    extra,
  };

  params.sign = generateSign(params, SECRET);

  try {
    const res = await axios.post(PAYOUT_BASE_URL, params, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });
    return res.data;
  } catch (error) {
    const apiErr = error.response?.data;
    const details =
      apiErr?.msg ||
      apiErr?.error ||
      (apiErr ? JSON.stringify(apiErr) : null) ||
      error.message;
    throw new Error(details);
  }
}
