import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { db } from "../services/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import logo from "../assets/logo-ijp.png";

export default function Dashboard() {
  const { user } = useAuth();
  const [nome, setNome] = useState<string>("");
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [totalCursos, setTotalCursos] = useState(0);
  const [totalInscricoes, setTotalInscricoes] = useState(0);

  useEffect(() => {
    async function carregarUsuario() {
      if (!user) return;
      const ref = doc(db, "usuarios", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setNome(snap.data().nome);
    }
    async function carregarStats() {
      const alunos = await getDocs(collection(db, "alunos"));
      setTotalAlunos(alunos.size);
      const cursos = await getDocs(collection(db, "cursos"));
      setTotalCursos(cursos.size);
      const inscricoes = await getDocs(collection(db, "inscricoes"));
      setTotalInscricoes(inscricoes.size);
    }
    carregarUsuario();
    carregarStats();
  }, [user]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7a8f" }}>Alunos</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 28, color: "#1a2a4f" }}>{totalAlunos}</h2>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7a8f" }}>Cursos</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 28, color: "#1a2a4f" }}>{totalCursos}</h2>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7a8f" }}>Pré-inscrições</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 28, color: "#1a2a4f" }}>{totalInscricoes}</h2>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <h2 style={{ fontSize: 18, margin: "0 0 8px", color: "#1a2a4f" }}>Bem-vindo(a){nome ? `, ${nome}` : ""}</h2>
        <p style={{ fontSize: 14, color: "#6b7a8f", margin: 0 }}>
          “Tudo o que fizerem, façam de todo o coração, como para o Senhor.” – Colossenses 3:23
        </p>
        <img
          src={logo}
          alt="IJP"
          style={{ maxWidth: 160, marginTop: 16, opacity: 0.6 }}
        />
      </div>
    </div>
  );
}