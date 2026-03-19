import LoginScreen from "./auth/LoginScreen.jsx";

/**
 * login-route.jsx
 * Thin wrapper so the router can import a single component for the "/" path.
 */
export default function LoginRoute({ onLogin }) {
  return <LoginScreen onLogin={onLogin} />;
}
