const WebSocket = require("ws");

class P2PServer {
  constructor() {
    this.sockets = [];
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
  }

  messageHandler(socket) {
    const callback = (data) => {
      console.log("전파받은 블록", JSON.parse(data.toString()));
    };
    socket.on("message", callback);
  }

  broadcast(message) {
    this.sockets.forEach((socket) => socket.send(JSON.stringify(message)));
  }
}

module.exports = P2PServer;
