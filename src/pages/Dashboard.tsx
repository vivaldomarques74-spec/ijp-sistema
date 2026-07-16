import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import logo from "../assets/logo-ijp.png";

const VERSICULOS = [
  "“Tudo o que fizerem, façam de todo o coração, como para o Senhor.” – Colossenses 3:23",
  "“O Senhor é o meu pastor; nada me faltará.” – Salmos 23:1",
  "“Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.” – Provérbios 3:5",
  "“A alegria do Senhor é a nossa força.” – Neemias 8:10",
  "“O amor é paciente, o amor é bondoso.” – 1 Coríntios 13:4",
  "“Eis que faço novas todas as coisas.” – Apocalipse 21:5",
  "“Buscai primeiro o Reino de Deus.” – Mateus 6:33",
  "“O Senhor é bom para todos.” – Salmos 145:9",
  "“Em todas as coisas, dai graças.” – 1 Tessalonicenses 5:18",
  "“Não vos conformeis com este mundo.” – Romanos 12:2",
];

function getVersiculoDoDia(): string {
  const hoje = new Date();
  const dia = hoje.getDate();
  const mes = hoje.getMonth();
  const indice = (dia + mes * 31) % VERSICULOS.length;
  return VERSICULOS[indice] || VERSICULOS[0];
}

export default function Dashboard() {
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [totalCursos, setTotalCursos] = useState(0);
  const [cursosAtivos, setCursosAtivos] = useState(0);
  const [versiculo, setVersiculo] = useState("");

  useEffect(() => {
    async function carregarStats() {
      const alunosSnap = await getDocs(collection(db, "alunos"));
      setTotalAlunos(alunosSnap.size);

      const cursosSnap = await getDocs(collection(db, "cursos"));
      const cursosList = cursosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTotalCursos(cursosList.length);

      const hoje = new Date();
      const ativos = cursosList.filter((c: any) => {
        if (!c.dataFim) return true;
        const fim = c.dataFim.toDate ? c.dataFim.toDate() : new Date(c.dataFim);
        return fim >= hoje;
      });
      setCursosAtivos(ativos.length);

      setVersiculo(getVersiculoDoDia());
    }
    carregarStats();
  }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 24 }}>
        <img src={logo} alt="IJP" style={{ height: 80 }} />
        <div>
          <h1 style={{ fontSize: 28, margin: 0, color: "#1a2a4f" }}>Bem-vindo, equipe!</h1>
          <p style={{ fontSize: 16, color: "#6b7a8f", margin: "4px 0 0", fontStyle: "italic" }}>{versiculo}</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7a8f" }}>Alunos</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 28, color: "#1a2a4f" }}>{totalAlunos}</h2>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7a8f" }}>Cursos (total)</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 28, color: "#1a2a4f" }}>{totalCursos}</h2>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7a8f" }}>Cursos ativos</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 28, color: "#1a2a4f" }}>{cursosAtivos}</h2>
        </div>
      </div>
    </div>
  );
}