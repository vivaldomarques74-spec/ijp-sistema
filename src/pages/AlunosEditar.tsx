import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../services/firebase";

export default function AlunosEditar() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cursoId, setCursoId] = useState("");
  const [turmaId, setTurmaId] = useState("");

  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);

  useEffect(() => {
    async function carregar() {
      const alunoSnap = await getDoc(doc(db, "alunos", id!));
      const dados = alunoSnap.data()!;
      setNome(dados.nome);
      setTelefone(dados.telefone);
      setCursoId(dados.cursoId || "");
      setTurmaId(dados.turmaId || "");
    }

    async function carregarCursos() {
      const snap = await getDocs(collection(db, "cursos"));
      setCursos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }

    carregar();
    carregarCursos();
  }, []);

  useEffect(() => {
    async function carregarTurmas() {
      if (!cursoId) return;
      const snap = await getDocs(collection(db, "cursos", cursoId, "turmas"));
      setTurmas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    carregarTurmas();
  }, [cursoId]);

  async function salvar() {
    await updateDoc(doc(db, "alunos", id!), {
      nome,
      telefone,
      cursoId,
      turmaId,
    });
    navigate("/alunos");
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Editar Aluno</h1>

      <input value={nome} onChange={e => setNome(e.target.value)} />
      <input value={telefone} onChange={e => setTelefone(e.target.value)} />

      <select value={cursoId} onChange={e => setCursoId(e.target.value)}>
        <option value="">Selecione o curso</option>
        {cursos.map(c => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>

      <select value={turmaId} onChange={e => setTurmaId(e.target.value)}>
        <option value="">Selecione a turma</option>
        {turmas.map(t => (
          <option key={t.id} value={t.id}>{t.nome}</option>
        ))}
      </select>

      <button onClick={salvar}>Salvar Alterações</button>
    </div>
  );
}
