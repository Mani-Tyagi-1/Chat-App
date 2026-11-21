import express from "express";
import {
  changePassword,
  checkAuth,
  forgotPassword,
  login,
  logout,
  resetPassword,
  signup,
  updateProfile,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth);

router.put("/change-password", protectRoute, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;

