import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

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

  const token =
    auth?.token ||
    auth?.accessToken ||
    auth?.authToken ||
    getStoredToken();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
