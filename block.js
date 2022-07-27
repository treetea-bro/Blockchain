const hash = require("hash.js");
const merkle = require("merkle");
const Transaction = require("./transaction");

class Block {
  constructor(data) {
    this.index = data.index;
    this.previousHash = data.previousHash;
    this.nonce = data.nonce;
    this.difficulty = data.difficulty;
    this.transactions = data.transactions;
    this.version = this.getVersion();
    this.merkleHash = this.getMerkleRoot();
    this.timestamp = this.getTimestamp();
    this.hash = this.getHash();
  }

  getVersion() {
    return "1.0.0";
  }

  getTimestamp() {
    return new Date().getTime();
  }

  getMerkleRoot() {
    return merkle("sha256").sync(this.transactions).root();
  }

  getHash() {
    const resultHash = hash
      .sha256()
      .update(
        `${this.index} 
          ${this.version} 
          ${this.previousHash} 
          ${this.merkleHash} 
          ${this.nonce} 
          ${this.timestamp} 
          ${this.difficulty}`
      )
      .digest("hex");
    return resultHash;
  }

  static getGenesis() {
    return new Block({
      index: 0,
      previousHash: 0,
      nonce: 0,
      difficulty: 1,
      transactions: [new Transaction("Genesis", "Block", 0)],
    });
  }
}

module.exports = Block;
