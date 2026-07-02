const IST = "Asia/Kolkata";

function parseISTDate(dateStr) {
  return new Date(dateStr + "T00:00:00+05:30");
}

function parseISTDateEnd(dateStr) {
  return new Date(dateStr + "T23:59:59.999+05:30");
}

function toISTString(d) {
  return d.toLocaleString("sv-SE", { timeZone: IST });
}

function toISTDate(d) {
  return d.toLocaleDateString("en-CA", { timeZone: IST });
}

function istNow() {
  return toISTString(new Date());
}

export { parseISTDate, parseISTDateEnd, toISTString, toISTDate, istNow };
