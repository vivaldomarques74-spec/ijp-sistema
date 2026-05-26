import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, getDocs, arrayUnion, runTransaction } from "firebase/firestore";
import { db } from "../services/firebase";

export default function AlunosEditar() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dadosAluno, setDadosAluno] = useState<any>({
    nomeCompleto: "", rg: "", cpf: "", endereco: "", email: "", telefone: "", nascimento: "", menor: false,
    responsavelNome: "", responsavelEmail: "", responsavelTelefone: "", responsavelCpf: "", responsavelRg: "",
    status: "ativo", observacoes: "", cursos: [], servicosAtivos: [],
  });

  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [tiposAtendimento, setTiposAtendimento] = useState<any[]>([]);
  const [novoCursoId, setNovoCursoId] = useState("");
  const [novaTurmaId, setNovaTurmaId] = useState("");

  useEffect(() => {
    const carregarAluno = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, "alunos", id));
      if (snap.exists()) {
        const data = snap.data();
        setDadosAluno({
          nomeCompleto: data.nomeCompleto || "", rg: data.rg || "", cpf: data.cpf || "", endereco: data.endereco || "",
          email: data.email || "", telefone: data.telefone || "", nascimento: data.nascimento || "", menor: data.menor || false,
          responsavelNome: data.responsavelNome || "", responsavelEmail: data.responsavelEmail || "",
          responsavelTelefone: data.responsavelTelefone || "", responsavelCpf: data.responsavelCpf || "", responsavelRg: data.responsavelRg || "",
          status: data.status || "ativo", observacoes: data.observacoes || "", cursos: Array.isArray(data.cursos) ? data.cursos : [],
          servicosAtivos: Array.isArray(data.servicosAtivos) ? data.servicosAtivos : [],
        });
      }
    };
    const carregarCursos = async () => {
      const snap = await getDocs(collection(db, "cursos"));
      setCursos(snap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
    };
    const carregarTipos = async () => {
      const snap = await getDocs(collection(db, "tiposAtendimento"));
      setTiposAtendimento(snap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
    };
    carregarAluno();
    carregarCursos();
    carregarTipos();
  }, [id]);

  useEffect(() => {
    if (!novoCursoId) { setTurmas([]); setNovaTurmaId(""); return; }
    const carregarTurmas = async () => {
      const snap = await getDocs(collection(db, "cursos", novoCursoId, "turmas"));
      setTurmas(snap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
    };
    carregarTurmas();
  }, [novoCursoId]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setDadosAluno((prev: any) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const toggleServico = (servicoId: string) => {
    setDadosAluno((prev: any) => ({
      ...prev,
      servicosAtivos: prev.servicosAtivos.includes(servicoId)
        ? prev.servicosAtivos.filter((id: string) => id !== servicoId)
        : [...prev.servicosAtivos, servicoId]
    }));
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
            if (vagas <= 0) throw new Error("Sem vagas");
            transaction.update(turmaRef, { alunos: arrayUnion(id), vagasDisponiveis: vagas - 1 });
          });
          cursosAtualizados.push({ cursoId: novoCursoId, turmaId: novaTurmaId, data: new Date() });
        }
      }

      await updateDoc(alunoRef, {
        nomeCompleto: dadosAluno.nomeCompleto, rg: dadosAluno.rg, cpf: dadosAluno.cpf,
        endereco: dadosAluno.endereco, email: dadosAluno.email, telefone: dadosAluno.telefone,
        nascimento: dadosAluno.nascimento, menor: dadosAluno.menor,
        responsavelNome: dadosAluno.responsavelNome, responsavelEmail: dadosAluno.responsavelEmail,
        responsavelTelefone: dadosAluno.responsavelTelefone, responsavelCpf: dadosAluno.responsavelCpf,
        responsavelRg: dadosAluno.responsavelRg, status: dadosAluno.status, observacoes: dadosAluno.observacoes,
        cursos: cursosAtualizados, servicosAtivos: dadosAluno.servicosAtivos, atualizadoEm: new Date(),
      });

      alert("Aluno atualizado");
      navigate("/alunos");
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Editar Aluno</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 500 }}>
        <input name="nomeCompleto" value={dadosAluno.nomeCompleto} onChange={handleChange} placeholder="Nome" />
        <input name="rg" value={dadosAluno.rg} onChange={handleChange} placeholder="RG" />
        <input name="cpf" value={dadosAluno.cpf} onChange={handleChange} placeholder="CPF" />
        <input name="endereco" value={dadosAluno.endereco} onChange={handleChange} placeholder="Endereço" />
        <input name="email" value={dadosAluno.email} onChange={handleChange} placeholder="Email" />
        <input name="telefone" value={dadosAluno.telefone} onChange={handleChange} placeholder="Telefone" />
        <input type="date" name="nascimento" value={dadosAluno.nascimento} onChange={handleChange} />
        <label><input type="checkbox" name="menor" checked={dadosAluno.menor} onChange={handleChange} /> Menor</label>

        {dadosAluno.menor && (
          <>
            <h3>Responsável</h3>
            <input name="responsavelNome" value={dadosAluno.responsavelNome} onChange={handleChange} placeholder="Nome" />
            <input name="responsavelEmail" value={dadosAluno.responsavelEmail} onChange={handleChange} placeholder="Email" />
            <input name="responsavelTelefone" value={dadosAluno.responsavelTelefone} onChange={handleChange} placeholder="Telefone" />
            <input name="responsavelCpf" value={dadosAluno.responsavelCpf} onChange={handleChange} placeholder="CPF" />
            <input name="responsavelRg" value={dadosAluno.responsavelRg} onChange={handleChange} placeholder="RG" />
          </>
        )}

        <h3>Status</h3>
        <select name="status" value={dadosAluno.status} onChange={handleChange}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
        <textarea name="observacoes" value={dadosAluno.observacoes} onChange={handleChange} placeholder="Observações" />

        <h3>Adicionar novo curso</h3>
        <select value={novoCursoId} onChange={e => setNovoCursoId(e.target.value)}>
          <option value="">Curso</option>
          {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={novaTurmaId} onChange={e => setNovaTurmaId(e.target.value)} disabled={!novoCursoId}>
          <option value="">Turma</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>

        <h3>Serviços de Saúde</h3>
        {tiposAtendimento.map(t => (
          <label key={t.id}>
            <input type="checkbox" checked={dadosAluno.servicosAtivos.includes(t.id)} onChange={() => toggleServico(t.id)} />
            {t.nome}
          </label>
        ))}

        <button onClick={salvar}>Salvar</button>
      </div>
    </div>
  );
}