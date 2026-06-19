import api from "./api";

export const convertProforma = async (id) => {
  const res = await api.post(`/pos/proforma/${id}/convert`);

  return res.data;
};
