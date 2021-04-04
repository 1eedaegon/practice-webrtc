import os from "os";
import nodeStatic from "node-static";
import http from "http";
import { Server } from "socket.io";

console.log("Server is waiting");
const fileServer = new nodeStatic.Server();
const app = http
  .createServer((req, res) => fileServer.serve(req, res))
  .listen(8000);
const io = new Server(app);
// socket conn
io.sockets.on("connection", (socket) => {
  const log = (...params) => {
    const array = ["Message from Server: "];
    array.push.apply(array, params);
    socket.emit("[LOG] - ", array);
  };
  socket.on("message", (msg) => {
    log("Client said: ", msg);
    socket.broadcast.emit("message", msg);
  });
  socket.on("create or join", (room) => {
    log("Received request to create or join room" + room);
    const clientsInRoom = io.sockets.adapter.rooms[room];
    let numClients = clientsInRoom
      ? Object.keys(clientsInRoom.sockets).length
      : 0;
    log("Room" + room + "now has" + numClients + " Clients(s)");
    if (numClients === 0) {
      socket.join(room);
      log("Client Id" + socket.id + "created room" + room);
      socket.emit("created", room, socket.id);
      return;
    }
    if (numClients === 1) {
      log("Client ID" + socket.id + "joined room" + room);
      io.sockets.in(room).emit("join", room);
      socket.join(room);
      socket.emit("joined", room, socket.id);
      io.sockets.in(room).emit("ready");
      return;
    }
    socket.emit("full", room);
    return;
  });
  socket.on("ipaddr", () => {
    const ifaces = os.networkInterfaces();
    for (dev in ifaces) {
      ifaces[dev].forEach((details) => {
        if (details.family === "IPv4" && details.address !== "127.0.0.1") {
          socket.emit("ipaddr", details.address);
        }
      });
    }
  });
  socket.on("bye", () => console.log("Received bye..."));
});
