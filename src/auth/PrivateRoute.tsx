import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const codigo = localStorage.getItem("authCodigo");
  if (!codigo) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}