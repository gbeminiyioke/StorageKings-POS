import api from "../api/api";

/* ======================================================
   CUSTOMER SEARCH
====================================================== */
export const searchCustomers = (query) => {
  return api.get("/storage/customers", {
    params: {
      q: query,
    },
  });
};

/* ======================================================
   BRANCHES / STORAGE SPACES
====================================================== */
export const getUserBranches = () => {
  return api.get("/storage/branches");
};

export const getStorageSpaces = () => {
  return api.get("/storage/spaces");
};

/* ======================================================
   PRODUCTS
====================================================== */
export const searchProducts = (query) => {
  return api.get("/storage/products/search", {
    params: {
      q: query,
    },
  });
};

export const searchProductByBarcode = (barcode) => {
  return api.get(`/storage/products/barcode/${encodeURIComponent(barcode)}`);
};

/* ======================================================
   STORAGE NUMBER
====================================================== */
export const getNextStorageNo = (branchId) => {
  return api.get(`/storage/next-number/${branchId}`);
};

/* ======================================================
   CREATE / UPDATE STORAGE
====================================================== */
//export const createStorage = (payload) => {
//  return api.post("/storage", payload);
//};
export const createStorage = (payload) => {
  const formData = new FormData();

  formData.append("customer_id", payload.customer_id || "");
  formData.append("branch_id", payload.branch_id || "");
  formData.append(
    "storage_space_product_id",
    payload.storage_space_product_id || "",
  );
  formData.append("received_date", payload.received_date || "");
  formData.append("received_notes", payload.received_notes || "");
  formData.append("staff_signature", payload.staff_signature || "");
  formData.append("customer_signature", payload.customer_signature || "");
  formData.append("preprinted", payload.preprinted ? "true" : "false");

  formData.append("items", JSON.stringify(payload.items || []));

  if (payload.attachment) {
    formData.append("attachment", payload.attachment);
  }

  return api.post("/storage", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

/* ======================================================
   RECENT STORAGE LIST
====================================================== */
export const getRecentStorages = () => {
  return api.get("/storage/recent");
};

/* ======================================================
   STORAGE DETAILS
====================================================== */
export const getStorageDetails = (storageId) => {
  return api.get(`/storage/${storageId}`);
};

export const getStorageItems = (storageId) => {
  return api.get(`/storage/${storageId}/items`);
};

/* ======================================================
   CONFIRM PRE-PRINTED BARCODE
====================================================== */
export const confirmStorageBarcode = (storageId, barcode) => {
  return api.post(`/storage/${storageId}/confirm-barcode`, {
    barcode,
  });
};

/* ======================================================
   STORAGE PDF / EMAIL
====================================================== */
export const emailStoragePdf = (storageId) => {
  return api.post(`/storage/${storageId}/email`);
};

export const getStoragePdfUrl = (storageId) => {
  const token = localStorage.getItem("token");

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  return `${apiBase}/storage/${storageId}/pdf?token=${encodeURIComponent(
    token || "",
  )}`;
};
