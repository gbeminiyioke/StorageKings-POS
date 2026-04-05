import api from "../api/api";

export const searchCustomers = (q) =>
  api.get(`/storage/customers?q=${encodeURIComponent(q)}`);

export const getUserBranches = () => api.get("/storage/branches");

export const getStorageSpaces = () => api.get("/storage/spaces");

export const searchProducts = (q) =>
  api.get(`/storage/products/search?q=${encodeURIComponent(q)}`);

export const getProductByBarcode = (code) =>
  api.get(`/storage/products/barcode/${encodeURIComponent(code)}`);

export const getNextStorageNo = (branchId) =>
  api.get(`/storage/next-number/${branchId}`);

export const saveStorage = (payload) => api.post("/storage", payload);

export const getRecentStorages = () => api.get("/storage/recent");

export const emailStoragePdf = (storageId) =>
  api.post(`/storage/${storageId}/email`);
