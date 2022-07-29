const express = require("express");
const Blockchain = require("./blockchain");
const Message = require("./message");
const P2PServer = require("./p2p");
const Transaction = require("./transaction");

const app = express();

const bc = new Blockchain();
const ws = new P2PServer(bc);

app.get("/", (req, res) => {
  res.json("Hello Blockchain!");
});

app.get("/blocks", (req, res) => {
  res.json(bc.blockchain);
});

app.get("/mempool", (req, res) => {
  res.json(bc.mempool);
});

app.get("/addToPeer", (req, res) => {
  const { host, port } = req.query;
  console.log(host, port);
  ws.connectToPeer(`ws://${host}:${port}`);
  res.json("웹소켓 연결");
});

app.get("/mining", async (req, res) => {
  res.json("채굴시작");

  while (true) {
    await bc.mining();
    const message = {
      type: Message.LATEST_BLOCK,
      payload: {},
    };
    ws.broadcast(message);
  }
});

app.get("/tx", (req, res) => {
  const tx = new Transaction("A", "B", 50);
  bc.addTransaction(tx);
  const message = {
    type: Message.RECEIVED_TX,
    payload: tx,
  };
  ws.broadcast(message);
  res.json(tx);
});

app.listen(3000, () => {
  console.log("3000번 포트로 연결됨");
  ws.listen();
});
