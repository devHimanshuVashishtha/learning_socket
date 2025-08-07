const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");
const connectDB = require("./config/database");
const Message = require("./models/messagemodel");
require("dotenv").config();

connectDB();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
});

app.use(express.static(join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});
server.on("error", (err) => {
  console.error("Server Error:", err);
});

io.on("connection", async (socket) => {
  console.log("a user connected");
  socket.on("chat msg", async (msg) => {
    const newMessage = new Message({content:msg});
    try {
      if (msg && msg.trim().length > 0) {
        console.log("Message:", msg);

        await newMessage.save();
        io.emit("chat msg", msg);
      } else {
        console.log("Enter a valid message");
      }
    } catch (err) {
      console.err("Error:", err);
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
