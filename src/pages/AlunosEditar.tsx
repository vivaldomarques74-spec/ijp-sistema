import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, getDocs, arrayUnion, runTransaction, query, where } from "firebase/firestore";
import { db } from "../services/firebase";

type Senha = {
  id: string;
  numero: string;
  tipo: string;
  usado: boolean;
};

export default function AlunosEditar() {
  const { id } = useParams();
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
  const [senhasDisponiveis, setSenhasDisponiveis] = useState<Record<string, Senha[]>>({});
  const [carregandoSenhas, setCarregandoSenhas] = useState<Record<string, boolean>>({});
  const [novoCursoId, setNovoCursoId] = useState("");
  const [novaTurmaId, setNovaTurmaId] = useState("");

  // Carregar dados iniciais
  useEffect(() => {
    async function carregarDados() {
      // Carregar cursos
      const cursosSnap = await getDocs(collection(db, "cursos"));
      setCursos(cursosSnap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
      // Carregar tipos de atendimento
      const tiposSnap = await getDocs(collection(db, "tiposAtendimento"));
      setTiposAtendimento(tiposSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      // Carregar aluno
      if (id) {
        const alunoSnap = await getDoc(doc(db, "alunos", id));
        if (alunoSnap.exists()) {
          const data = alunoSnap.data();
          setDadosAluno({
            nomeCompleto: data.nomeCompleto || "", cpf: data.cpf || "", endereco: data.endereco || "",
            email: data.email || "", telefone: data.telefone || "", nascimento: data.nascimento || "", menor: data.menor || false,
            responsavelNome: data.responsavelNome || "", responsavelEmail: data.responsavelEmail || "",
            responsavelTelefone: data.responsavelTelefone || "", responsavelCpf: data.responsavelCpf || "",
            status: data.status || "ativo", observacoes: data.observacoes || "",
            cursos: Array.isArray(data.cursos) ? data.cursos : [],
            servicosAtivos: data.servicosAtivos || [],
          });
        }
      }
    }
    carregarDados();
  }, [id]);

  // Carregar senhas sempre que a lista de serviços ativos mudar (ex: ao marcar/desmarcar)
  useEffect(() => {
    const carregarSenhasParaServicos = async () => {
      const novosSenhas: Record<string, Senha[]> = {};
      const novosCarregando: Record<string, boolean> = {};
      for (const serv of dadosAluno.servicosAtivos) {
        const tipo = tiposAtendimento.find(t => t.id === serv.tipoId);
        if (tipo?.tipoAgendamento === "fila") {
          if (!senhasDisponiveis[serv.tipoId] && !carregandoSenhas[serv.tipoId]) {
            novosCarregando[serv.tipoId] = true;
            setCarregandoSenhas(prev => ({ ...prev, [serv.tipoId]: true }));
            try {
              const q = query(collection(db, "tiposAtendimento", serv.tipoId, "senhas"), where("usado", "==", false));
              const snap = await getDocs(q);
              let lista: Senha[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Senha));
              lista.sort((a, b) => {
                const numA = parseInt(a.numero.replace(/\D/g, ""), 10) || 0;
                const numB = parseInt(b.numero.replace(/\D/g, ""), 10) || 0;
                return numA - numB;
              });
              novosSenhas[serv.tipoId] = lista;
            } catch (error) {
              console.error(`Erro ao carregar senhas para ${serv.tipoId}:`, error);
            } finally {
              setCarregandoSenhas(prev => ({ ...prev, [serv.tipoId]: false }));
            }
          }
        }
      }
      setSenhasDisponiveis(prev => ({ ...prev, ...novosSenhas }));
    };
    if (tiposAtendimento.length > 0) {
      carregarSenhasParaServicos();
    }
  }, [dadosAluno.servicosAtivos, tiposAtendimento]);

  // Carregar turmas quando curso selecionado
  useEffect(() => {
    if (!novoCursoId) { setTurmas([]); setNovaTurmaId(""); return; }
    async function carregarTurmas() {
      const snap = await getDocs(collection(db, "cursos", novoCursoId, "turmas"));
      setTurmas(snap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
    }
    carregarTurmas();
  }, [novoCursoId]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setDadosAluno((prev: any) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const toggleServico = (tipoId: string, tipoAgendamento?: string) => {
    setDadosAluno((prev: any) => {
      const existe = prev.servicosAtivos.find((s: any) => s.tipoId === tipoId);
      if (existe) {
        return { ...prev, servicosAtivos: prev.servicosAtivos.filter((s: any) => s.tipoId !== tipoId) };
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
      const senhaData = senhaDoc.data() as Senha;
      setDadosAluno((prev: any) => ({
        ...prev,
        servicosAtivos: prev.servicosAtivos.map((s: any) =>
          s.tipoId === tipoId ? { ...s, senhaId, senhaNumero: senhaData.numero, prioridade: senhaData.tipo === "prioridade" } : s
        ),
      }));
    }
  };

  const salvar = async () => {
    try {
      if (!id) return;
      const alunoRef = doc(db, "alunos", id);
      let cursosAtualizados = [...dadosAluno.cursos];
      if (novoCursoId && novaTurmaId) {
        const jaExiste = cursosAtualizados.some((c: any) => c.cursoId === novoCursoId && c.turmaId === novaTurmaId);
        if (!jaExiste) {
          const turmaRef = doc(db, "cursos", novoCursoId, "turmas", novaTurmaId);
          await runTransaction(db, async (transaction) => {
            const turmaSnap = await transaction.get(turmaRef);
            if (!turmaSnap.exists()) throw new Error("Turma não existe");
            const vagas = turmaSnap.data().vagasDisponiveis ?? 0;
            if (vagas <= 0) throw new Error("Turma sem vagas");
            transaction.update(turmaRef, { alunos: arrayUnion(id), vagasDisponiveis: vagas - 1 });
          });
          cursosAtualizados.push({ cursoId: novoCursoId, turmaId: novaTurmaId, data: new Date() });
        }
      }
      await updateDoc(alunoRef, {
        ...dadosAluno,
        cursos: cursosAtualizados,
        servicosAtivos: dadosAluno.servicosAtivos,
        atualizadoEm: new Date(),
      });
      alert("Aluno atualizado com sucesso");
      navigate("/alunos");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      alert(error.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Editar Aluno</h1>
      <input name="nomeCompleto" value={dadosAluno.nomeCompleto} onChange={handleChange} placeholder="Nome completo" />
      <input name="cpf" value={dadosAluno.cpf} onChange={handleChange} placeholder="CPF" />
      <input name="endereco" value={dadosAluno.endereco} onChange={handleChange} placeholder="Endereço" />
      <input name="email" value={dadosAluno.email} onChange={handleChange} placeholder="Email" />
      <input name="telefone" value={dadosAluno.telefone} onChange={handleChange} placeholder="Telefone" />
      <input type="date" name="nascimento" value={dadosAluno.nascimento} onChange={handleChange} />
      <label><input type="checkbox" name="menor" checked={dadosAluno.menor} onChange={handleChange} /> Menor de idade</label>

      {dadosAluno.menor && (
        <>
          <h3>Responsável</h3>
          <input name="responsavelNome" value={dadosAluno.responsavelNome} onChange={handleChange} placeholder="Nome" />
          <input name="responsavelEmail" value={dadosAluno.responsavelEmail} onChange={handleChange} placeholder="Email" />
          <input name="responsavelTelefone" value={dadosAluno.responsavelTelefone} onChange={handleChange} placeholder="Telefone" />
          <input name="responsavelCpf" value={dadosAluno.responsavelCpf} onChange={handleChange} placeholder="CPF" />
        </>
      )}

      <h3>Status</h3>
      <select name="status" value={dadosAluno.status} onChange={handleChange}>
        <option value="ativo">Ativo</option>
        <option value="inativo">Inativo</option>
      </select>

      <textarea name="observacoes" value={dadosAluno.observacoes} onChange={handleChange} placeholder="Observações" />

      <h3>Adicionar em Novo Curso</h3>
      <select value={novoCursoId} onChange={e => setNovoCursoId(e.target.value)}>
        <option value="">Curso</option>
        {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <select value={novaTurmaId} onChange={e => setNovaTurmaId(e.target.value)} disabled={!novoCursoId}>
        <option value="">Turma</option>
        {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>

      <h3>Serviços de Saúde ativos</h3>
      {tiposAtendimento.map(t => {
        const servico = dadosAluno.servicosAtivos.find((s: any) => s.tipoId === t.id);
        const isFila = t.tipoAgendamento === "fila";
        return (
          <div key={t.id} style={{ marginBottom: 12 }}>
            <label>
              <input type="checkbox" checked={!!servico} onChange={() => toggleServico(t.id, t.tipoAgendamento)} />
              {t.nome}
            </label>
            {servico && isFila && (
              <div style={{ marginLeft: 24, marginTop: 4 }}>
                {carregandoSenhas[t.id] ? (
                  <span>Carregando senhas...</span>
                ) : (
                  <>
                    <select
                      value={servico.senhaId || ""}
                      onChange={e => selecionarSenha(t.id, e.target.value)}
                      style={{ width: 220, marginRight: 8 }}
                    >
                      <option value="">Selecione uma senha</option>
                      {senhasDisponiveis[t.id]?.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.numero} - {s.tipo === "prioridade" ? "Prioritário" : "Normal"}
                        </option>
                      ))}
                    </select>
                    {servico.senhaNumero && (
                      <span>
                        Senha selecionada: {servico.senhaNumero} {servico.prioridade && "(Prioritário)"}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
            {servico && !isFila && (
              <div style={{ marginLeft: 24, marginTop: 4 }}>
                <select
                  value={servico.modalidade}
                  onChange={e => {
                    setDadosAluno((prev: any) => ({
                      ...prev,
                      servicosAtivos: prev.servicosAtivos.map((s: any) =>
                        s.tipoId === t.id ? { ...s, modalidade: e.target.value as "presencial" | "online" } : s
                      ),
                    }));
                  }}
                  style={{ width: 150 }}
                >
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                </select>
              </div>
            )}
          </div>
        );
      })}

      <br />
      <button onClick={salvar}>Salvar Alterações</button>
    </div>
  );
}