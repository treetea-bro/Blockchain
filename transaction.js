const hash = require("hash.js");

class Transaction {
  constructor(from, to, amount) {
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.timestamp = new Date().getTime();
    this.txid = hash
      .sha256()
      .update(`${this.from}${this.to}${this.amount}${this.timestamp}`)
      .digest("hex");
  }
}

module.exports = Transaction;
