import crypto from "crypto";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const MERCHANT_ID = process.env.UPAY_MERCHANT_ID;
const MERCHANT_KEY = process.env.UPAY_MERCHANT_KEY;
const BASE_URL = process.env.UPAY_BASE_URL || "https://open.rplapi.com/rupeeLink/api";
const CALLBACK_URL = process.env.UPAY_CALLBACK_URL;
const PAYOUT_CALLBACK_URL = process.env.UPAY_PAYOUT_CALLBACK_URL || CALLBACK_URL;

function md5(str) {
  return crypto.createHash("md5").update(str).digest("hex").toUpperCase();
}

export function generatePaySign(orderCode, amount) {
  return md5(`${orderCode}&${amount}&${MERCHANT_ID}&${MERCHANT_KEY}`);
}

export function generatePayoutSign(orderCode, amount, address) {
  return md5(`${orderCode}&${amount}&${address}&${MERCHANT_ID}&${MERCHANT_KEY}`);
}

export function generateBalanceSign(timestamp) {
  return md5(`${MERCHANT_ID}&${timestamp}&${MERCHANT_KEY}`);
}

export function verifyCallbackSign(params) {
  const { sign, orderCode, amount, status } = params;
  const expectedSign = md5(`${orderCode}&${amount}&${status}&${MERCHANT_ID}&${MERCHANT_KEY}`);
  return sign === expectedSign;
}

export async function createPaymentOrder({ orderCode, amount }) {
  const sign = generatePaySign(orderCode, amount);

  const payload = new URLSearchParams();
  payload.append("userCode", MERCHANT_ID);
  payload.append("orderCode", orderCode);
  payload.append("amount", String(amount));
  payload.append("callbackUrl", CALLBACK_URL);
  payload.append("sign", sign);

  try {
    const res = await axios.post(`${BASE_URL}/pay`, payload.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    });
    return res.data;
  } catch (error) {
    const apiErr = error.response?.data;
    const details =
      apiErr?.msg ||
      apiErr?.error ||
      apiErr?.message ||
      (typeof apiErr === "string" ? apiErr : null) ||
      error.message;
    throw new Error(details);
  }
}

export async function createPayoutOrder({ orderCode, amount, address, callbackUrl }) {
  const sign = generatePayoutSign(orderCode, amount, address);

  const payload = new URLSearchParams();
  payload.append("userCode", MERCHANT_ID);
  payload.append("orderCode", orderCode);
  payload.append("amount", String(amount));
  payload.append("address", address);
  payload.append("sign", sign);
  payload.append("callbackUrl", callbackUrl || PAYOUT_CALLBACK_URL);
  payload.append("callbackDelayTime", "3");

  try {
    const res = await axios.post(`${BASE_URL}/remit`, payload.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    });
    return res.data;
  } catch (error) {
    const apiErr = error.response?.data;
    const details =
      apiErr?.msg ||
      apiErr?.error ||
      apiErr?.message ||
      (typeof apiErr === "string" ? apiErr : null) ||
      error.message;
    throw new Error(details);
  }
}

export async function queryPayment(orderCode, customerOrderCode) {
  const sign = md5(`${orderCode}&${customerOrderCode}&${MERCHANT_ID}&${MERCHANT_KEY}`);

  const payload = new URLSearchParams();
  payload.append("userCode", MERCHANT_ID);
  payload.append("orderCode", orderCode);
  payload.append("customerOrderCode", customerOrderCode);
  payload.append("sign", sign);

  try {
    const res = await axios.post(`${BASE_URL}/query/pay-order`, payload.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    });
    return res.data;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function queryPayout(orderCode, customerOrderCode) {
  const sign = md5(`${orderCode}&${customerOrderCode}&${MERCHANT_ID}&${MERCHANT_KEY}`);

  const payload = new URLSearchParams();
  payload.append("userCode", MERCHANT_ID);
  payload.append("orderCode", orderCode);
  payload.append("customerOrderCode", customerOrderCode);
  payload.append("sign", sign);

  try {
    const res = await axios.post(`${BASE_URL}/query/remit-order`, payload.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 15000,
    });
    return res.data;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function checkUpayBalance() {
  const timestamp = Date.now();
  const sign = generateBalanceSign(timestamp);

  try {
    const res = await axios.get(
      `${BASE_URL}/balance/${MERCHANT_ID}?timestamp=${timestamp}&sign=${sign}`,
      { timeout: 15000 }
    );
    return res.data;
  } catch (error) {
    throw new Error(error.message);
  }
}
