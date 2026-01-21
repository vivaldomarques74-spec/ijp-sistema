import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../services/firebase";

export default function AlunosEditar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [dadosAluno, setDadosAluno] = useState<any>({
    nomeCompleto: "",
    telefone: "",
    endereco: "",
    email: "",
    cursoAtualId: "",
    turmaAtualId: "",
  });

  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);

  // carregar aluno
  useEffect(() => {
    if (!id) return;

    const carregarAluno = async () => {
      const ref = doc(db, "alunos", id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        alert("Aluno não encontrado");
        navigate("/alunos");
        return;
      }

      setDadosAluno(snap.data());
      setLoading(false);
    };

    carregarAluno();
  }, [id, navigate]);

  // carregar cursos
  useEffect(() => {
    const carregarCursos = async () => {
      const snap = await getDocs(collection(db, "cursos"));
      setCursos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    carregarCursos();
  }, []);

  // carregar turmas do curso
  useEffect(() => {
    if (!dadosAluno.cursoAtualId) return;

    const carregarTurmas = async () => {
      const snap = await getDocs(
        collection(db, "cursos", dadosAluno.cursoAtualId, "turmas")
      );
      setTurmas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    carregarTurmas();
  }, [dadosAluno.cursoAtualId]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setDadosAluno((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const salvarAlteracoes = async () => {
    if (!id) return;

    const ref = doc(db, "alunos", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      alert("Aluno não encontrado");
      return;
    }

    const dadosAntigos = snap.data();

    // 🔒 UPDATE SEGURO — NUNCA APAGA CAMPOS
    await updateDoc(ref, {
      ...dadosAntigos,
      nomeCompleto: dadosAluno.nomeCompleto,
      telefone: dadosAluno.telefone,
      endereco: dadosAluno.endereco,
      email: dadosAluno.email,
      cursoAtualId: dadosAluno.cursoAtualId,
      turmaAtualId: dadosAluno.turmaAtualId,
    });

    alert("Aluno atualizado com sucesso!");
    navigate("/alunos");
  };

  if (loading) return <p>Carregando aluno...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Editar Aluno</h1>

      <input
        name="nomeCompleto"
        placeholder="Nome completo"
        value={dadosAluno.nomeCompleto || ""}
        onChange={handleChange}
      />

      <input
        name="telefone"
        placeholder="Telefone"
        value={dadosAluno.telefone || ""}
        onChange={handleChange}
      />

      <input
        name="endereco"
        placeholder="Endereço"
        value={dadosAluno.endereco || ""}
        onChange={handleChange}
      />

      <input
        name="email"
        placeholder="Email"
        value={dadosAluno.email || ""}
        onChange={handleChange}
      />

      <hr />

      <label>Curso</label>
      <select
        name="cursoAtualId"
        value={dadosAluno.cursoAtualId || ""}
        onChange={handleChange}
      >
        <option value="">Selecione</option>
        {cursos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>

      <label>Turma</label>
      <select
        name="turmaAtualId"
        value={dadosAluno.turmaAtualId || ""}
        onChange={handleChange}
        disabled={!dadosAluno.cursoAtualId}
      >
        <option value="">Selecione</option>
        {turmas.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome}
          </option>
        ))}
      </select>

      <br />
      <br />

      <button onClick={salvarAlteracoes}>Salvar Alterações</button>
    </div>
  );
}
