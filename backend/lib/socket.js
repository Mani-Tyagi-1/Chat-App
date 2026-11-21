import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

// Store userId <-> socketId mappings
const userSocketMap = {};

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:")
  ) {
    return true;
  }
  if (
    /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(
      origin
    )
  ) {
    return true;
  }
  if (origin === "https://chit-chat-kappa-five.vercel.app") return true;
  return false;
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  },
});

export function getReceiverSocketId(receiverId) {
  return userSocketMap[receiverId];
}

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (!userId) {
    console.warn("⚠️  Connection rejected: userId not provided.");
    socket.disconnect();
    return;
  }

  console.log(`✅ User connected: ${userId} with socket ID: ${socket.id}`);
  userSocketMap[userId] = socket.id;

  // Notify all users about online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Typing indicator events
  socket.on("typing", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", { senderId: userId });
    }
  });

  socket.on("stopTyping", ({ receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStopTyping", { senderId: userId });
    }
  });

  // Real-time Mark Messages As Seen event
  socket.on("markAsSeen", async ({ senderId }) => {
    try {
      if (!senderId) return;
      const Message = (await import("../models/message.model.js")).default;
      const updateResult = await Message.updateMany(
        { senderId, receiverId: userId, seen: false },
        { $set: { seen: true } }
      );

      if (updateResult.modifiedCount > 0) {
        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messagesSeen", {
            seenBy: userId,
          });
        }
      }
    } catch (err) {
      console.error("Error in socket markAsSeen:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${userId} (socket ${socket.id})`);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, server, app };
