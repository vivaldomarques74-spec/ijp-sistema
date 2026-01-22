import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../services/firebase";
import { salvarAluno } from "../services/salvarAluno";

export default function AlunosCadastrar() {
  const navigate = useNavigate();

  const [dadosAluno, setDadosAluno] = useState<any>({
    nomeCompleto: "",
    rg: "",
    cpf: "",
    endereco: "",
    email: "",
    telefone: "",
    menor: false,

    responsavelNome: "",
    responsavelEmail: "",
    responsavelTelefone: "",
    responsavelCpf: "",
    responsavelRg: "",

    cursoAtualId: "",
    turmaAtualId: "",
  });

  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [carregandoCursos, setCarregandoCursos] = useState(false);
  const [carregandoTurmas, setCarregandoTurmas] = useState(false);

  // 🔹 CARREGAR CURSOS
  useEffect(() => {
    const carregarCursos = async () => {
      setCarregandoCursos(true);

      const q = query(collection(db, "cursos"), orderBy("nome"));
      const snap = await getDocs(q);

      setCursos(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );

      setCarregandoCursos(false);
    };

    carregarCursos();
  }, []);

  // 🔹 CARREGAR TURMAS DO CURSO
  useEffect(() => {
    if (!dadosAluno.cursoAtualId) {
      setTurmas([]);
      return;
    }

    const carregarTurmas = async () => {
      setCarregandoTurmas(true);

      const snap = await getDocs(
        collection(db, "cursos", dadosAluno.cursoAtualId, "turmas")
      );

      setTurmas(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );

      setCarregandoTurmas(false);
    };

    carregarTurmas();
  }, [dadosAluno.cursoAtualId]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;

    setDadosAluno((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const salvar = async () => {
    try {
      if (!dadosAluno.nomeCompleto) {
        alert("Informe o nome do aluno");
        return;
      }

      await salvarAluno({
        dadosAluno,
        onSucesso: (matricula) => {
          alert(`Aluno cadastrado com sucesso!\nMatrícula: ${matricula}`);
          navigate("/alunos");
        },
      });
    } catch (error) {
      console.error("Erro ao cadastrar aluno:", error);
      alert("Erro ao cadastrar aluno. Veja o console.");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Cadastrar Aluno</h1>

      <input name="nomeCompleto" placeholder="Nome completo" value={dadosAluno.nomeCompleto} onChange={handleChange} />
      <input name="rg" placeholder="RG" value={dadosAluno.rg} onChange={handleChange} />
      <input name="cpf" placeholder="CPF" value={dadosAluno.cpf} onChange={handleChange} />
      <input name="endereco" placeholder="Endereço" value={dadosAluno.endereco} onChange={handleChange} />
      <input name="email" placeholder="Email" value={dadosAluno.email} onChange={handleChange} />
      <input name="telefone" placeholder="Telefone" value={dadosAluno.telefone} onChange={handleChange} />

      <label style={{ display: "block", marginTop: 10 }}>
        <input type="checkbox" name="menor" checked={dadosAluno.menor} onChange={handleChange} />
        Aluno é menor de idade
      </label>

      {dadosAluno.menor && (
        <>
          <h3>Dados do Responsável</h3>
          <input name="responsavelNome" placeholder="Nome do responsável" value={dadosAluno.responsavelNome} onChange={handleChange} />
          <input name="responsavelEmail" placeholder="Email do responsável" value={dadosAluno.responsavelEmail} onChange={handleChange} />
          <input name="responsavelTelefone" placeholder="Telefone do responsável" value={dadosAluno.responsavelTelefone} onChange={handleChange} />
          <input name="responsavelCpf" placeholder="CPF do responsável" value={dadosAluno.responsavelCpf} onChange={handleChange} />
          <input name="responsavelRg" placeholder="RG do responsável" value={dadosAluno.responsavelRg} onChange={handleChange} />
        </>
      )}

      <hr />

      <label>Curso</label>
      <select name="cursoAtualId" value={dadosAluno.cursoAtualId} onChange={handleChange}>
        <option value="">
          {carregandoCursos ? "Carregando cursos..." : "Selecione"}
        </option>
        {cursos.map((c) => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>

      <label>Turma</label>
      <select
        name="turmaAtualId"
        value={dadosAluno.turmaAtualId}
        onChange={handleChange}
        disabled={!dadosAluno.cursoAtualId || carregandoTurmas}
      >
        <option value="">
          {carregandoTurmas ? "Carregando turmas..." : "Selecione"}
        </option>
        {turmas.map((t) => (
          <option key={t.id} value={t.id}>{t.nome}</option>
        ))}
      </select>

      <br /><br />

      <button onClick={salvar}>Salvar Aluno</button>
    </div>
  );
}
