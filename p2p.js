const WebSocket = require("ws");
const Message = require("./message");
const Blockchain = require("./blockchain");
const Transaction = require("./transaction");

class P2PServer {
  constructor(bc) {
    this.sockets = [];
    this.bc = bc;
  }

  listen() {
    const server = new WebSocket.Server({ port: 7545 });
    server.on("connection", (socket, req) => {
      console.log(
        `websocket connection ${req.socket.remoteAddress}:${req.socket.remotePort}`
      );
      this.connectSocket(socket);
    });
  }

  connectToPeer(newPeer) {
    const socket = new WebSocket(newPeer);
    socket.on("open", () => {
      this.connectSocket(socket);
    });
  }

  connectSocket(socket) {
    this.sockets.push(socket);
    this.messageHandler(socket);
    const message = {
      type: Message.LATEST_BLOCK,
      payload: {},
    };
    this.send(socket, message);
  }

  send(socket, message) {
    socket.send(JSON.stringify(message));
  }

  messageHandler(socket) {
    const callback = (data) => {
      const result = JSON.parse(data.toString()); // {type:'', payload:''}
      switch (result.type) {
        case Message.LATEST_BLOCK:
          const message1 = {
            type: Message.ALL_BLOCK,
            payload: this.bc.getLastBlock(),
          };
          this.send(socket, message1);
          break;
        case Message.ALL_BLOCK:
          const receivedBlock = result.payload;
          const isSuccess = this.bc.addBlock(receivedBlock);
          if (isSuccess) break;
          const message2 = {
            type: Message.RECEIVED_CHAIN,
            payload: this.bc.blockchain,
          };
          this.send(socket, message2);
          break;
        case Message.RECEIVED_CHAIN:
          const chain = result.payload;
          this.handleChain(chain);
          break;
        case Message.RECEIVED_TX:
          console.log("RECEIVED TX", result.payload);
          const receivedTx = result.payload;
          if (!receivedTx) return;

          const withTx = this.bc.mempool.find((tx) => {
            return tx.txid === receivedTx.txid;
          });
          if (!withTx) {
            this.bc.addTransaction(receivedTx);
            const message3 = {
              type: Message.RECEIVED_TX,
              payload: receivedTx,
            };
            this.broadcast(message3);
          }
          break;
      }
    };
    socket.on("message", callback);
  }

  broadcast(message) {
    this.sockets.forEach((socket) => socket.send(JSON.stringify(message)));
  }

  handleChain(chain) {
    const isValidChain = this.bc.isValidBlockchain(chain);
    if (!isValidChain) return;

    const isValid = this.replaceChain(chain);
    if (!isValid) return;

    const message = {
      type: Message.RECEIVED_CHAIN,
      payload: chain,
    };

    this.broadcast(message);
  }

  replaceChain(chain) {
    const lastReceivedBlock = chain[chain.length - 1];
    const lastBlock = this.bc.getLastBlock();
    if (lastReceivedBlock.index === 0) {
      console.log("제네시스 블록");
      return false;
    }

    if (lastReceivedBlock.index <= lastBlock.index) {
      console.log("내 블록체인이 더 길다");
      return false;
    }

    this.bc.blockchain = chain;

    this.bc.blockchain.forEach((block) => {
      this.bc.updateMempool(block);
    });
    return true;
  }
}

module.exports = P2PServer;
