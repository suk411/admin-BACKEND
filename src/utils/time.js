function parseISTDate(dateStr) {
  return new Date(dateStr + "T00:00:00");
}

function parseISTDateEnd(dateStr) {
  return new Date(dateStr + "T23:59:59.999");
}

function toISTString(d) {
  return d.toLocaleString("sv-SE");
}

function toISTDate(d) {
  return d.toLocaleDateString("en-CA");
}

function istNow() {
  return toISTString(new Date());
}

export { parseISTDate, parseISTDateEnd, toISTString, toISTDate, istNow };
