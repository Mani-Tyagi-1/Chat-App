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
        }
        catch (error) {
            toast.error("Oops!! something went wrong");
            console.log("Error in signup", error);
        }
    },

    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout");
            set({ authUser: null });
        } catch (error) {
            toast.error("Oops!! something went wrong in logging out");
            console.log("Error in logout", error);
        }
    },
    
})); 



