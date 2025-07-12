import express from "express";
import "dotenv/config";
import authRoutes from "../routes/authRoutes.js";
import messageRoutes from "../routes/messageRoutes.js";
import { connectDB } from "../lib/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { app, server } from "../lib/socket.js";

const allowedOrigins = [
  "http://localhost:5173",
  "https://chit-chat-kappa-five.vercel.app",
];


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use("/auth", authRoutes);
app.use("/messages/", messageRoutes);

// test
app.get("/", (req, res) => {
    res.send("Hello World!");
});




server.listen(process.env.PORT, () => {
    console.log("Server is running on port " + process.env.PORT);

    connectDB();
});