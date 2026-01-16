import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useParams, useNavigate } from "react-router-dom";

interface Curso {
  id: string;
  nome: string;
}

interface Turma {
  id: string;
  nome: string;
}

interface AlunoFirestore {
  nomeCompleto: string;
  rg: string;
  cpf: string;
  endereco: string;
  email: string;
  telefone: string;
  menorDeIdade: boolean;
  responsavel?: {
    nome: string;
    rg: string;
    cpf: string;
    email: string;
    telefone: string;
  } | null;
  cursoAtualId: string;
  turmaAtualId: string;
  createdAt: Timestamp;
  historicoCursos?: any[];
}

export default function AlunosEditar() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  // aluno
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [rg, setRg] = useState("");
  const [cpf, setCpf] = useState("");
  const [endereco, setEndereco] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const [menor, setMenor] = useState(false);

  // responsável
  const [respNome, setRespNome] = useState("");
  const [respRg, setRespRg] = useState("");
  const [respCpf, setRespCpf] = useState("");
  const [respEmail, setRespEmail] = useState("");
  const [respTelefone, setRespTelefone] = useState("");

  // cursos e turmas
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  const [cursoAtualId, setCursoAtualId] = useState("");
  const [turmaAtualId, setTurmaAtualId] = useState("");

  useEffect(() => {
    if (!id) return;

    const carregarTudo = async () => {
      const alunoRef = doc(db, "alunos", id);
      const alunoSnap = await getDoc(alunoRef);

      if (!alunoSnap.exists()) {
        alert("Aluno não encontrado");
        navigate("/alunos");
        return;
      }

      const alunoAtual = alunoSnap.data() as AlunoFirestore;

      // dados do aluno
      setNomeCompleto(alunoAtual.nomeCompleto);
      setRg(alunoAtual.rg);
      setCpf(alunoAtual.cpf);
      setEndereco(alunoAtual.endereco);
      setEmail(alunoAtual.email);
      setTelefone(alunoAtual.telefone);

      setMenor(alunoAtual.menorDeIdade);

      if (alunoAtual.menorDeIdade && alunoAtual.responsavel) {
        setRespNome(alunoAtual.responsavel.nome);
        setRespRg(alunoAtual.responsavel.rg);
        setRespCpf(alunoAtual.responsavel.cpf);
        setRespEmail(alunoAtual.responsavel.email);
        setRespTelefone(alunoAtual.responsavel.telefone);
      }

      setCursoAtualId(alunoAtual.cursoAtualId);
      setTurmaAtualId(alunoAtual.turmaAtualId);

      // cursos
      const cursosSnap = await getDocs(collection(db, "cursos"));
      setCursos(
        cursosSnap.docs.map((d) => ({
          id: d.id,
          nome: d.data().nome,
        }))
      );

      // turmas do curso atual
      if (alunoAtual.cursoAtualId) {
        const turmasSnap = await getDocs(
          collection(db, "cursos", alunoAtual.cursoAtualId, "turmas")
        );
        setTurmas(
          turmasSnap.docs.map((d) => ({
            id: d.id,
            nome: d.data().nome,
          }))
        );
      }

      setLoading(false);
    };

    carregarTudo();
  }, [id, navigate]);

  const salvarAluno = async () => {
    if (!id) return;

    const alunoRef = doc(db, "alunos", id);
    const alunoSnap = await getDoc(alunoRef);

    if (!alunoSnap.exists()) return;

    const alunoAtual = alunoSnap.data() as AlunoFirestore;
    const historicoAtual = alunoAtual.historicoCursos || [];

    let novoHistorico = historicoAtual;

    if (
      alunoAtual.cursoAtualId !== cursoAtualId ||
      alunoAtual.turmaAtualId !== turmaAtualId
    ) {
      novoHistorico = [
        ...historicoAtual,
        {
          cursoId: alunoAtual.cursoAtualId,
          turmaId: alunoAtual.turmaAtualId,
          dataEntrada: alunoAtual.createdAt,
          dataSaida: Timestamp.now(),
        },
      ];
    }

    await updateDoc(alunoRef, {
      nomeCompleto,
      rg,
      cpf,
      endereco,
      email,
      telefone,
      menorDeIdade: menor,
      responsavel: menor
        ? {
            nome: respNome,
            rg: respRg,
            cpf: respCpf,
            email: respEmail,
            telefone: respTelefone,
          }
        : null,
      cursoAtualId,
      turmaAtualId,
      historicoCursos: novoHistorico,
    });

    alert("Aluno atualizado com sucesso!");
    navigate("/alunos");
  };

  if (loading) return <p>Carregando aluno...</p>;

  return (
    <div className="container">
      <h1>Editar Aluno</h1>

      <input value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} />
      <input value={rg} onChange={(e) => setRg(e.target.value)} />
      <input value={cpf} onChange={(e) => setCpf(e.target.value)} />
      <input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input value={telefone} onChange={(e) => setTelefone(e.target.value)} />

      <label>
        <input
          type="checkbox"
          checked={menor}
          onChange={(e) => setMenor(e.target.checked)}
        />{" "}
        Aluno é menor de idade
      </label>

      <h3>Curso e Turma Atual</h3>

      <select value={cursoAtualId} onChange={(e) => setCursoAtualId(e.target.value)}>
        {cursos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>

      <select value={turmaAtualId} onChange={(e) => setTurmaAtualId(e.target.value)}>
        {turmas.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome}
          </option>
        ))}
      </select>

      <br />
      <br />

      <button onClick={salvarAluno}>Salvar Alterações</button>
    </div>
  );
}
