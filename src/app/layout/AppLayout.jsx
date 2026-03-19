import { useAuth }   from "../providers/auth-context.js";
import AppShell      from "./app-shell.jsx";
import AppRouter     from "../router/app-router.jsx";

/**
 * AppLayout
 * If the user is authenticated → wrap content in AppShell (sidebar layout).
 * If not → AppRouter renders the LoginRoute without any shell.
 */
export default function AppLayout() {
  const { currentUser, loading } = useAuth();

  if (loading) return null;

  if (!currentUser) {
    // Not logged in — render router directly (it will show LoginRoute)
    return <AppRouter />;
  }

  return (
    <AppShell>
      <AppRouter />
    </AppShell>
  );
}
