import { useAuth } from "../providers/auth-context.js";
import UserDashboard       from "../../features/tickets/components/pages/UserDashboard.jsx";
import SupervisorDashboard from "../../features/tickets/components/pages/SupervisorDashboard.jsx";
import SupportDashboard    from "../../features/tickets/components/pages/SupportDashboard.jsx";

const DASHBOARD_MAP = {
  user:       UserDashboard,
  supervisor: SupervisorDashboard,
  support:    SupportDashboard,
};

/**
 * RoleRedirect
 * Renders the correct dashboard based on the logged-in user's role.
 * Add new roles here without touching any other file.
 */
export default function RoleRedirect() {
  const { currentUser } = useAuth();
  const Dashboard = DASHBOARD_MAP[currentUser?.role];
  if (!Dashboard) return <p style={{ color: "#ef4444", padding: 32 }}>Rol no reconocido: {currentUser?.role}</p>;
  return <Dashboard />;
}
