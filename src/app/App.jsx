import { useEffect, useState } from "react";
import { QueryProvider } from "./providers/query-provider.jsx";
import { AuthProvider } from "./providers/AuthProvider.jsx";
import AppLayout from "./layout/AppLayout.jsx";
import { seedData } from "../services/seedData.js";
import { isBackendEnabled } from "../services/api/http-client.js";
import FirstLoadSplash from "./components/FirstLoadSplash.jsx";

const FIRST_LOAD_KEY = "ticketflow:first-load-complete:v2";

function shouldShowSplashOnBoot() {
  if (typeof window === "undefined") return false;

  try {
    return !window.localStorage.getItem(FIRST_LOAD_KEY);
  } catch {
    return false;
  }
}

/**
 * App
 * Root component — mounts providers and seeds demo data on first load.
 */
export default function App() {
  const [showFirstLoadSplash, setShowFirstLoadSplash] = useState(shouldShowSplashOnBoot);

  useEffect(() => {
    if (!isBackendEnabled()) {
      seedData(); // no-op if already seeded
    }
  }, []);

  useEffect(() => {
    if (!showFirstLoadSplash) return undefined;

    const timer = window.setTimeout(() => {
      setShowFirstLoadSplash(false);
      try {
        window.localStorage.setItem(FIRST_LOAD_KEY, "1");
      } catch {
        // Ignore storage failures and continue app bootstrap.
      }
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [showFirstLoadSplash]);

  if (showFirstLoadSplash) {
    return <FirstLoadSplash />;
  }

  return (
    <QueryProvider>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </QueryProvider>
  );
}
