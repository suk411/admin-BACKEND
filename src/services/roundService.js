const ROUND_DURATION_MS = 30000;

function getCurrentIssueNumber() {
  const now = Date.now();
  const roundStart = Math.floor(now / ROUND_DURATION_MS) * ROUND_DURATION_MS;
  return issueFromTimestamp(roundStart);
}

function getRoundData() {
  const now = Date.now();
  const roundStart = Math.floor(now / ROUND_DURATION_MS) * ROUND_DURATION_MS;
  const roundEnd = roundStart + ROUND_DURATION_MS;
  const nextRoundStart = roundEnd;
  const nextRoundEnd = nextRoundStart + ROUND_DURATION_MS;
  const prevRoundStart = roundStart - ROUND_DURATION_MS;
  const prevRoundEnd = roundStart;

  const currentIssue = getCurrentIssueNumber();
  const prevIssue = getPreviousIssueNumber(currentIssue);
  const nextSeq = parseInt(currentIssue.slice(-5), 10) + 1;
  const nextIssue = currentIssue.slice(0, -5) + String(nextSeq).padStart(5, "0");

  return {
    gameCode: "WinGo_30S",
    intervalMinute: 0.5,
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

function getNextIssueNumber() {
  const now = Date.now();
  const nextRoundStart = (Math.floor(now / ROUND_DURATION_MS) + 1) * ROUND_DURATION_MS;
  return issueFromTimestamp(nextRoundStart);
}

function getPreviousIssueNumber(currentIssue) {
  const seq = parseInt(currentIssue.slice(-5), 10) - 1;
  if (seq < 1) {
    const prevDate = new Date(Date.now() - ROUND_DURATION_MS);
    return issueFromTimestamp(prevDate.getTime());
  }
  return currentIssue.slice(0, -5) + String(seq).padStart(5, "0");
}

function issueFromTimestamp(ts) {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const basePart = `${year}${month}${day}`;

  const startOfDay = new Date(year, date.getMonth(), date.getDate()).getTime();
  const periodsSinceMidnight = Math.floor((ts - startOfDay) / ROUND_DURATION_MS) + 1;

  return `${basePart}${String(periodsSinceMidnight).padStart(5, "0")}`;
}

export { getRoundData, getCurrentIssueNumber, getNextIssueNumber, getPreviousIssueNumber, ROUND_DURATION_MS };
