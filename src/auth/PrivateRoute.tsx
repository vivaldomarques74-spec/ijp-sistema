import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

interface Props {
  children: React.ReactNode;
}

export default function PrivateRoute({ children }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ color: "#fff" }}>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
