import crypto from "crypto";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const AUTH_KEY = process.env.GSPAY_AUTH_KEY;
const SECRET_KEY = process.env.GSPAY_SECRET_KEY;
const BASE_URL = process.env.GSPAY_BASE_URL || "https://api2.gspay.gold";

const PLAYER_USERNAME = "1xking";

export const CHANNEL_MAP = {
  gspayusdt: { pgCode: "gspayusdt", label: "USDT" },
  gspayinr: { pgCode: "xinpayinqr", label: "INR" },
};

function cleanUrl(value) {
  if (!value) return "";
  return String(value).trim().replace(/^`+|`+$/g, "").replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
}

const RETURN_URL = cleanUrl(process.env.GSPAY_RETURN_URL);
const FAILED_RETURN_URL = cleanUrl(process.env.GSPAY_FAILED_RETURN_URL);
const CALLBACK_URL = cleanUrl(process.env.GSPAY_CALLBACK_URL);
const PAYOUT_CALLBACK_URL = cleanUrl(process.env.GSPAY_PAYOUT_CALLBACK_URL);

function hmacSha256(data, key) {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

function buildPaymentRawString(transactionId, amount) {
  return `${transactionId}${Number(amount).toFixed(2)}${PLAYER_USERNAME}`;
}

function buildPayoutRawString(transactionId, amount, accountNumber) {
  return `${transactionId}${Number(amount).toFixed(2)}${PLAYER_USERNAME}${accountNumber}`;
}

function buildPaymentCallbackRawString(paymentId, transactionId, amount, success) {
  const s = success === true || success === "true" ? "true" : "false";
  return `${paymentId}${transactionId}${Number(amount).toFixed(2)}${s}`;
}

function buildPayoutCallbackRawString(payoutId, transactionId, amount, accountNumber, success) {
  const s = success === true || success === "true" ? "true" : "false";
  return `${payoutId}${transactionId}${Number(amount).toFixed(2)}${accountNumber}${s}`;
}

export function generatePaymentSignature(transactionId, amount) {
  const raw = buildPaymentRawString(transactionId, amount);
  return { raw, signature: hmacSha256(raw, SECRET_KEY) };
}

export function generatePayoutSignature(transactionId, amount, accountNumber) {
  const raw = buildPayoutRawString(transactionId, amount, accountNumber);
  return { raw, signature: hmacSha256(raw, SECRET_KEY) };
}

export function verifyPaymentCallback(body) {
  const { paymentId, transactionId, amount, success, signature } = body;
  const raw = buildPaymentCallbackRawString(paymentId, transactionId, amount, success);
  const expected = hmacSha256(raw, SECRET_KEY);
  return expected === signature;
}

export function verifyPayoutCallback(body) {
  const { payoutId, transactionId, amount, accountNumber, success, signature } = body;
  const raw = buildPayoutCallbackRawString(payoutId, transactionId, amount, accountNumber, success);
  const expected = hmacSha256(raw, SECRET_KEY);
  return expected === signature;
}

export async function createPaymentOrder({ transactionId, amount, pgCode, returnURL, failedReturnURL, lang }) {
  const { signature } = generatePaymentSignature(transactionId, amount);

  const body = {
    oAuthKey: AUTH_KEY,
    transactionId,
    amount: Number(amount),
    playerUsername: PLAYER_USERNAME,
    returnURL: returnURL || RETURN_URL,
    failedReturnURL: failedReturnURL || FAILED_RETURN_URL,
    signature,
  };
  if (pgCode) body.pgCode = pgCode;
  if (lang) body.lang = lang;

  try {
    const res = await axios.post(`${BASE_URL}/api/v2/payments`, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });
    return res.data;
  } catch (error) {
    const apiErr = error.response?.data;
    const details =
      apiErr?.message ||
      (apiErr ? JSON.stringify(apiErr) : null) ||
      error.message;
    throw new Error(details);
  }
}

export async function createPayoutOrder({ transactionId, amount, accountName, accountNumber, bankCode, pgCode, ifscCode }) {
  const { signature } = generatePayoutSignature(transactionId, amount, accountNumber);

  const body = {
    pgCode: pgCode || "gspay",
    oAuthKey: AUTH_KEY,
    bankCode: bankCode || "MBB",
    transactionId,
    accountName,
    accountNumber,
    amount: Number(amount),
    playerUsername: PLAYER_USERNAME,
    signature,
  };
  if (ifscCode) body.ifscCode = ifscCode;

  try {
    const res = await axios.post(`${BASE_URL}/api/v2/payouts`, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });
    return res.data;
  } catch (error) {
    const apiErr = error.response?.data;
    const details =
      apiErr?.message ||
      (apiErr ? JSON.stringify(apiErr) : null) ||
      error.message;
    throw new Error(details);
  }
}
