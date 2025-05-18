import express from "express";
import "dotenv/config";
import authRoutes from "../routes/authRoutes.js";
import messageRoutes from "../routes/messageRoutes.js";
import { connectDB } from "../lib/db.js";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(cookieParser());


app.use("/api/auth/", authRoutes);
app.use("/api/message/", messageRoutes);

app.listen(process.env.PORT, () => {
    console.log("Server is running on port " + process.env.PORT);

    connectDB();
});