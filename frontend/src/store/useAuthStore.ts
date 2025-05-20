import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

export const useAuthStore = create((set) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,

  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data, isCheckingAuth: false });
    } catch (error) {
      set({ authUser: null, isCheckingAuth: false });
      console.log("Error in checkAuth", error);
    }
  },

  signup: async (data: any) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully... Enjoy!!");
    } catch (error) {
      toast.error("Oops!! something went wrong");
      console.log("Error in signup", error);
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      toast.success("Logged out successfully... Bye Bye!!");
      set({ authUser: null });
    } catch (error) {
      toast.error("Oops!! something went wrong in logging out");
      console.log("Error in logout", error);
    }
  },

  login: async (data: any) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully... Welcome!!");
    } catch (error) {
      toast.error("Oops!! something went wrong in logging in");
      console.log("Error in login", error);
    }
  },

  updateProfile: async (data:any) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("HUrray!! Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      if (error && typeof error === "object" && "response" in error && error.response && typeof error.response === "object" && "data" in error.response && error.response.data && typeof error.response.data === "object" && "message" in error.response.data) {
        toast.error(String(error.response.data.message));
      } else {
        toast.error("Oops!! Error occurred while updating profile.");
      }
    } finally {
      set({ isUpdatingProfile: false });
    }
    },
  
  
}));
