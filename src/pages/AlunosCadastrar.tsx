import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
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
    cursoAtualId: "",
    turmaAtualId: "",
  });

  const [foto, setFoto] = useState<File | null>(null);

  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);

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
    if (!dadosAluno.cursoAtualId) {
      setTurmas([]);
      return;
    }

    const carregarTurmas = async () => {
      const snap = await getDocs(
        collection(db, "cursos", dadosAluno.cursoAtualId, "turmas")
      );
      setTurmas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
    if (!dadosAluno.nomeCompleto) {
      alert("Informe o nome do aluno");
      return;
    }

    // logs IMPORTANTES para produção
    console.log("DADOS DO ALUNO:", dadosAluno);
    console.log("FOTO NO FORM:", foto);

    await salvarAluno({
      dadosAluno,
      foto,
      onSucesso: () => {
        navigate("/alunos");
      },
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Cadastrar Aluno</h1>

      <input
        name="nomeCompleto"
        placeholder="Nome completo"
        value={dadosAluno.nomeCompleto}
        onChange={handleChange}
      />

      <input
        name="rg"
        placeholder="RG"
        value={dadosAluno.rg}
        onChange={handleChange}
      />

      <input
        name="cpf"
        placeholder="CPF"
        value={dadosAluno.cpf}
        onChange={handleChange}
      />

      <input
        name="endereco"
        placeholder="Endereço"
        value={dadosAluno.endereco}
        onChange={handleChange}
      />

      <input
        name="email"
        placeholder="Email"
        value={dadosAluno.email}
        onChange={handleChange}
      />

      <input
        name="telefone"
        placeholder="Telefone"
        value={dadosAluno.telefone}
        onChange={handleChange}
      />

      <label style={{ display: "block", marginTop: 10 }}>
        <input
          type="checkbox"
          name="menor"
          checked={dadosAluno.menor}
          onChange={handleChange}
        />{" "}
        Aluno é menor de idade
      </label>

      <hr />

      <label>Curso</label>
      <select
        name="cursoAtualId"
        value={dadosAluno.cursoAtualId}
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
        value={dadosAluno.turmaAtualId}
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

      <hr />

      <label>Foto do aluno</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setFoto(e.target.files[0]);
          }
        }}
      />

      <br />
      <br />

      <button onClick={salvar}>Salvar Aluno</button>
    </div>
  );
}
