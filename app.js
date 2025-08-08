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
  socket.username = `User-${socket.id.substring(0, 5)}`;
  console.log("a user connected", socket.username);
  if (socket.handshake.auth.serverOffset) {
    console.log(`recovering message for ${socket.username}`);
    try {
      const messages = await Message.find({
        _id: { $gt: socket.handshake.auth.serverOffset },
      }).sort({ createdAt: 1 });
      messages.forEach((msg) => {
        socket.emit(
          "chat msg",
          {
            content: msg.content,
            username: msg.username,
          },
          msg._id.toString()
        );
      });
    } catch (err) {
      console.error("Error:", err);
      socket.emit("error message", "Failed to recover your previous data");
    }
  } else if (!socket.recovered) {
    console.log(
      "New session detected: fetching message history from the database."
    );
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const messages = await Message.find({
        createdAt: { $gte: tenMinutesAgo },
      }).sort({ createdAt: 1 });
      messages.forEach((mess) => {
        socket.emit(
          "chat msg",
          { content: mess.content, username: mess.username },
          mess._id.toString()
        );
      });
    } catch (err) {
      console.error("ERROR:", err);
      socket.emit("error message", "previous messages can not be loaded.");
    }
  }

  socket.on("chat msg", async (msg, clientOffset, callback) => {
    const newMessage = new Message({
      content: msg,
      username: socket.username,
      clientOffset: clientOffset,
    });
    try {
      if (msg && msg.trim().length > 0) {
        console.log("Message:", msg);

        await newMessage.save();
        const serverOffset = newMessage._id.toString();
        io.emit(
          "chat msg",
          { content: newMessage.content, username: newMessage.username },
          serverOffset
        );
        callback(serverOffset);
      } else {
        console.log("Enter a valid message");
        socket.emit("error message", "Your message not sent.");
        callback(null, "failed to return call back");
      }
    } catch (err) {
      console.error("Error:", err);
    }
  });
  socket.on("disconnect", (resa) => {
    console.log(`${socket.username} disconnected`, resa);
  });

  socket.on("error", (err) => {
    console.error("socket error:", err);
  });
});

server.listen(process.env.PORT, () => {
  console.log(`server started at http://localhost:${process.env.PORT}`);
});
