import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../services/firebase";
import { salvarAluno } from "../services/salvarAluno";

export default function AlunosCadastrar() {
  const navigate = useNavigate();

  const [dadosAluno, setDadosAluno] = useState({
    nomeCompleto: "",
    rg: "",
    cpf: "",
    endereco: "",
    email: "",
    telefone: "",
    nascimento: "",
    menor: false,
    responsavelNome: "",
    responsavelEmail: "",
    responsavelTelefone: "",
    responsavelCpf: "",
    responsavelRg: "",
    cursoAtualId: "",
    turmaAtualId: "",
  });

  const [foto, setFoto] = useState<File | null>(null);
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [carregandoCursos, setCarregandoCursos] = useState(false);
  const [carregandoTurmas, setCarregandoTurmas] = useState(false);

  useEffect(() => {
    const carregarCursos = async () => {
      setCarregandoCursos(true);
      const q = query(collection(db, "cursos"), orderBy("nome"));
      const snap = await getDocs(q);
      setCursos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCarregandoCursos(false);
    };
    carregarCursos();
  }, []);

  useEffect(() => {
    if (!dadosAluno.cursoAtualId) {
      setTurmas([]);
      return;
    }
    const carregarTurmas = async () => {
      setCarregandoTurmas(true);
      const snap = await getDocs(collection(db, "cursos", dadosAluno.cursoAtualId, "turmas"));
      setTurmas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCarregandoTurmas(false);
    };
    carregarTurmas();
  }, [dadosAluno.cursoAtualId]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setDadosAluno((prev) => ({
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
        foto,
        onSucesso: (matricula) => {
          alert(`Aluno cadastrado com sucesso!\nMatrícula: ${matricula}`);
          navigate("/alunos");
        },
      });
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Erro ao cadastrar aluno");
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
      <input type="date" name="nascimento" placeholder="Data de nascimento" value={dadosAluno.nascimento} onChange={handleChange} />

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
        <option value="">{carregandoCursos ? "Carregando..." : "Selecione"}</option>
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
        <option value="">{carregandoTurmas ? "Carregando..." : "Selecione"}</option>
        {turmas.map((t) => (
          <option key={t.id} value={t.id}>{t.nome}</option>
        ))}
      </select>

      <hr />
      <h3>Foto do aluno</h3>
      <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] || null)} />
      {foto && <img src={URL.createObjectURL(foto)} width="100" style={{ marginTop: 8 }} alt="Prévia" />}

      <br /><br />
      <button onClick={salvar}>Salvar Aluno</button>
    </div>
  );
}