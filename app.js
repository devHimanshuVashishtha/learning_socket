const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static(join(__dirname, "./public/index.html")));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});
server.on("error", (err) => {
  console.Error("Server Error:", err);
});

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("chat msg", (msg) => {
    if (msg && msg.trim().length > 0) {
      console.log("Message:", msg);
      io.emit("chat msg", msg);
    } else {
      console.log("Enter a valid message");
    }
  });
  socket.on("disconnect", (resa) => {
    console.log("a user disconnected", resa);
  });

  socket.on("error", (err) => {
    console.error("socket error:", err);
  });
});

server.listen(process.env.PORT, () => {
  console.log(`server started at http://localhost:${process.env.PORT}`);
});
