import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../services/firebase";

export default function Cursos() {
  const [cursos, setCursos] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    carregarCursos();
  }, []);

  const carregarCursos = async () => {
    const snap = await getDocs(collection(db, "cursos"));
    setCursos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const excluirCurso = async (cursoId: string, nome: string) => {
    if (!window.confirm(`Excluir o curso "${nome}"? Todas as turmas e matrículas serão removidas. Os alunos NÃO serão excluídos.`)) return;

    try {
      // 1. Buscar e excluir todas as turmas do curso
      const turmasSnap = await getDocs(collection(db, "cursos", cursoId, "turmas"));
      for (const turmaDoc of turmasSnap.docs) {
        await deleteDoc(turmaDoc.ref);
      }

      // 2. Excluir o curso
      await deleteDoc(doc(db, "cursos", cursoId));

      alert(`Curso "${nome}" excluído com sucesso.`);
      carregarCursos(); // atualiza lista
    } catch (error) {
      console.error(error);
      alert("Erro ao excluir curso. Verifique o console.");
    }
  };

  const buttonStyle = {
    background: "#0070f3",
    color: "#fff",
    border: "none",
    padding: "6px 16px",
    borderRadius: 8,
    cursor: "pointer",
    marginRight: 8,
  };
  const buttonDanger = {
    ...buttonStyle,
    background: "#dc3545",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: "#1a2a4f" }}>Cursos</h2>
        <button onClick={() => navigate("/cursos/novo")} style={buttonStyle}>
          + Novo Curso
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {cursos.map(c => (
          <div key={c.id} style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <h3 style={{ fontSize: 16, margin: 0, color: "#1a2a4f" }}>{c.nome}</h3>
            {c.descricao && <p style={{ fontSize: 13, color: "#6b7a8f", margin: "4px 0 8px" }}>{c.descricao}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => navigate(`/cursos/${c.id}`)} style={buttonStyle}>
                Ver detalhes
              </button>
              <button onClick={() => excluirCurso(c.id, c.nome)} style={buttonDanger}>
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
      {cursos.length === 0 && <p style={{ marginTop: 16 }}>Nenhum curso cadastrado.</p>}
    </div>
  );
}