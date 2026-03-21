import api from "../api/api";

export const getBranches = () => {
  return api.get("/branches/public/enabled");
};

export const createGRN = (data) => {
  return api.post("/receive-items/create", data);
};

export const searchProducts = (q) => {
  return api.get(`/products/search?q=${q}`);
};

export const getSuppliers = () => {
  return api.get("/suppliers");
};

export const getSupplierBalance = (id) => {
  return api.get(`/suppliers/${id}/balance`);
};

export const getGRNList = (params) => {
  return api.get("/receive-items/list", { params });
};
