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
  const [turmasMap, setTurmasMap] = useState<Record<string, any[]>>({});
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);
    const inscSnap = await getDocs(query(collection(db, "inscricoes"), where("status", "==", "pendente")));
    setInscricoes(inscSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const cursosSnap = await getDocs(collection(db, "cursos"));
    const cursosData = cursosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setCursos(cursosData);

    const map: Record<string, any[]> = {};
    for (const curso of cursosData) {
      const turmasSnap = await getDocs(collection(db, "cursos", curso.id, "turmas"));
      map[curso.id] = turmasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    setTurmasMap(map);
    setCarregando(false);
  };

  const aprovar = async (inscricao: any, turmaId: string) => {
    if (!turmaId) return alert("Selecione uma turma");
    const turma = turmasMap[inscricao.cursoId]?.find(t => t.id === turmaId);
    if (!turma) return alert("Turma não encontrada");
    if (turma.vagasDisponiveis <= 0) return alert("Turma sem vagas");

    try {
      await runTransaction(db, async (transaction) => {
        // 1. LER todos os documentos necessários primeiro
        const inscRef = doc(db, "inscricoes", inscricao.id);
        const contadorRef = doc(db, "contadores", "matricula");
        const turmaRef = doc(db, "cursos", inscricao.cursoId, "turmas", turmaId);

        const [inscSnap, contadorSnap, turmaSnap] = await Promise.all([
          transaction.get(inscRef),
          transaction.get(contadorRef),
          transaction.get(turmaRef),
        ]);

        if (!inscSnap.exists()) throw new Error("Inscrição não existe");
        if (!contadorSnap.exists()) throw new Error("Contador não existe");
        if (!turmaSnap.exists()) throw new Error("Turma não existe");

        const novoNumero = (contadorSnap.data()?.valor || 0) + 1;
        const matricula = `IJP-${String(novoNumero).padStart(5, "0")}`;
        const vagasDisponiveis = turmaSnap.data().vagasDisponiveis || 0;
        if (vagasDisponiveis <= 0) throw new Error("Vagas esgotadas");

        // 2. AGORA escrever (atualizações)
        transaction.update(inscRef, { status: "aprovado", aprovadoEm: Timestamp.now(), turmaId });
        transaction.update(contadorRef, { valor: novoNumero });

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
          servicosAtivos: [],
          cursos: [{ cursoId: inscricao.cursoId, turmaId: turmaId, data: Timestamp.now() }],
        });

        // Atualizar turma (diminuir vagas)
        const alunosAtuais = turmaSnap.data().alunos || [];
        transaction.update(turmaRef, {
          vagasDisponiveis: vagasDisponiveis - 1,
          alunos: [...alunosAtuais, alunoRef.id],
        });
      });
      alert("Aluno aprovado e matrícula gerada!");
      carregarDados();
    } catch (error: any) {
      alert("Erro ao aprovar: " + error.message);
    }
  };

  const rejeitar = async (id: string) => {
    if (window.confirm("Rejeitar esta inscrição?")) {
      await updateDoc(doc(db, "inscricoes", id), { status: "rejeitado" });
      carregarDados();
    }
  };

  if (carregando) return <div>Carregando...</div>;

  const buttonStyle = { padding: "4px 12px", border: "none", borderRadius: 4, cursor: "pointer", marginRight: 4 };

  return (
    <div>
      <h2 style={{ fontSize: 18, margin: "0 0 16px", color: "#1a2a4f" }}>Pré-inscrições</h2>
      {inscricoes.length === 0 && <p>Nenhuma inscrição pendente.</p>}
      {inscricoes.map(ins => (
        <div key={ins.id} style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            <p><strong>Nome:</strong> {ins.nomeCompleto}</p>
            <p><strong>CPF:</strong> {ins.cpf}</p>
            <p><strong>Email:</strong> {ins.email}</p>
            <p><strong>Telefone:</strong> {ins.telefone}</p>
            <p><strong>Curso:</strong> {cursos.find(c => c.id === ins.cursoId)?.nome || "N/A"}</p>
            <p><strong>Menor:</strong> {ins.menor ? "Sim" : "Não"}</p>
            {ins.menor && <p><strong>Responsável:</strong> {ins.responsavelNome}</p>}
          </div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <select
              onChange={(e) => {
                const btn = document.getElementById(`btn-aprovar-${ins.id}`);
                if (btn) (btn as HTMLButtonElement).dataset.turmaId = e.target.value;
              }}
              style={{ padding: 6, border: "1px solid #ccc", borderRadius: 4 }}
            >
              <option value="">Selecione a turma</option>
              {turmasMap[ins.cursoId]?.map(t => (
                <option key={t.id} value={t.id}>{t.nome} (vagas: {t.vagasDisponiveis})</option>
              ))}
            </select>
            <button
              id={`btn-aprovar-${ins.id}`}
              onClick={(e) => {
                const btn = e.target as HTMLButtonElement;
                const turmaId = btn.dataset.turmaId;
                if (!turmaId) return alert("Selecione uma turma");
                aprovar(ins, turmaId);
              }}
              style={{ ...buttonStyle, background: "#28a745", color: "#fff" }}
            >
              Aprovar
            </button>
            <button onClick={() => rejeitar(ins.id)} style={{ ...buttonStyle, background: "#dc3545", color: "#fff" }}>
              Rejeitar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}