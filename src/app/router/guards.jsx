import { useAuth } from "../providers/auth-context.js";

/**
*RequireAuth
*Renderiza los elementos hijos solo cuando un usuario ha iniciado sesión.
*En caso contrario, muestra el <fallback> proporcionado (normalmente LoginRoute).
 * @param {{ fallback: React.ReactNode, children: React.ReactNode }} props
 */
export function RequireAuth({ children, fallback }) {
  const { currentUser, loading } = useAuth();
  if (loading) return null; // avoid flash
  return currentUser ? children : fallback;
}

/**
* RequireRole
**Renderiza los elementos hijos solo cuando el usuario actual tiene uno de los roles permitidos.
**En caso contrario, muestra <fallback> (por ejemplo, una página de Acceso Denegado).
 *
 * @param {{ roles: string[], fallback?: React.ReactNode, children: React.ReactNode }} props
 */
export function RequireRole({ roles, children, fallback = null }) {
  const { currentUser } = useAuth();
  if (!currentUser || !roles.includes(currentUser.role)) return fallback;
  return children;
}
