import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import logo from "../assets/logo-ijp.png";

export default function Dashboard() {
  const { user } = useAuth();
  const [nome, setNome] = useState<string>("");

  useEffect(() => {
    async function carregarUsuario() {
      if (!user) return;

      const ref = doc(db, "usuarios", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setNome(snap.data().nome);
      }
    }

    carregarUsuario();
  }, [user]);

  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
      }}
    >
      {/* COLUNA ESQUERDA — LOGO */}
      <div style={{ flex: 1, textAlign: "center" }}>
        <img
          src={logo}
          alt="Instituto Jovens Periféricos"
          style={{ maxWidth: 380, width: "100%" }}
        />
      </div>

      {/* COLUNA DIREITA — TEXTO */}
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 36, marginBottom: 16 }}>
          Instituto Jovens Periféricos
        </h1>

        <h2 style={{ fontSize: 24, marginBottom: 32 }}>
          Bem-vindo(a){nome ? `, ${nome}` : ""}
        </h2>

        <p style={{ fontStyle: "italic", fontSize: 18 }}>
          “Tudo o que fizerem, façam de todo o coração, como para o Senhor.”
        </p>

        <p style={{ marginTop: 8, fontWeight: "bold" }}>
          Colossenses 3:23
        </p>
      </div>
    </div>
  );
}
