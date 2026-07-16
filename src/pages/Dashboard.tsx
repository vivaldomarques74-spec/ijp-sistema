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
      {/* Cabeçalho principal: logo grande + versículo */}
      <div style={{ display: "flex", alignItems: "center", gap: 40, marginBottom: 40, padding: "16px 0" }}>
        <img src={logo} alt="IJP" style={{ height: 140, flexShrink: 0 }} />
        <div>
          <h1 style={{ fontSize: 36, margin: 0, color: "#1a2a4f" }}>Bem-vindo, equipe!</h1>
          <p style={{ fontSize: 22, color: "#6b7a8f", margin: "8px 0 0", fontStyle: "italic", maxWidth: 600 }}>
            {versiculo}
          </p>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #1a2a4f 0%, #2a4a7f 100%)", borderRadius: 16, padding: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", color: "#fff" }}>
          <p style={{ margin: 0, fontSize: 16, opacity: 0.8 }}>Alunos</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 36, fontWeight: 700 }}>{totalAlunos}</h2>
        </div>
        <div style={{ background: "linear-gradient(135deg, #28a745 0%, #34ce57 100%)", borderRadius: 16, padding: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", color: "#fff" }}>
          <p style={{ margin: 0, fontSize: 16, opacity: 0.8 }}>Cursos (total)</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 36, fontWeight: 700 }}>{totalCursos}</h2>
        </div>
        <div style={{ background: "linear-gradient(135deg, #17a2b8 0%, #20c997 100%)", borderRadius: 16, padding: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", color: "#fff" }}>
          <p style={{ margin: 0, fontSize: 16, opacity: 0.8 }}>Cursos ativos</p>
          <h2 style={{ margin: "8px 0 0", fontSize: 36, fontWeight: 700 }}>{cursosAtivos}</h2>
        </div>
      </div>
    </div>
  );
}