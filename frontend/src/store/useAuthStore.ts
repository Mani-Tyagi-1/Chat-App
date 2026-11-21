import { create } from "zustand";
import { axiosInstance, BASE_URL } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

export type AuthUser = {
  _id: string;
  fullName: string;
  email?: string;
  profilePic?: string;
  createdAt?: string;
};

type AuthStore = {
  authUser: AuthUser | null;
  isSigningUp: boolean;
  isLoggingIn: boolean;
  isUpdatingProfile: boolean;
  isCheckingAuth: boolean;
  isChangingPassword: boolean;
  onlineUsers: string[];
  socket: any;
  checkAuth: () => Promise<void>;
  signup: (data: any) => Promise<void>;
  login: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<{ success: boolean; code?: string }>;
  resetPassword: (data: {
    email: string;
    code: string;
    newPassword: string;
  }) => Promise<boolean>;
  connectSocket: () => void;
  disconnectSocket: () => void;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  isChangingPassword: false,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      const user = res.data.user || res.data;
      set({ authUser: user });
      get().connectSocket();
    } catch (error: any) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data: any) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      const user = res.data.user || res.data;
      set({ authUser: user });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create account");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      const user = res.data.user || res.data;
      set({ authUser: user });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      const user = res.data.user || res.data;
      set({ authUser: user });
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.log("error in update profile:", error);
      toast.error(error.response?.data?.message || "Profile update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  changePassword: async (data) => {
    set({ isChangingPassword: true });
    try {
      const res = await axiosInstance.put("/auth/change-password", data);
      toast.success(res.data.message || "Password changed successfully");
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to change password");
      return false;
    } finally {
      set({ isChangingPassword: false });
    }
  },

  forgotPassword: async (email) => {
    try {
      const res = await axiosInstance.post("/auth/forgot-password", { email });
      toast.success(res.data.message || "Verification code generated!");
      return { success: true, code: res.data.code };
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Email not found");
      return { success: false };
    }
  },

  resetPassword: async (data) => {
    try {
      const res = await axiosInstance.post("/auth/reset-password", data);
      const user = res.data.user || res.data;
      set({ authUser: user });
      toast.success(res.data.message || "Password reset successful! You are now logged in.");
      get().connectSocket();
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Password reset failed");
      return false;
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || !authUser._id || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect();

    set({ socket: socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
