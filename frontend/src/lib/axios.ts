import axios from "axios";

export const BASE_URL =
  import.meta.env.MODE === "development"
    ? `http://${window.location.hostname}:5001`
    : (import.meta.env.VITE_API_URL || "/");

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});