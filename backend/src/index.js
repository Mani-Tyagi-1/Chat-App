import express from "express";
import "dotenv/config";
import authRoutes from "../routes/authRoutes.js";
import messageRoutes from "../routes/messageRoutes.js";
import groupRoutes from "../routes/groupRoutes.js";
import { connectDB } from "../lib/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { app, server } from "../lib/socket.js";

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return true;
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:")
  ) {
    return true;
  }
  // Allow all private LAN subnets (192.168.x.x, 10.x.x.x, 172.16-31.x.x) on any port
  if (
    /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(
      origin
    )
  ) {
    return true;
  }
  if (
    origin === "https://chit-chat-kappa-five.vercel.app" ||
    origin.endsWith(".vercel.app")
  ) {
    return true;
  }
  return false;
};

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

app.use("/auth", authRoutes);
app.use("/messages/", messageRoutes);
app.use("/groups", groupRoutes);

// test
app.get("/", (req, res) => {
  res.send("Hello World!");
});




server.listen(process.env.PORT, "0.0.0.0", () => {
  console.log("Server is running on port " + process.env.PORT);

  connectDB();
});