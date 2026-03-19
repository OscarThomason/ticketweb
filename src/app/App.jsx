import { useEffect }        from "react";
import { QueryProvider }    from "./providers/query-provider.jsx";
import { AuthProvider }     from "./providers/AuthProvider.jsx";
import AppLayout            from "./layout/AppLayout.jsx";
import { seedData }         from "../services/seedData.js";
import { isBackendEnabled } from "../services/api/http-client.js";

/**
 * App
 * Root component — mounts providers and seeds demo data on first load.
 */
export default function App() {
  useEffect(() => {
    if (!isBackendEnabled()) {
      seedData(); // no-op if already seeded
    }
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </QueryProvider>
  );
}
