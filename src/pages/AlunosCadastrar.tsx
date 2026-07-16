import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../services/firebase";
import { salvarAluno } from "../services/salvarAluno";

export default function AlunosCadastrar() {
  const navigate = useNavigate();
  const [dadosAluno, setDadosAluno] = useState({
    nomeCompleto: "", cpf: "", endereco: "", email: "", telefone: "", nascimento: "", menor: false,
    responsavelNome: "", responsavelEmail: "", responsavelTelefone: "", responsavelCpf: "",
    cursoAtualId: "", turmaAtualId: "",
    servicosAtivos: [] as { tipoId: string; modalidade: string }[],
  });
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [tiposAtendimento, setTiposAtendimento] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const carregarCursos = async () => {
      const q = query(collection(db, "cursos"), orderBy("nome"));
      const snap = await getDocs(q);
      setCursos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    const carregarTipos = async () => {
      const snap = await getDocs(collection(db, "tiposAtendimento"));
      setTiposAtendimento(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    carregarCursos();
    carregarTipos();
  }, []);

  useEffect(() => {
    if (!dadosAluno.cursoAtualId) { setTurmas([]); return; }
    const carregarTurmas = async () => {
      const snap = await getDocs(collection(db, "cursos", dadosAluno.cursoAtualId, "turmas"));
      setTurmas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    carregarTurmas();
  }, [dadosAluno.cursoAtualId]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setDadosAluno(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const toggleServico = (tipoId: string) => {
    setDadosAluno(prev => {
      const existe = prev.servicosAtivos.find(s => s.tipoId === tipoId);
      if (existe) {
        return { ...prev, servicosAtivos: prev.servicosAtivos.filter(s => s.tipoId !== tipoId) };
      } else {
        return { ...prev, servicosAtivos: [...prev.servicosAtivos, { tipoId, modalidade: "presencial" }] };
      }
    });
  };

  const salvar = async () => {
    if (!dadosAluno.nomeCompleto) return alert("Informe o nome");
    setCarregando(true);
    try {
      await salvarAluno({
        dadosAluno,
        foto: null,
        onSucesso: (matricula) => {
          alert(`Aluno cadastrado! Matrícula: ${matricula}`);
          navigate("/alunos");
        },
      });
    } catch (error: any) {
      alert(error.message);
    } finally {
      setCarregando(false);
    }
  };

  const inputStyle = { width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8, marginBottom: 8 };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, color: "#1a2a4f" }}>Novo Aluno</h2>
      <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input placeholder="Nome completo" name="nomeCompleto" value={dadosAluno.nomeCompleto} onChange={handleChange} style={inputStyle} />
          <input placeholder="CPF" name="cpf" onChange={handleChange} style={inputStyle} />
          <input placeholder="Endereço" name="endereco" onChange={handleChange} style={inputStyle} />
          <input placeholder="Email" name="email" onChange={handleChange} style={inputStyle} />
          <input placeholder="Telefone" name="telefone" onChange={handleChange} style={inputStyle} />
          <input type="date" name="nascimento" onChange={handleChange} style={inputStyle} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0" }}>
          <input type="checkbox" name="menor" onChange={handleChange} />
          Menor de idade
        </label>
        {dadosAluno.menor && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <input placeholder="Nome do responsável" name="responsavelNome" onChange={handleChange} style={inputStyle} />
            <input placeholder="CPF do responsável" name="responsavelCpf" onChange={handleChange} style={inputStyle} />
            <input placeholder="Telefone do responsável" name="responsavelTelefone" onChange={handleChange} style={inputStyle} />
            <input placeholder="Email do responsável" name="responsavelEmail" onChange={handleChange} style={inputStyle} />
          </div>
        )}
        <h4 style={{ margin: "16px 0 8px" }}>Curso (opcional)</h4>
        <div style={{ display: "flex", gap: 12 }}>
          <select name="cursoAtualId" value={dadosAluno.cursoAtualId} onChange={handleChange} style={inputStyle}>
            <option value="">Curso</option>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select name="turmaAtualId" value={dadosAluno.turmaAtualId} onChange={handleChange} disabled={!dadosAluno.cursoAtualId} style={inputStyle}>
            <option value="">Turma</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <h4 style={{ margin: "16px 0 8px" }}>Serviços de Saúde</h4>
        {tiposAtendimento.map(t => (
          <label key={t.id} style={{ display: "block", marginBottom: 4 }}>
            <input type="checkbox" checked={!!dadosAluno.servicosAtivos.find(s => s.tipoId === t.id)} onChange={() => toggleServico(t.id)} />
            {t.nome}
          </label>
        ))}
        <button onClick={salvar} disabled={carregando} style={{ marginTop: 16, padding: "8px 20px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
          {carregando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}