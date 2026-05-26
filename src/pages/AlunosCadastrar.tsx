import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../services/firebase";
import { salvarAluno } from "../services/salvarAluno";

export default function AlunosCadastrar() {
  const navigate = useNavigate();
  const [dadosAluno, setDadosAluno] = useState({
    nomeCompleto: "",
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
    cursoAtualId: "",
    turmaAtualId: "",
    servicosAtivos: [] as { tipoId: string; modalidade: "presencial" | "online" }[],
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
    if (!dadosAluno.cursoAtualId) {
      setTurmas([]);
      return;
    }
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

  const toggleServico = (tipoId: string, modalidade: "presencial" | "online") => {
    setDadosAluno(prev => {
      const existe = prev.servicosAtivos.find(s => s.tipoId === tipoId);
      if (existe) {
        return { ...prev, servicosAtivos: prev.servicosAtivos.filter(s => s.tipoId !== tipoId) };
      } else {
        return { ...prev, servicosAtivos: [...prev.servicosAtivos, { tipoId, modalidade }] };
      }
    });
  };

  const salvar = async () => {
    if (!dadosAluno.nomeCompleto) return alert("Informe o nome");
    setCarregando(true);
    try {
      await salvarAluno({
        dadosAluno,
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

  return (
    <div style={{ padding: 20 }}>
      <h1>Cadastrar Aluno</h1>

      <input name="nomeCompleto" placeholder="Nome completo" value={dadosAluno.nomeCompleto} onChange={handleChange} />
      <input name="cpf" placeholder="CPF" onChange={handleChange} />
      <input name="endereco" placeholder="Endereço" onChange={handleChange} />
      <input name="email" placeholder="Email" onChange={handleChange} />
      <input name="telefone" placeholder="Telefone" onChange={handleChange} />
      <input type="date" name="nascimento" onChange={handleChange} />
      <label><input type="checkbox" name="menor" onChange={handleChange} /> Menor de idade</label>

      {dadosAluno.menor && (
        <>
          <h3>Responsável</h3>
          <input name="responsavelNome" placeholder="Nome" onChange={handleChange} />
          <input name="responsavelEmail" placeholder="Email" onChange={handleChange} />
          <input name="responsavelTelefone" placeholder="Telefone" onChange={handleChange} />
          <input name="responsavelCpf" placeholder="CPF" onChange={handleChange} />
        </>
      )}

      <hr />
      <h3>Curso (opcional)</h3>
      <select name="cursoAtualId" value={dadosAluno.cursoAtualId} onChange={handleChange}>
        <option value="">Selecione</option>
        {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <select name="turmaAtualId" value={dadosAluno.turmaAtualId} onChange={handleChange} disabled={!dadosAluno.cursoAtualId}>
        <option value="">Turma</option>
        {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>

      <hr />
      <h3>Serviços de Saúde (marque quantos quiser)</h3>
      {tiposAtendimento.length === 0 && <p>Nenhum tipo de atendimento cadastrado. Crie no Firestore.</p>}
      {tiposAtendimento.map(t => {
        const servico = dadosAluno.servicosAtivos.find(s => s.tipoId === t.id);
        return (
          <div key={t.id} style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={!!servico}
                onChange={() => toggleServico(t.id, servico?.modalidade || "presencial")}
              />
              {t.nome}
            </label>
            {servico && (
              <select
                value={servico.modalidade}
                onChange={(e) => toggleServico(t.id, e.target.value as "presencial" | "online")}
                style={{ marginLeft: 12 }}
              >
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
              </select>
            )}
          </div>
        );
      })}

      <br />
      <button onClick={salvar} disabled={carregando}>Salvar</button>
    </div>
  );
}