const { BN } = require("bn.js");
const Block = require("./block");
const Transaction = require("./transaction");
const P2PServer = require("./p2p");

class Blockchain {
  constructor() {
    this.blockchain = [Block.getGenesis()];
    this.mempool = [];
  }

  // 트랜젝션 추가
  addTransaction(tx) {
    this.mempool.push(tx);
    console.log("들어간 트랜젝션", tx);
  }

  // 블록을 블록체인에 추가
  addBlock(newBlock) {
    // 유효성 검증
    const oldBlock = this.getLastBlock();
    if (this.isValidBlock(oldBlock, newBlock)) {
      this.blockchain.push(newBlock);
      console.log("추가된 블록", newBlock);
      this.updateMempool(newBlock);
      return true;
    } else {
      return false;
    }
  }

  // 난이도를 활용해서 비트구하기 (난이도 -> 비트 -> 목표값)
  difficultyToBits(difficulty) {
    const maximumTarget = "0x00ffff000000" + "0".repeat(64 - 12);
    const difficulty16 = difficulty.toString(16);
    let target = parseInt(maximumTarget, 16) / parseInt(difficulty16, 16);
    let num = new BN(target.toString(16), "hex");
    let compact, nSize, bits;
    nSize = num.byteLength();
    if (nSize <= 3) {
      compact = num.toNumber();
      compact <<= 8 * (3 - nSize);
    } else {
      compact = num.ushrn(8 * (nSize - 3)).toNumber();
    }
    if (compact & 0x800000) {
      compact >>= 8;
      nSize++;
    }
    bits = (nSize << 24) | compact;
    if (num.isNeg()) {
      bits |= 0x800000;
    }
    bits >>>= 0;
    return parseInt(bits.toString(10));
  }

  // 목표값 구하기 (비트 -> 목표값)
  getTarget(difficulty) {
    // const HANDICAP = 0x4000000;
    let bits = this.difficultyToBits(difficulty);
    // bits += HANDICAP;
    let bits16 = parseInt("0x" + bits.toString(16), 16);
    let exponent = bits16 >> 24;
    let mantissa = bits16 & 0xffffff;
    let target = mantissa * 2 ** (8 * (exponent - 3));
    let target16 = target.toString(16);
    let result = Buffer.from(
      "0".repeat(64 - target16.length) + target16,
      "hex"
    );
    return result.toString("hex");
  }

  // 채굴 - 난이도, 논스
  mining() {
    // 코인베이스 트랜젝션 만들기
    const coinbaseTx = new Transaction("coinBase", "miner", 50);

    // 블록바디에 넣을 트랜젝션 리스트 만들기
    const transactions = [coinbaseTx, ...this.mempool];

    // mempool 초기화
    this.mempool = [];

    // 마지막 블록을 가져오기
    const lastBlock = this.getLastBlock();

    // 마지막 블록의 해시를 가져와서 이전블록해시로 사용하기
    const previousHash = lastBlock.hash;

    // 마지막 블록의 인덱스 가져오기
    const lastBlockIndex = lastBlock.index;

    // 난이도 구하기
    const newDifficulty = this.getDifficulty(lastBlock.difficulty);

    // 새로운 블록 만들기
    const newBlock = new Block({
      index: lastBlockIndex + 1,
      previousHash: previousHash,
      transactions: transactions,
      difficulty: newDifficulty,
      nonce: 0,
    });

    // 해시퍼즐을 찾는 작업
    const target = this.getTarget(newDifficulty);
    while (!(newBlock.getHash() <= target)) {
      // console.log("목표값", target);
      // console.log("논스", newBlock.nonce);
      // console.log("해시값", newBlock.getHash());
      newBlock.nonce++;
    }
    console.log("해시 퍼즐 값", target);
    console.log("해시 퍼즐 정답 논스", newBlock.nonce);
    console.log("해시 정답 값", newBlock.getHash());
    newBlock.hash = newBlock.getHash();
    // 블록체인에 블록을 넣어주기
    this.addBlock(newBlock);
  }

  // 자가제한시스템
  getDifficulty(difficulty) {
    // 평균 블록생성시간을 10초에 수렴하도록 하려한다.
    const avgBlockTime = 10;
    // 확인 블록 카운트 10개
    const intervalBlockCount = 10;
    // 마지막 블록
    const lastBlock = this.getLastBlock();
    // 마지막 블록이 제네시스 블록이 아니여야하고, 확인 블록 카운트의 배수여야 한다.
    if (lastBlock.index > 0 && lastBlock.index % intervalBlockCount === 0) {
      // 라스트 블록 기준으로 10번째 앞에 있는 블록 생성 시간
      let prevTime =
        this.blockchain[this.blockchain.length - intervalBlockCount - 1]
          .timestamp;
      // 라스트 블록 생성 시간
      let lastTime = lastBlock.timestamp;
      // 평균 시간을 구함
      let avgTime = (lastTime - prevTime) / intervalBlockCount / 1000;
      // 구해진 평균 시간과 정의된 평균시간을 비교하여 배수를 정함
      let multiple = avgTime > avgBlockTime ? 1 / 4 : 4;
      // 난이도에 반영
      difficulty *= multiple;
      console.log("변경된 난이도", difficulty);
    }

    return difficulty;
  }

  getLastBlock() {
    return this.blockchain[this.blockchain.length - 1];
  }

  // 유효성 검증
  // 1. 블록 유효성 검증
  isValidBlock(oldBlock, newBlock) {
    // if (!oldBlock) return true;
    const result =
      newBlock.index > 0 &&
      oldBlock.hash === newBlock.previousHash &&
      newBlock.getHash() === newBlock.hash;
    if (!result) console.log("블록이 유효하지 않습니다!");

    return result;
  }
  // 2. 체인 유효성 검증
  isValidBlockchain(blockchain) {
    let result = true;
    if (blockchain.length === 1) return true;
    for (let i = 0; i < blockchain.length - 1; i++)
      if (!(blockchain[i].hash === blockchain[i + 1].previousHash))
        return false;

    return result;
  }

  updateMempool(block) {
    let txPool = this.mempool;
    block.transactions.forEach((tx) => {
      txPool = txPool.filter((txp) => {
        txp.txid !== tx.txid;
      });
    });
    this.mempool = txPool;
  }
}

module.exports = Blockchain;
