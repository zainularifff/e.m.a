import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import {
  canAccessRoute,
  cleanPath,
  extractUser,
  getDefaultRouteForUser,
  getStoredAccessUser,
  PUBLIC_AUTH_PATHS,
  saveAccessUser,
} from "./accessControl";

type ProtectedRouteProps = {
  children: ReactNode;
};

function getStoredToken() {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("ema-access-token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("ema-access-token") ||
    sessionStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const auth = useAuth() as any;
  const path = cleanPath(location.pathname);

  const token = auth?.token || auth?.accessToken || auth?.authToken || getStoredToken();

  if (!token && !PUBLIC_AUTH_PATHS.includes(path)) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const user = extractUser(auth) || getStoredAccessUser();

  if (user) saveAccessUser(user);

  if (token && path !== "/" && !PUBLIC_AUTH_PATHS.includes(path) && !canAccessRoute(user, path)) {
    const landing = getDefaultRouteForUser(user);
    return <Navigate to={landing || "/login"} replace />;
  }

  return <>{children}</>;
}
