import crypto from "crypto";
import axios from "axios";

function buildUsername(userId) {
  return `u${userId}`.toLowerCase();
}

function buildPassword() {
  return "Qwer124";
}

function buildReferenceId(prefix, userId) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const uid = String(userId).slice(-6);
  return `${prefix}${uid}${timestamp}${random}`.slice(0, 20);
}

function resolveProviderCode(raw) {
  const pc = String(raw || "").trim();
  if (!pc) return "JE";
  return pc.toUpperCase();
}

async function ensureProviderMember(username, providerCode) {
  const pc = resolveProviderCode(providerCode);

  const sigSource =
    process.env.OPERATOR_CODE.toLowerCase() +
    username.toLowerCase() +
    process.env.GAME_SECRET_KEY;

  const sig = crypto
    .createHash("md5")
    .update(sigSource)
    .digest("hex")
    .toUpperCase();

  const createParams = {
    operatorcode: process.env.OPERATOR_CODE.toLowerCase(),
    username,
    providercode: pc,
    signature: sig,
  };
  let res;
  try {
    res = await axios.get(`${process.env.GAME_API_URL}/createMember.aspx`, {
      params: createParams,
      timeout: 10000,
    });
  } catch (e) {
    console.error(`[createMember] Network error (${pc}):`, e.message);
    const error = new Error(`Network error: ${e.message}`);
    error.code = "NETWORK_ERROR";
    throw error;
  }

  const { errCode, errMsg } = res.data || {};
  const ignoredCodes = ["0", "82", "101", "102", "103", "104"];
  if (!ignoredCodes.includes(String(errCode))) {
    const error = new Error(errMsg || `Failed to create member at ${pc} provider (code: ${errCode})`);
    error.code = errCode;
    throw error;
  }
}

async function makeTransfer({ username, password, referenceId, type, amount, providerCode }) {
  const amountStr = Number(amount || 0).toFixed(2);
  const pc = resolveProviderCode(providerCode);

  const sigSource =
    amountStr +
    process.env.OPERATOR_CODE.toLowerCase() +
    password +
    pc +
    referenceId +
    type +
    process.env.OPERATOR_CODE.toLowerCase() +
    username +
    process.env.GAME_SECRET_KEY;

  const sig = crypto
    .createHash("md5")
    .update(sigSource)
    .digest("hex")
    .toUpperCase();

  const transferParams = {
    operatorcode: process.env.OPERATOR_CODE.toLowerCase(),
    providercode: pc,
    username,
    password,
    referenceid: referenceId,
    transferamount: amountStr,
    type: Number(type) === 1 ? 1 : 2,
    signature: sig,
  };

  try {
    const res = await axios.get(`${process.env.GAME_API_URL}/makeTransfer.aspx`, {
      params: transferParams,
      timeout: 15000,
    });
    return res.data;
  } catch (e) {
    console.error(`[makeTransfer] Network error (${pc}):`, e.message);
    const error = new Error(`Network error: ${e.message}`);
    error.code = "NETWORK_ERROR";
    throw error;
  }
}

async function getGameBalance(username, password, providerCode) {
  const pc = resolveProviderCode(providerCode);

  try {
    const sigSource =
      process.env.OPERATOR_CODE.toLowerCase() +
      username +
      process.env.GAME_SECRET_KEY;
    const sig = crypto
      .createHash("md5")
      .update(sigSource)
      .digest("hex")
      .toUpperCase();

    const params = {
      operatorcode: process.env.OPERATOR_CODE.toLowerCase(),
      providercode: pc,
      username,
      signature: sig,
    };
    const balanceRes = await axios.get(`${process.env.GAME_API_URL}/checkBalance.aspx`, {
      params,
      timeout: 10000,
    });

    if (!balanceRes.data || String(balanceRes.data.errCode) === "401") {
      return 0;
    }

    return Number(balanceRes.data.balance) || 0;
  } catch (e) {
    console.warn(`[getGameBalance] Failed ${pc}:`, e.message);
    throw e;
  }
}

export { buildUsername, buildPassword, buildReferenceId, resolveProviderCode, ensureProviderMember, makeTransfer, getGameBalance };
