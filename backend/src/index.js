import express from "express";
import "dotenv/config";
import authRoutes from "../routes/authRoutes.js";
import messageRoutes from "../routes/messageRoutes.js";
import { connectDB } from "../lib/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { app, server } from "../lib/socket.js";




app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://chitchat-po0t.onrender.com", "*"],
    credentials: true,
  })
);


app.use("/auth", authRoutes);
app.use("/messages/", messageRoutes);

// test
app.get("/", (req, res) => {
    res.send("Hello World!");
});


app.get("/", (req, res) => {
  res.send("Hello World!");
});

// app.listen(5000, () => {
//   console.log("Listening on port 5000");
// });



server.listen(process.env.PORT, () => {
    console.log("Server is running on port " + process.env.PORT);

    connectDB();
});