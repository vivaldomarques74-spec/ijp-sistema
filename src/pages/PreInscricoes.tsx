import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";

export default function PreInscricoes() {
  const [inscricoes, setInscricoes] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<Record<string, any[]>>({});
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      // Buscar inscrições pendentes
      const q = query(collection(db, "inscricoes"), where("status", "==", "pendente"));
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInscricoes(lista);

      // Buscar cursos
      const cursosSnap = await getDocs(collection(db, "cursos"));
      const cursosData = cursosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCursos(cursosData);

      // Buscar turmas de cada curso
      const turmasMap: Record<string, any[]> = {};
      for (const curso of cursosData) {
        const turmasSnap = await getDocs(collection(db, "cursos", curso.id, "turmas"));
        turmasMap[curso.id] = turmasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setTurmas(turmasMap);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setCarregando(false);
    }
  };

  const aprovar = async (inscricao: any, turmaId: string) => {
    if (!turmaId) return alert("Selecione uma turma");

    const turma = turmas[inscricao.cursoId]?.find((t: any) => t.id === turmaId);
    if (!turma) return alert("Turma não encontrada");

    if (turma.vagasDisponiveis <= 0) {
      alert("Esta turma não tem vagas disponíveis.");
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        // 1. LER a turma (read)
        const turmaRef = doc(db, "cursos", inscricao.cursoId, "turmas", turmaId);
        const turmaSnap = await transaction.get(turmaRef);
        if (!turmaSnap.exists()) throw new Error("Turma não existe");
        const turmaData = turmaSnap.data();
        if (turmaData.vagasDisponiveis <= 0) throw new Error("Sem vagas");

        // 2. LER o contador (read)
        const contadorRef = doc(db, "contadores", "matricula");
        const contadorSnap = await transaction.get(contadorRef);
        if (!contadorSnap.exists()) throw new Error("Contador não encontrado");
        const novoNumero = (contadorSnap.data()?.valor || 0) + 1;

        // 3. AGORA escrever (write) – após todas as leituras
        // Atualizar contador
        transaction.update(contadorRef, { valor: novoNumero });

        // Gerar matrícula
        const matricula = `IJP-${String(novoNumero).padStart(5, "0")}`;

        // Criar aluno
        const alunoRef = doc(db, "alunos", inscricao.id);
        transaction.set(alunoRef, {
          nomeCompleto: inscricao.nomeCompleto,
          cpf: inscricao.cpf,
          email: inscricao.email,
          telefone: inscricao.telefone,
          endereco: inscricao.endereco || "",
          nascimento: inscricao.nascimento || "",
          matricula,
          matriculaNumero: novoNumero,
          cursoAtualId: inscricao.cursoId,
          turmaAtualId: turmaId,
          criadoEm: Timestamp.now(),
        });

        // Atualizar turma: vagas e alunos
        const alunosAtuais = turmaData.alunos || [];
        transaction.update(turmaRef, {
          vagasDisponiveis: turmaData.vagasDisponiveis - 1,
          alunos: [...alunosAtuais, alunoRef.id],
        });

        // Atualizar inscrição
        const inscricaoRef = doc(db, "inscricoes", inscricao.id);
        transaction.update(inscricaoRef, {
          status: "aprovado",
          aprovadoEm: Timestamp.now(),
          turmaId,
          matricula,
        });
      });

      alert("Inscrição aprovada e aluno criado!");
      carregarDados();
    } catch (error: any) {
      console.error("Erro ao aprovar:", error);
      alert(`Erro ao aprovar: ${error.message}`);
    }
  };

  const rejeitar = async (id: string) => {
    if (!window.confirm("Rejeitar esta inscrição?")) return;
    try {
      await updateDoc(doc(db, "inscricoes", id), { status: "rejeitado" });
      carregarDados();
    } catch (error) {
      console.error(error);
      alert("Erro ao rejeitar inscrição.");
    }
  };

  if (carregando) return <div style={{ padding: 20 }}>Carregando...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, margin: "0 0 20px", color: "#1a2a4f" }}>Pré-inscrições</h1>
      {inscricoes.length === 0 && <p>Nenhuma inscrição pendente.</p>}
      {inscricoes.map((ins) => (
        <div
          key={ins.id}
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #e0e4e8",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <p><strong>Nome:</strong> {ins.nomeCompleto}</p>
              <p><strong>CPF:</strong> {ins.cpf}</p>
              <p><strong>Email:</strong> {ins.email}</p>
              <p><strong>Telefone:</strong> {ins.telefone}</p>
              <p><strong>Curso:</strong> {cursos.find((c) => c.id === ins.cursoId)?.nome || "N/A"}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
              <select
                onChange={(e) => {
                  // Guardar seleção no dataset do botão
                  const btn = document.getElementById(`btn-aprovar-${ins.id}`);
                  if (btn) btn.dataset.turmaId = e.target.value;
                }}
                style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
              >
                <option value="">Selecione a turma</option>
                {turmas[ins.cursoId]?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} (vagas: {t.vagasDisponiveis})
                  </option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  id={`btn-aprovar-${ins.id}`}
                  onClick={(e) => {
                    const turmaId = (e.target as HTMLButtonElement).dataset.turmaId;
                    if (!turmaId) return alert("Selecione uma turma");
                    aprovar(ins, turmaId);
                  }}
                  style={{
                    background: "#28a745",
                    color: "#fff",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Aprovar
                </button>
                <button
                  onClick={() => rejeitar(ins.id)}
                  style={{
                    background: "#dc3545",
                    color: "#fff",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Rejeitar
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}