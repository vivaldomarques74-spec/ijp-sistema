import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, getDocs, arrayUnion, runTransaction, addDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { verificarCpfDuplicado } from "../services/validarCpf";

export default function AlunosEditar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [dadosAluno, setDadosAluno] = useState<any>({
    nomeCompleto: "", cpf: "", endereco: "", email: "", telefone: "", nascimento: "", menor: false,
    responsavelNome: "", responsavelEmail: "", responsavelTelefone: "", responsavelCpf: "",
    status: "ativo", observacoes: "", cursos: [],
    servicosAtivos: [] as { tipoId: string; modalidade: string; senhaId?: string; senhaNumero?: string; prioridade?: boolean }[],
  });
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [tiposAtendimento, setTiposAtendimento] = useState<any[]>([]);
  const [senhasDisponiveis, setSenhasDisponiveis] = useState<Record<string, any[]>>({});
  const [novoCursoId, setNovoCursoId] = useState("");
  const [novaTurmaId, setNovaTurmaId] = useState("");
  const [novoServicoId, setNovoServicoId] = useState("");
  const [novaSenhaId, setNovaSenhaId] = useState("");
  const [processando, setProcessando] = useState(false);

  const [cpfStatus, setCpfStatus] = useState({ mensagem: "", existe: false, verificando: false });
  const cpfTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    carregarDados();
  }, [id]);

  async function carregarDados() {
    if (!id) return;
    const alunoSnap = await getDoc(doc(db, "alunos", id));
    if (alunoSnap.exists()) {
      const data = alunoSnap.data();
      setDadosAluno({
        nomeCompleto: data.nomeCompleto || "", cpf: data.cpf || "", endereco: data.endereco || "",
        email: data.email || "", telefone: data.telefone || "", nascimento: data.nascimento || "", menor: data.menor || false,
        responsavelNome: data.responsavelNome || "", responsavelEmail: data.responsavelEmail || "",
        responsavelTelefone: data.responsavelTelefone || "", responsavelCpf: data.responsavelCpf || "",
        status: data.status || "ativo", observacoes: data.observacoes || "",
        cursos: data.cursos || [],
        servicosAtivos: data.servicosAtivos || [],
      });
    }
    const cursosSnap = await getDocs(collection(db, "cursos"));
    setCursos(cursosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    const tiposSnap = await getDocs(collection(db, "tiposAtendimento"));
    setTiposAtendimento(tiposSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  useEffect(() => {
    if (!novoCursoId) { setTurmas([]); setNovaTurmaId(""); return; }
    const carregarTurmas = async () => {
      const snap = await getDocs(collection(db, "cursos", novoCursoId, "turmas"));
      setTurmas(snap.docs.map(d => {
        const data = d.data();
        const alunosBruto = data.alunos || [];
        const alunosUnicos = Array.from(new Set(alunosBruto));
        const capacidade = data.vagasTotais || data.totalVagas || data.vagas || data.capacidade || 0;
        return {
          id: d.id,
          ...data,
          vagasDisponiveis: Math.max(0, capacidade - alunosUnicos.length),
        };
      }));
    };
    carregarTurmas();
  }, [novoCursoId]);

  useEffect(() => {
    if (!novoServicoId) return;
    const carregarSenhas = async () => {
      const snap = await getDocs(collection(db, "tiposAtendimento", novoServicoId, "senhas"));
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSenhasDisponiveis({ [novoServicoId]: lista });
    };
    carregarSenhas();
  }, [novoServicoId]);

  useEffect(() => {
    const cpf = dadosAluno.cpf.replace(/\D/g, "");
    if (cpf.length !== 11) {
      setCpfStatus({ mensagem: "", existe: false, verificando: false });
      return;
    }
    if (cpfTimeoutRef.current) clearTimeout(cpfTimeoutRef.current);
    setCpfStatus(prev => ({ ...prev, verificando: true }));
    cpfTimeoutRef.current = setTimeout(async () => {
      try {
        const existe = await verificarCpfDuplicado(cpf, id);
        setCpfStatus({
          mensagem: existe ? "⚠️ CPF já cadastrado" : "✅ CPF disponível",
          existe,
          verificando: false,
        });
      } catch (error) {
        console.error("Erro ao verificar CPF:", error);
        setCpfStatus({ mensagem: "Erro ao verificar CPF", existe: false, verificando: false });
      }
    }, 500);
    return () => {
      if (cpfTimeoutRef.current) clearTimeout(cpfTimeoutRef.current);
    };
  }, [dadosAluno.cpf, id]);

  // ============ ADICIONAR CURSO ============
  const adicionarCurso = async () => {
    if (!novoCursoId || !novaTurmaId) return alert("Selecione curso e turma");
    const jaVinculado = dadosAluno.cursos.some((c: any) => c.cursoId === novoCursoId && c.turmaId === novaTurmaId);
    if (jaVinculado) return alert("Aluno já está nesta turma");

    try {
      const turmaRef = doc(db, "cursos", novoCursoId, "turmas", novaTurmaId);
      await runTransaction(db, async (transaction) => {
        const turmaSnap = await transaction.get(turmaRef);
        if (!turmaSnap.exists()) throw new Error("Turma não existe");
        const turmaData = turmaSnap.data();
        const alunosAtuais = turmaData.alunos || [];
        const capacidadeTotal = turmaData.vagasTotais || turmaData.totalVagas || turmaData.vagas || turmaData.capacidade || 0;
        const vagas = Math.max(0, capacidadeTotal - alunosAtuais.length);
        if (vagas <= 0) throw new Error("Sem vagas");
        transaction.update(turmaRef, {
          alunos: arrayUnion(id),
          vagasTotais: capacidadeTotal,
        });
      });
      const novosCursos = [...dadosAluno.cursos, { cursoId: novoCursoId, turmaId: novaTurmaId, data: new Date() }];
      await updateDoc(doc(db, "alunos", id!), { cursos: novosCursos });
      setDadosAluno({ ...dadosAluno, cursos: novosCursos });
      alert("Curso adicionado com sucesso!");
      setNovoCursoId("");
      setNovaTurmaId("");
    } catch (error: any) {
      alert(error.message);
    }
  };

  // ============ ADICIONAR SERVIÇO (primeira vez) ============
  const adicionarServico = async () => {
    if (!novoServicoId) return alert("Selecione um serviço");
    const jaVinculado = dadosAluno.servicosAtivos.some((s: any) => s.tipoId === novoServicoId);
    if (jaVinculado) return alert("Aluno já está neste serviço");

    setProcessando(true);
    try {
      const servico = tiposAtendimento.find(t => t.id === novoServicoId);
      const novoServico: any = { tipoId: novoServicoId, modalidade: "presencial" };
      if (servico?.tipoAgendamento === "fila") {
        if (!novaSenhaId) { setProcessando(false); return alert("Selecione uma senha"); }
        const senhaDoc = await getDoc(doc(db, "tiposAtendimento", novoServicoId, "senhas", novaSenhaId));
        if (!senhaDoc.exists()) { setProcessando(false); return alert("Senha inválida"); }
        const senhaData = senhaDoc.data();
        if (senhaData.usado) { setProcessando(false); return alert("Senha já utilizada"); }
        await updateDoc(doc(db, "tiposAtendimento", novoServicoId, "senhas", novaSenhaId), { usado: true, alunoId: id });
        novoServico.senhaId = novaSenhaId;
        novoServico.senhaNumero = senhaData.numero;
        novoServico.prioridade = senhaData.tipo === "prioridade";
        await addDoc(collection(db, "filaEspera"), {
          alunoId: id,
          tipoId: novoServicoId,
          dataSolicitacao: new Date(),
          status: "aguardando",
          modalidade: "presencial",
          senhaNumero: senhaData.numero,
          prioridade: senhaData.tipo === "prioridade",
        });
      } else {
        await addDoc(collection(db, "filaEspera"), {
          alunoId: id,
          tipoId: novoServicoId,
          dataSolicitacao: new Date(),
          status: "aguardando",
          modalidade: "presencial",
        });
      }
      const novosServicos = [...dadosAluno.servicosAtivos, novoServico];
      await updateDoc(doc(db, "alunos", id!), { servicosAtivos: novosServicos });
      setDadosAluno({ ...dadosAluno, servicosAtivos: novosServicos });
      alert("Serviço adicionado com sucesso!");
      setNovoServicoId("");
      setNovaSenhaId("");
      setSenhasDisponiveis({});
    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessando(false);
    }
  };

  // ============ 🔥 NOVO: REMOVER SERVIÇO (tira do servicoAtivos E da fila) ============
  const removerServico = async (tipoId: string) => {
    if (!window.confirm("Remover este serviço? O aluno sairá da fila e do cadastro de serviço.")) return;
    setProcessando(true);
    try {
      // Remove do array servicosAtivos
      const novosServicos = dadosAluno.servicosAtivos.filter((s: any) => s.tipoId !== tipoId);
      await updateDoc(doc(db, "alunos", id!), { servicosAtivos: novosServicos });

      // Remove da fila de espera (se estiver lá aguardando)
      const filaSnap = await getDocs(collection(db, "filaEspera"));
      for (const f of filaSnap.docs) {
        const fd = f.data();
        if (fd.alunoId === id && fd.tipoId === tipoId && (fd.status === "aguardando" || fd.status === "vinculado")) {
          await updateDoc(f.ref, { status: "cancelado" });
        }
      }

      setDadosAluno({ ...dadosAluno, servicosAtivos: novosServicos });
      alert("Serviço removido!");
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setProcessando(false);
    }
  };

  // ============ 🔥 NOVO: REENVIAR PARA FILA ============
  const reenviarParaFila = async (tipoId: string) => {
    if (!window.confirm("Reenviar este aluno para a fila de espera?")) return;
    setProcessando(true);
    try {
      // 1. Verifica se já está na fila
      const filaSnap = await getDocs(collection(db, "filaEspera"));
      const jaNaFila = filaSnap.docs.some(f => {
        const fd = f.data();
        return fd.alunoId === id && fd.tipoId === tipoId && (fd.status === "aguardando" || fd.status === "vinculado");
      });
      if (jaNaFila) {
        alert("Este aluno já está na fila deste serviço!");
        setProcessando(false);
        return;
      }

      // 2. Adiciona nova entrada na fila
      await addDoc(collection(db, "filaEspera"), {
        alunoId: id,
        tipoId,
        dataSolicitacao: new Date(),
        status: "aguardando",
        modalidade: "presencial",
      });

      alert("Aluno reenviado para a fila!");
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setProcessando(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setDadosAluno((prev: any) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const salvar = async () => {
    if (cpfStatus.existe) {
      alert("CPF já cadastrado. Não é possível salvar.");
      return;
    }
    await updateDoc(doc(db, "alunos", id!), {
      nomeCompleto: dadosAluno.nomeCompleto,
      cpf: dadosAluno.cpf,
      endereco: dadosAluno.endereco,
      email: dadosAluno.email,
      telefone: dadosAluno.telefone,
      nascimento: dadosAluno.nascimento,
      menor: dadosAluno.menor,
      responsavelNome: dadosAluno.responsavelNome,
      responsavelEmail: dadosAluno.responsavelEmail,
      responsavelTelefone: dadosAluno.responsavelTelefone,
      responsavelCpf: dadosAluno.responsavelCpf,
      status: dadosAluno.status,
      observacoes: dadosAluno.observacoes,
    });
    alert("Dados atualizados");
    navigate("/alunos");
  };

  const getCursoNome = (cursoId: string) => {
    const curso = cursos.find(c => c.id === cursoId);
    return curso?.nome || "Curso não encontrado";
  };

  const getServicoNome = (tipoId: string) => {
    const servico = tiposAtendimento.find(t => t.id === tipoId);
    return servico?.nome || "Serviço não encontrado";
  };

  const inputStyle = { width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8, marginBottom: 8 };
  const buttonStyle = (type: "primary" | "secondary") => ({
    padding: "8px 16px",
    border: "none",
    borderRadius: 8,
    background: type === "primary" ? "#0070f3" : "#28a745",
    color: "#fff",
    cursor: "pointer",
    marginTop: 8,
  });

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, color: "#1a2a4f" }}>Editar Aluno</h2>
      <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input placeholder="Nome" value={dadosAluno.nomeCompleto} onChange={handleChange} name="nomeCompleto" style={inputStyle} />
          <input placeholder="CPF" value={dadosAluno.cpf} onChange={handleChange} name="cpf" style={inputStyle} />
          {cpfStatus.mensagem && (
            <div style={{ gridColumn: "span 2", color: cpfStatus.existe ? "red" : "green", fontSize: 14, marginBottom: 8 }}>
              {cpfStatus.verificando ? "Verificando..." : cpfStatus.mensagem}
            </div>
          )}
          <input placeholder="Endereço" value={dadosAluno.endereco} onChange={handleChange} name="endereco" style={inputStyle} />
          <input placeholder="Email" value={dadosAluno.email} onChange={handleChange} name="email" style={inputStyle} />
          <input placeholder="Telefone" value={dadosAluno.telefone} onChange={handleChange} name="telefone" style={inputStyle} />
          <input type="date" value={dadosAluno.nascimento} onChange={handleChange} name="nascimento" style={inputStyle} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0" }}>
          <input type="checkbox" checked={dadosAluno.menor} onChange={handleChange} name="menor" />
          Menor de idade
        </label>
        {dadosAluno.menor && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <input placeholder="Responsável" value={dadosAluno.responsavelNome} onChange={handleChange} name="responsavelNome" style={inputStyle} />
            <input placeholder="CPF resp." value={dadosAluno.responsavelCpf} onChange={handleChange} name="responsavelCpf" style={inputStyle} />
            <input placeholder="Telefone resp." value={dadosAluno.responsavelTelefone} onChange={handleChange} name="responsavelTelefone" style={inputStyle} />
            <input placeholder="Email resp." value={dadosAluno.responsavelEmail} onChange={handleChange} name="responsavelEmail" style={inputStyle} />
          </div>
        )}
        <select value={dadosAluno.status} onChange={handleChange} name="status" style={inputStyle}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
        <textarea placeholder="Observações" value={dadosAluno.observacoes} onChange={handleChange} name="observacoes" style={{ ...inputStyle, minHeight: 60 }} />
        <button onClick={salvar} disabled={cpfStatus.existe} style={buttonStyle("primary")}>
          Salvar Alterações
        </button>
      </div>

      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* CURSO */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <h3 style={{ fontSize: 16, margin: "0 0 12px" }}>Adicionar Curso</h3>
          <select value={novoCursoId} onChange={e => setNovoCursoId(e.target.value)} style={inputStyle}>
            <option value="">Curso</option>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={novaTurmaId} onChange={e => setNovaTurmaId(e.target.value)} disabled={!novoCursoId} style={inputStyle}>
            <option value="">Turma</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} (vagas: {t.vagasDisponiveis})</option>)}
          </select>
          <button onClick={adicionarCurso} style={buttonStyle("secondary")}>Adicionar Curso</button>
          <div style={{ marginTop: 8, fontSize: 13, color: "#6b7a8f" }}>
            {dadosAluno.cursos.map((c: any) => (
              <div key={c.cursoId}>• {getCursoNome(c.cursoId)}</div>
            ))}
          </div>
        </div>

        {/* SERVIÇO */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <h3 style={{ fontSize: 16, margin: "0 0 12px" }}>Serviços de Saúde</h3>

          {/* Adicionar novo serviço */}
          <select value={novoServicoId} onChange={e => setNovoServicoId(e.target.value)} style={inputStyle}>
            <option value="">Adicionar serviço...</option>
            {tiposAtendimento
              .filter(t => !dadosAluno.servicosAtivos.some((s: any) => s.tipoId === t.id))
              .map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          {senhasDisponiveis[novoServicoId] && (
            <select value={novaSenhaId} onChange={e => setNovaSenhaId(e.target.value)} style={inputStyle}>
              <option value="">Senha</option>
              {senhasDisponiveis[novoServicoId].map(s => <option key={s.id} value={s.id}>{s.numero} - {s.tipo}</option>)}
            </select>
          )}
          {novoServicoId && (
            <button onClick={adicionarServico} disabled={processando} style={buttonStyle("secondary")}>
              {processando ? "Processando..." : "Adicionar Serviço"}
            </button>
          )}

          {/* Lista de serviços ativos com botões */}
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "#6b7a8f", margin: "0 0 8px", fontWeight: 600 }}>
              Serviços ativos:
            </p>
            {dadosAluno.servicosAtivos.length === 0 && (
              <p style={{ fontSize: 13, color: "#6b7a8f" }}>Nenhum serviço ativo.</p>
            )}
            {dadosAluno.servicosAtivos.map((s: any) => (
              <div
                key={s.tipoId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "#f8f9fa",
                  borderRadius: 6,
                  marginBottom: 6,
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 13, flex: 1 }}>• {getServicoNome(s.tipoId)}</span>
                <button
                  onClick={() => reenviarParaFila(s.tipoId)}
                  disabled={processando}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                    background: "#17a2b8",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                  title="Reenviar para a fila de espera"
                >
                  🔄 Reenviar para fila
                </button>
                <button
                  onClick={() => removerServico(s.tipoId)}
                  disabled={processando}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                    background: "#dc3545",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                  title="Remover este serviço"
                >
                  ❌ Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}