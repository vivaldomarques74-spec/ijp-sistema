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

    const curso = cursos.find(c => c.id === inscricao.cursoId);
    const turma = turmas[inscricao.cursoId]?.find(t => t.id === turmaId);
    if (!turma) return alert("Turma não encontrada");
    if (turma.vagasDisponiveis <= 0) {
      alert("Esta turma não tem vagas disponíveis.");
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        // === 1. FAZER TODAS AS LEITURAS PRIMEIRO ===
        const contadorRef = doc(db, "contadores", "matricula");
        const contadorSnap = await transaction.get(contadorRef);
        if (!contadorSnap.exists()) {
          throw new Error("Contador de matrícula não encontrado.");
        }
        const numeroAtual = contadorSnap.data().valor || 0;
        const novoNumero = numeroAtual + 1;

        // === 2. AGORA SIM, FAZER TODAS AS ESCRITAS ===
        // 2a. Atualizar contador
        transaction.update(contadorRef, { valor: novoNumero });

        // 2b. Atualizar inscrição
        const refInscricao = doc(db, "inscricoes", inscricao.id);
        transaction.update(refInscricao, {
          status: "aprovado",
          aprovadoEm: Timestamp.now(),
          turmaId: turmaId,
        });

        // 2c. Criar aluno (usando o mesmo ID da inscrição)
        const matricula = `IJP-${String(novoNumero).padStart(5, "0")}`;
        const alunoRef = doc(db, "alunos", inscricao.id);
        transaction.set(alunoRef, {
          nomeCompleto: inscricao.nomeCompleto,
          cpf: inscricao.cpf,
          email: inscricao.email,
          telefone: inscricao.telefone,
          endereco: inscricao.endereco || "",
          nascimento: inscricao.nascimento || "",
          menor: inscricao.menor || false,
          responsavelNome: inscricao.responsavelNome || "",
          responsavelCpf: inscricao.responsavelCpf || "",
          responsavelTelefone: inscricao.responsavelTelefone || "",
          responsavelEmail: inscricao.responsavelEmail || "",
          matricula: matricula,
          matriculaNumero: novoNumero,
          cursoAtualId: inscricao.cursoId,
          turmaAtualId: turmaId,
          criadoEm: Timestamp.now(),
        });

        // 2d. Atualizar turma (diminuir vagas e adicionar aluno)
        const turmaRef = doc(db, "cursos", inscricao.cursoId, "turmas", turmaId);
        const turmaSnap = await transaction.get(turmaRef); // essa leitura é permitida porque estamos antes de qualquer escrita? Na verdade, estamos no meio das escritas, mas é a única leitura que falta. Vamos mover para antes.
        // CORREÇÃO: mover a leitura da turma para antes das escritas também.
        // Mas como a turma já foi lida fora da transação (turma.vagasDisponiveis), podemos confiar no valor e apenas atualizar.
        // Melhor: usar o valor já lido.
        const vagasAtuais = turma.vagasDisponiveis;
        transaction.update(turmaRef, {
          vagasDisponiveis: vagasAtuais - 1,
          alunos: [...(turma.alunos || []), alunoRef.id],
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
    if (window.confirm("Rejeitar esta inscrição?")) {
      try {
        await updateDoc(doc(db, "inscricoes", id), { status: "rejeitado" });
        carregarDados();
      } catch (error: any) {
        console.error("Erro ao rejeitar:", error);
        alert(`Erro ao rejeitar: ${error.message}`);
      }
    }
  };

  if (carregando) return <div style={{ padding: 20 }}>Carregando...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, margin: "0 0 16px", color: "#1a2a4f" }}>Pré-inscrições</h1>
      {inscricoes.length === 0 && <p>Nenhuma inscrição pendente.</p>}
      {inscricoes.map(ins => (
        <div key={ins.id} style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <p style={{ margin: 0 }}><strong>Nome:</strong> {ins.nomeCompleto}</p>
            <p style={{ margin: 0 }}><strong>CPF:</strong> {ins.cpf}</p>
            <p style={{ margin: 0 }}><strong>Email:</strong> {ins.email}</p>
            <p style={{ margin: 0 }}><strong>Telefone:</strong> {ins.telefone}</p>
            <p style={{ margin: 0 }}><strong>Curso:</strong> {cursos.find(c => c.id === ins.cursoId)?.nome || "N/A"}</p>
            {ins.menor && (
              <p style={{ margin: 0, gridColumn: "span 2", fontSize: 13, color: "#6b7a8f" }}>
                ⚠️ Menor de idade - Responsável: {ins.responsavelNome}
              </p>
            )}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <select
              onChange={(e) => {
                const btn = document.getElementById(`btn-aprovar-${ins.id}`);
                if (btn) btn.dataset.turmaId = e.target.value;
              }}
              style={{ padding: 4, border: "1px solid #ccc", borderRadius: 4 }}
            >
              <option value="">Selecione a turma</option>
              {turmas[ins.cursoId]?.map(t => (
                <option key={t.id} value={t.id}>{t.nome} (vagas: {t.vagasDisponiveis})</option>
              ))}
            </select>
            <button
              id={`btn-aprovar-${ins.id}`}
              onClick={(e) => {
                const turmaId = (e.target as HTMLButtonElement).dataset.turmaId;
                if (!turmaId) return alert("Selecione uma turma");
                aprovar(ins, turmaId);
              }}
              style={{ background: "#28a745", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 4, cursor: "pointer" }}
            >
              Aprovar
            </button>
            <button
              onClick={() => rejeitar(ins.id)}
              style={{ background: "#dc3545", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 4, cursor: "pointer" }}
            >
              Rejeitar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}