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
    const q = query(collection(db, "inscricoes"), where("status", "==", "pendente"));
    const snap = await getDocs(q);
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setInscricoes(lista);

    const cursosSnap = await getDocs(collection(db, "cursos"));
    const cursosData = cursosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setCursos(cursosData);

    const turmasMap: Record<string, any[]> = {};
    for (const curso of cursosData) {
      const turmasSnap = await getDocs(collection(db, "cursos", curso.id, "turmas"));
      turmasMap[curso.id] = turmasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    setTurmas(turmasMap);
    setCarregando(false);
  };

  const aprovar = async (inscricao: any, turmaId: string) => {
    if (!turmaId) return alert("Selecione uma turma");

    const turma = turmas[inscricao.cursoId]?.find(t => t.id === turmaId);
    if (!turma) return alert("Turma não encontrada");

    if (turma.vagasDisponiveis <= 0) {
      alert("Esta turma não tem vagas disponíveis.");
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const refInscricao = doc(db, "inscricoes", inscricao.id);
        transaction.update(refInscricao, {
          status: "aprovado",
          aprovadoEm: Timestamp.now(),
          turmaId: turmaId,
        });

        const contadorRef = doc(db, "contadores", "matricula");
        const snap = await transaction.get(contadorRef);
        const novoNumero = (snap.data()?.valor || 0) + 1;
        transaction.update(contadorRef, { valor: novoNumero });
        const matricula = `IJP-${String(novoNumero).padStart(5, "0")}`;

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

        const turmaRef = doc(db, "cursos", inscricao.cursoId, "turmas", turmaId);
        transaction.update(turmaRef, {
          vagasDisponiveis: turma.vagasDisponiveis - 1,
          alunos: [...(turma.alunos || []), alunoRef.id],
        });
      });
      alert("Inscrição aprovada e aluno criado!");
      carregarDados();
    } catch (error: any) {
      console.error(error);
      alert(`Erro ao aprovar: ${error.message}`);
    }
  };

  const rejeitar = async (id: string) => {
    if (window.confirm("Rejeitar esta inscrição?")) {
      await updateDoc(doc(db, "inscricoes", id), { status: "rejeitado" });
      carregarDados();
    }
  };

  if (carregando) return <div>Carregando...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Pré-inscrições</h1>
      {inscricoes.length === 0 && <p>Nenhuma inscrição pendente.</p>}
      {inscricoes.map(ins => (
        <div key={ins.id} style={{ border: "1px solid #ddd", padding: 16, marginBottom: 16, borderRadius: 8 }}>
          <p><strong>Nome:</strong> {ins.nomeCompleto}</p>
          <p><strong>CPF:</strong> {ins.cpf}</p>
          <p><strong>Email:</strong> {ins.email}</p>
          <p><strong>Telefone:</strong> {ins.telefone}</p>
          <p><strong>Curso:</strong> {cursos.find(c => c.id === ins.cursoId)?.nome || "N/A"}</p>
          <div style={{ marginTop: 12 }}>
            <select
              onChange={(e) => {
                const btn = document.getElementById(`btn-aprovar-${ins.id}`);
                if (btn) btn.dataset.turmaId = e.target.value;
              }}
              style={{ marginRight: 8, padding: 4 }}
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
              style={{ background: "#28a745", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 4, marginRight: 8 }}
            >
              Aprovar
            </button>
            <button onClick={() => rejeitar(ins.id)} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 4 }}>
              Rejeitar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}