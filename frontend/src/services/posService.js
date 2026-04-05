import api from "../api/api";

/* ===============================
   POS API BASE
================================ */
const POS_BASE = "/pos";

/* ===============================
   GENERATE DOC NUMBER
================================ */
export const generateNumber = async (type) => {
  const res = await api.get(`${POS_BASE}/generate-number/${type}`);
  return res.data;
};

/* ===============================
   COMPLETE SALE
================================ */
export const completeSale = async (payload) => {
  const res = await api.post(`${POS_BASE}/complete-sale`, payload);
  return res.data;
};
