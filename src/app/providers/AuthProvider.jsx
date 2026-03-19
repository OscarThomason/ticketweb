import { useState } from "react";
import { usersRepository } from "../../services/tickets/users/users.repository.local.js";
import { authApi } from "../../services/auth/auth.api.js";
import {
  clearAuthToken,
  isBackendEnabled,
  setAuthToken,
} from "../../services/api/http-client.js";
import { AuthContext } from "./auth-context.js";

const SESSION_USER_KEY = "ts_session_user";
const SESSION_ID_KEY = "ts_session";
const PERSIST_KEY = "ts_session_persist";

function hashPassword(password) {
  let hash = 0;
  for (const char of password) {
    hash = (Math.imul(31, hash) + char.charCodeAt(0)) | 0;
  }
  return String(hash);
}

function normalizeLocalUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    teamId: user.teamId || null,
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const isPersistent = localStorage.getItem(PERSIST_KEY) === "1";
    const storage = isPersistent ? localStorage : sessionStorage;

    if (isBackendEnabled()) {
      const raw = storage.getItem(SESSION_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    }

    const savedId = storage.getItem(SESSION_ID_KEY);
    return savedId ? normalizeLocalUser(usersRepository.getById(savedId)) : null;
  });

  const login = async (userOrCredentials, remember = false) => {
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;

    if (isBackendEnabled()) {
      const credentials =
        userOrCredentials && userOrCredentials.id
          ? null
          : userOrCredentials;

      if (!credentials?.email || !credentials?.password) {
        throw new Error("Credenciales invalidas");
      }

      const { token, user } = await authApi.login(credentials);
      setCurrentUser(user);
      storage.setItem(SESSION_USER_KEY, JSON.stringify(user));
      localStorage.setItem(PERSIST_KEY, remember ? "1" : "0");
      otherStorage.removeItem(SESSION_USER_KEY);
      setAuthToken(token, remember);
      return user;
    }

    const credentials =
      userOrCredentials && userOrCredentials.id
        ? null
        : userOrCredentials;

    const user = userOrCredentials?.id
      ? normalizeLocalUser(userOrCredentials)
      : (() => {
          const found = usersRepository
            .getAll()
            .find((item) => item.email === credentials.email.trim().toLowerCase());
          if (!found) return null;
          if (found.password !== hashPassword(credentials.password)) return null;
          return normalizeLocalUser(found);
        })();

    if (!user) throw new Error("Credenciales invalidas");

    setCurrentUser(user);
    storage.setItem(SESSION_ID_KEY, user.id);
    localStorage.setItem(PERSIST_KEY, remember ? "1" : "0");
    otherStorage.removeItem(SESSION_ID_KEY);
    return user;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(SESSION_USER_KEY);
    localStorage.removeItem(PERSIST_KEY);
    sessionStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
    clearAuthToken();
  };

  const loading = false;

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

