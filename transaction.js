class Transaction {
  constructor(from, to, amount) {
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.timestamp = new Date().getTime();
  }
}

module.exports = Transaction;
