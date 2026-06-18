// frontend/src/services/api.js
import axios from "axios";

const API_BASE = "http://localhost:3001/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

export const fetchRegions = () => api.get("/regions");
export const fetchRankings = (region) => api.get(`/rankings?region=${region}`);
export const fetchSummary = () => api.get("/summary");
export const fetchTopPerformers = () => api.get("/top-performers");
export const fetchTransactions = (params) =>
  api.get("/transactions", { params });
export const fetchBranch = (id) => api.get(`/branch/${id}`);

export default api;
