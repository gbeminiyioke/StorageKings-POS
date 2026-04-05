import api from "../api/api";

export const searchCustomers = (q) =>
  api.get(`/discharge/customers?q=${encodeURIComponent(q)}`);

export const getUserBranches = () => api.get("/discharge/branches");

export const getNextDischargeNo = (branchId) =>
  api.get(`/discharge/next-number/${branchId}`);

export const getStorageNos = (customerId, branchId) =>
  api.get(
    `/discharge/storage-nos?customer_id=${customerId}&branch_id=${branchId}`,
  );

export const getStorageItems = (storageId) =>
  api.get(`/discharge/storage/${storageId}/items`);

export const saveDischarge = (payload) => api.post("/discharge", payload);

export const getRecentDischarges = () => api.get("/discharge/recent");

export const emailDischargePdf = (id) => api.post(`/discharge/${id}/email`);
