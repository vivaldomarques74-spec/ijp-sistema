import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy, where, getDoc, doc } from "firebase/firestore";
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
    servicosAtivos: [] as { tipoId: string; modalidade: string; senhaId?: string; senhaNumero?: string; prioridade?: boolean }[],
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [tiposAtendimento, setTiposAtendimento] = useState<any[]>([]);
  const [senhasDisponiveis, setSenhasDisponiveis] = useState<Record<string, any[]>>({});
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

  // Carregar senhas disponíveis para serviços do tipo fila que foram selecionados
  useEffect(() => {
    const carregarSenhas = async () => {
      const novasSenhas: Record<string, any[]> = {};
      for (const serv of dadosAluno.servicosAtivos) {
        const tipo = tiposAtendimento.find(t => t.id === serv.tipoId);
        if (tipo?.tipoAgendamento === "fila" && !senhasDisponiveis[serv.tipoId]) {
          const q = query(collection(db, "tiposAtendimento", serv.tipoId, "senhas"), where("usado", "==", false));
          const snap = await getDocs(q);
          novasSenhas[serv.tipoId] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      }
      setSenhasDisponiveis(prev => ({ ...prev, ...novasSenhas }));
    };
    carregarSenhas();
  }, [dadosAluno.servicosAtivos, tiposAtendimento]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setDadosAluno(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const toggleServico = (tipoId: string, tipoAgendamento?: string) => {
    setDadosAluno(prev => {
      const existe = prev.servicosAtivos.find(s => s.tipoId === tipoId);
      if (existe) {
        return { ...prev, servicosAtivos: prev.servicosAtivos.filter(s => s.tipoId !== tipoId) };
      } else {
        if (tipoAgendamento === "fila") {
          return { ...prev, servicosAtivos: [...prev.servicosAtivos, { tipoId, modalidade: "presencial" }] };
        } else {
          return { ...prev, servicosAtivos: [...prev.servicosAtivos, { tipoId, modalidade: "presencial" }] };
        }
      }
    });
  };

  const selecionarSenha = async (tipoId: string, senhaId: string) => {
    const senhaDoc = await getDoc(doc(db, "tiposAtendimento", tipoId, "senhas", senhaId));
    if (senhaDoc.exists()) {
      const senhaData = senhaDoc.data();
      setDadosAluno(prev => ({
        ...prev,
        servicosAtivos: prev.servicosAtivos.map(s =>
          s.tipoId === tipoId ? { ...s, senhaId, senhaNumero: senhaData.numero, prioridade: senhaData.tipo === "prioridade" } : s
        ),
      }));
    }
  };

  const salvar = async () => {
    if (!dadosAluno.nomeCompleto) return alert("Informe o nome");
    setCarregando(true);
    try {
      await salvarAluno({
        dadosAluno,
        foto,
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
      <h3>Serviços de Saúde</h3>
      {tiposAtendimento.map(t => {
        const servico = dadosAluno.servicosAtivos.find(s => s.tipoId === t.id);
        const isFila = t.tipoAgendamento === "fila";
        return (
          <div key={t.id} style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={!!servico}
                onChange={() => toggleServico(t.id, t.tipoAgendamento)}
              />
              {t.nome}
            </label>
            {servico && isFila && (
              <div style={{ marginLeft: 12, marginTop: 4 }}>
                <select
                  value={servico.senhaId || ""}
                  onChange={e => selecionarSenha(t.id, e.target.value)}
                  style={{ width: 200, marginRight: 8 }}
                >
                  <option value="">Selecione uma senha</option>
                  {senhasDisponiveis[t.id]?.map(s => (
                    <option key={s.id} value={s.id}>{s.numero} - {s.tipo === "prioridade" ? "Prioritário" : "Normal"}</option>
                  ))}
                </select>
                {servico.senhaNumero && <span>Senha: {servico.senhaNumero} {servico.prioridade && "(Prioritário)"}</span>}
              </div>
            )}
            {servico && !isFila && (
              <select
                value={servico.modalidade}
                onChange={e => {
                  setDadosAluno(prev => ({
                    ...prev,
                    servicosAtivos: prev.servicosAtivos.map(s =>
                      s.tipoId === t.id ? { ...s, modalidade: e.target.value as "presencial" | "online" } : s
                    ),
                  }));
                }}
                style={{ marginLeft: 12 }}
              >
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
              </select>
            )}
          </div>
        );
      })}

      <hr />
      <h3>Foto</h3>
      <input type="file" accept="image/*" onChange={e => setFoto(e.target.files?.[0] || null)} />
      {foto && <img src={URL.createObjectURL(foto)} width="100" />}
      <br /><br />
      <button onClick={salvar} disabled={carregando}>Salvar</button>
    </div>
  );
}