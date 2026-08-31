import { useState } from "react";
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";

interface Vinculo {
  id: string;
  tipo: "fila" | "agendamento";
  data: any;
  profissionalId?: string;
  status?: string;
}

interface Aluno {
  id: string;
  nomeCompleto: string;
  matricula: string;
  [key: string]: any;
}

export default function AdminRemoverVinculo() {
  const [busca, setBusca] = useState("");
  const [alunoEncontrado, setAlunoEncontrado] = useState<Aluno | null>(null);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const buscarAluno = async () => {
    if (!busca.trim()) return alert("Digite o nome ou ID do aluno");
    setCarregando(true);
    setMensagem("");
    setAlunoEncontrado(null);
    setVinculos([]);

    try {
      const alunosRef = collection(db, "alunos");
      // Tenta busca exata
      let q = query(alunosRef, where("nomeCompleto", "==", busca));
      let snap = await getDocs(q);

      // Se não encontrar, tenta busca por prefixo (startsWith)
      if (snap.empty) {
        q = query(
          alunosRef,
          where("nomeCompleto", ">=", busca),
          where("nomeCompleto", "<=", busca + "\uf8ff")
        );
        snap = await getDocs(q);
      }

      if (snap.empty) {
        setMensagem("Aluno não encontrado.");
        setCarregando(false);
        return;
      }

      // Pega o primeiro resultado
      const docSnap = snap.docs[0];
      const data = docSnap.data();
      const alunoData: Aluno = {
        id: docSnap.id,
        nomeCompleto: data.nomeCompleto || "",
        matricula: data.matricula || "",
        ...data,
      };
      setAlunoEncontrado(alunoData);
      await buscarVinculos(docSnap.id);

      if (snap.size > 1) {
        setMensagem(`Encontrados ${snap.size} alunos. Exibindo o primeiro: ${alunoData.nomeCompleto}`);
      }
    } catch (error: any) {
      setMensagem(`Erro: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const buscarVinculos = async (alunoId: string) => {
    try {
      const vinculosLista: Vinculo[] = [];

      // Buscar na fila
      const filaQuery = query(collection(db, "filaEspera"), where("alunoId", "==", alunoId));
      const filaSnap = await getDocs(filaQuery);
      filaSnap.forEach(d => {
        vinculosLista.push({
          id: d.id,
          tipo: "fila",
          data: d.data(),
          profissionalId: d.data().profissionalId,
          status: d.data().status,
        });
      });

      // Buscar em agendamentos
      const agendQuery = query(collection(db, "agendamentos"), where("alunoId", "==", alunoId));
      const agendSnap = await getDocs(agendQuery);
      agendSnap.forEach(d => {
        vinculosLista.push({
          id: d.id,
          tipo: "agendamento",
          data: d.data(),
          profissionalId: d.data().profissionalId,
          status: d.data().status,
        });
      });

      setVinculos(vinculosLista);
      if (vinculosLista.length === 0) {
        setMensagem("Nenhum vínculo encontrado para este aluno.");
      } else {
        setMensagem(`Encontrados ${vinculosLista.length} vínculos.`);
      }
    } catch (error: any) {
      setMensagem(`Erro ao buscar vínculos: ${error.message}`);
    }
  };

  const removerVinculo = async (id: string, tipo: "fila" | "agendamento") => {
    if (!confirm(`Remover este vínculo da ${tipo}?`)) return;
    try {
      const collectionName = tipo === "fila" ? "filaEspera" : "agendamentos";
      await deleteDoc(doc(db, collectionName, id));
      setVinculos(prev => prev.filter(v => v.id !== id));
      setMensagem("Vínculo removido com sucesso!");
    } catch (error: any) {
      setMensagem(`Erro ao remover: ${error.message}`);
    }
  };

  const removerTodosVinculos = async () => {
    if (!confirm(`Remover TODOS os ${vinculos.length} vínculos?`)) return;
    try {
      for (const v of vinculos) {
        const collectionName = v.tipo === "fila" ? "filaEspera" : "agendamentos";
        await deleteDoc(doc(db, collectionName, v.id));
      }
      setVinculos([]);
      setMensagem("Todos os vínculos removidos!");
    } catch (error: any) {
      setMensagem(`Erro ao remover todos: ${error.message}`);
    }
  };

  const styleButton = (bg: string, color = "#fff") => ({
    padding: "6px 16px",
    border: "none",
    borderRadius: 4,
    background: bg,
    color,
    cursor: "pointer",
  });

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ color: "#1a2a4f" }}>Remover Vínculos de Alunos</h1>
      <p style={{ color: "#6b7a8f" }}>
        Ferramenta para remover vínculos de alunos que estão presos em fila ou agendamentos.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Nome completo ou ID do aluno"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
        />
        <button onClick={buscarAluno} disabled={carregando} style={styleButton("#0070f3")}>
          {carregando ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {alunoEncontrado && (
        <div style={{ background: "#e9ecef", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <strong>Aluno encontrado:</strong> {alunoEncontrado.nomeCompleto} (ID: {alunoEncontrado.id})
          <br />
          <strong>Matrícula:</strong> {alunoEncontrado.matricula}
        </div>
      )}

      {mensagem && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            background: mensagem.includes("Erro") ? "#f8d7da" : "#d4edda",
            border: `1px solid ${mensagem.includes("Erro") ? "#f5c6cb" : "#c3e6cb"}`,
            color: mensagem.includes("Erro") ? "#721c24" : "#155724",
          }}
        >
          {mensagem}
        </div>
      )}

      {vinculos.length > 0 && (
        <>
          <div style={{ marginBottom: 12 }}>
            <button onClick={removerTodosVinculos} style={styleButton("#dc3545")}>
              Remover todos os {vinculos.length} vínculos
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                  <th style={{ padding: 12, textAlign: "left" }}>Tipo</th>
                  <th style={{ padding: 12, textAlign: "left" }}>Profissional ID</th>
                  <th style={{ padding: 12, textAlign: "left" }}>Status</th>
                  <th style={{ padding: 12, textAlign: "left" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {vinculos.map(v => (
                  <tr key={v.id} style={{ borderBottom: "1px solid #dee2e6" }}>
                    <td style={{ padding: 12 }}>{v.tipo}</td>
                    <td style={{ padding: 12 }}>{v.profissionalId || "Não definido"}</td>
                    <td style={{ padding: 12 }}>{v.status || "—"}</td>
                    <td style={{ padding: 12 }}>
                      <button onClick={() => removerVinculo(v.id, v.tipo)} style={styleButton("#dc3545")}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}