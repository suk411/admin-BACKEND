import { getModeConfig, DEFAULT_MODE } from "../config/gameModes.js";

function getCurrentIssueNumber(mode = DEFAULT_MODE) {
  const { durationMs } = getModeConfig(mode);
  const now = Date.now();
  const roundStart = Math.floor(now / durationMs) * durationMs;
  return issueFromTimestamp(roundStart, mode, durationMs);
}

function getRoundData(mode = DEFAULT_MODE) {
  const { durationMs, gameCode, intervalMinute } = getModeConfig(mode);
  const now = Date.now();
  const roundStart = Math.floor(now / durationMs) * durationMs;
  const roundEnd = roundStart + durationMs;
  const nextRoundStart = roundEnd;
  const nextRoundEnd = nextRoundStart + durationMs;
  const prevRoundStart = roundStart - durationMs;
  const prevRoundEnd = roundStart;

  const currentIssue = getCurrentIssueNumber(mode);
  const prevIssue = getPreviousIssueNumber(currentIssue, mode);
  const nextSeq = parseInt(currentIssue.slice(-5), 10) + 1;
  const nextIssue = currentIssue.slice(0, -5) + String(nextSeq).padStart(5, "0");

  return {
    gameCode,
    intervalMinute,
    state: 1,
    previous: {
      issueNumber: prevIssue,
      startTime: prevRoundStart,
      endTime: prevRoundEnd,
    },
    current: {
      issueNumber: currentIssue,
      startTime: roundStart,
      endTime: roundEnd,
    },
    next: {
      issueNumber: nextIssue,
      startTime: nextRoundStart,
      endTime: nextRoundEnd,
    },
  };
}

function getNextIssueNumber(mode = DEFAULT_MODE) {
  const { durationMs } = getModeConfig(mode);
  const now = Date.now();
  const nextRoundStart = (Math.floor(now / durationMs) + 1) * durationMs;
  return issueFromTimestamp(nextRoundStart, mode, durationMs);
}

function getPreviousIssueNumber(currentIssue, mode = DEFAULT_MODE) {
  const { durationMs } = getModeConfig(mode);
  const seq = parseInt(currentIssue.slice(-5), 10) - 1;
  if (seq < 1) {
    const prevDate = new Date(Date.now() - durationMs);
    return issueFromTimestamp(prevDate.getTime(), mode, durationMs);
  }
  return currentIssue.slice(0, -5) + String(seq).padStart(5, "0");
}

function issueFromTimestamp(ts, mode = DEFAULT_MODE, durationMs) {
  const { durationMs: cfgDuration } = getModeConfig(mode);
  const ms = durationMs || cfgDuration;
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const basePart = `${year}${month}${day}`;

  const startOfDay = new Date(year, date.getMonth(), date.getDate()).getTime();
  const periodsSinceMidnight = Math.floor((ts - startOfDay) / ms) + 1;
  const numPart = String(periodsSinceMidnight).padStart(5, "0");

  if (mode === "30s") return `${basePart}${numPart}`;
  return `${mode.toUpperCase()}_${basePart}${numPart}`;
}

export { getRoundData, getCurrentIssueNumber, getNextIssueNumber, getPreviousIssueNumber };
