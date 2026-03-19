import { useAuth }       from "../providers/auth-context.js";
import { RequireAuth }   from "./guards.jsx";
import RoleRedirect      from "./role-redirect.jsx";
import LoginRoute        from "../../features/login-route.jsx";

/**
 * AppRouter
 * Single-file router (no react-router-dom required).
 * Swap the conditional logic here for <Routes> when you add URL-based routing.
 */
export default function AppRouter() {
  const { login } = useAuth();

  return (
    <RequireAuth fallback={<LoginRoute onLogin={login} />}>
      <RoleRedirect />
    </RequireAuth>
  );
}
