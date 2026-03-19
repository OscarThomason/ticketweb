import { apiRequest } from "../api/http-client.js";

export const authApi = {
  login: async ({ email, password }) =>
    apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: async () => apiRequest("/api/auth/me"),
};

