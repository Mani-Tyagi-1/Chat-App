import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

// Store userId <-> socketId mappings
const userSocketMap = {};

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://chit-chat-kappa-five.vercel.app",
    ],
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

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${userId} (socket ${socket.id})`);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, server, app };
