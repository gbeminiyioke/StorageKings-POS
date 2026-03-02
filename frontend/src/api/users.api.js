import api from "./api";

export const getUsers = () => api.get("/users");
export const createUser = (data) => api.post("/users", data);
export const updateUser = (id, data) => api.put(`/users/${id}`);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const getRoles = () => api.get("/roles?enable=true");
export const getBranches = () => api.get("/branches?enable=true");
