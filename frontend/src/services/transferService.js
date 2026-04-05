import api from "../api/api";

export const getTransferBranches = async () => {
  const res = await api.get("/transfers/branches");
  return res.data;
};

export const getNextTransferNo = async (branchId) => {
  const res = await api.get(`/transfers/next-number/${branchId}`);
  return res.data;
};

export const searchTransferProducts = async (query, branchId) => {
  const res = await api.get(`/transfers/search-products`, {
    params: { q: query, branch_id: branchId },
  });
  return res.data.data;
};

export const scanTransferProduct = async (code, branchId) => {
  const res = await api.get(`/transfers/barcode/${code}`, {
    params: { branch_id: branchId },
  });
  return res.data;
};

export const createTransfer = async (payload) => {
  const res = await api.post("/transfers", payload);
  return res.data;
};

export const getRecentTransfers = async (page = 1) => {
  const res = await api.get(`/transfers/recent?page=${page}`);
  return res.data;
};
