import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, getDocs, arrayUnion, runTransaction } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../services/firebase";

export default function AlunosEditar() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dadosAluno, setDadosAluno] = useState<any>({
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
    status: "ativo",
    observacoes: "",
    cursos: [],
    fotoURL: "",
  });

  const [foto, setFoto] = useState<File | null>(null);
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [novoCursoId, setNovoCursoId] = useState("");
  const [novaTurmaId, setNovaTurmaId] = useState("");

  // Carregar aluno
  useEffect(() => {
    async function carregarAluno() {
      if (!id) return;
      const snap = await getDoc(doc(db, "alunos", id));
      if (snap.exists()) {
        const data = snap.data();
        setDadosAluno({
          nomeCompleto: data.nomeCompleto || "",
          rg: data.rg || "",
          cpf: data.cpf || "",
          endereco: data.endereco || "",
          email: data.email || "",
          telefone: data.telefone || "",
          nascimento: data.nascimento || "",
          menor: data.menor || false,
          responsavelNome: data.responsavelNome || "",
          responsavelEmail: data.responsavelEmail || "",
          responsavelTelefone: data.responsavelTelefone || "",
          responsavelCpf: data.responsavelCpf || "",
          responsavelRg: data.responsavelRg || "",
          status: data.status || "ativo",
          observacoes: data.observacoes || "",
          cursos: Array.isArray(data.cursos) ? data.cursos : [],
          fotoURL: data.fotoURL || "",
        });
      }
    }
    carregarAluno();
  }, [id]);

  // Carregar cursos
  useEffect(() => {
    async function carregarCursos() {
      const snap = await getDocs(collection(db, "cursos"));
      setCursos(snap.docs.map((d) => ({ id: d.id, nome: d.data().nome })));
    }
    carregarCursos();
  }, []);

  // Carregar turmas do curso selecionado
  useEffect(() => {
    if (!novoCursoId) {
      setTurmas([]);
      setNovaTurmaId("");
      return;
    }
    async function carregarTurmas() {
      const snap = await getDocs(collection(db, "cursos", novoCursoId, "turmas"));
      setTurmas(snap.docs.map((d) => ({ id: d.id, nome: d.data().nome })));
    }
    carregarTurmas();
  }, [novoCursoId]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setDadosAluno((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const salvar = async () => {
    try {
      if (!id) return;
      const alunoRef = doc(db, "alunos", id);

      // Upload da nova foto (se houver)
      let fotoURL = dadosAluno.fotoURL;
      if (foto) {
        const fotoRef = ref(storage, `alunos/${id}/foto.jpg`);
        await uploadBytes(fotoRef, foto);
        fotoURL = await getDownloadURL(fotoRef);
      }

      // Adicionar novo curso/turma se selecionado
      let cursosAtualizados = [...dadosAluno.cursos];
      if (novoCursoId && novaTurmaId) {
        const jaExiste = cursosAtualizados.some(
          (c: any) => c.cursoId === novoCursoId && c.turmaId === novaTurmaId
        );
        if (!jaExiste) {
          const turmaRef = doc(db, "cursos", novoCursoId, "turmas", novaTurmaId);
          await runTransaction(db, async (transaction) => {
            const turmaSnap = await transaction.get(turmaRef);
            if (!turmaSnap.exists()) throw new Error("Turma não existe");
            const vagas = turmaSnap.data().vagasDisponiveis ?? 0;
            if (vagas <= 0) throw new Error("Turma sem vagas disponíveis");
            transaction.update(turmaRef, {
              alunos: arrayUnion(id),
              vagasDisponiveis: vagas - 1,
            });
          });
          cursosAtualizados.push({
            cursoId: novoCursoId,
            turmaId: novaTurmaId,
            data: new Date(),
          });
        }
      }

      // Atualizar documento do aluno
      await updateDoc(alunoRef, {
        nomeCompleto: dadosAluno.nomeCompleto,
        rg: dadosAluno.rg,
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
        responsavelRg: dadosAluno.responsavelRg,
        status: dadosAluno.status,
        observacoes: dadosAluno.observacoes,
        fotoURL,
        cursos: cursosAtualizados,
        atualizadoEm: new Date(),
      });

      alert("Aluno atualizado com sucesso");
      navigate("/alunos");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Erro ao salvar alterações");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Editar Aluno</h1>

      <input name="nomeCompleto" value={dadosAluno.nomeCompleto} onChange={handleChange} placeholder="Nome completo" />
      <input name="rg" value={dadosAluno.rg} onChange={handleChange} placeholder="RG" />
      <input name="cpf" value={dadosAluno.cpf} onChange={handleChange} placeholder="CPF" />
      <input name="endereco" value={dadosAluno.endereco} onChange={handleChange} placeholder="Endereço" />
      <input name="email" value={dadosAluno.email} onChange={handleChange} placeholder="Email" />
      <input name="telefone" value={dadosAluno.telefone} onChange={handleChange} placeholder="Telefone" />
      <input type="date" name="nascimento" value={dadosAluno.nascimento} onChange={handleChange} placeholder="Data nascimento" />

      <label>
        <input type="checkbox" name="menor" checked={dadosAluno.menor} onChange={handleChange} /> Aluno é menor
      </label>

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

      <h3>Foto atual</h3>
      {dadosAluno.fotoURL && <img src={dadosAluno.fotoURL} width="100" alt="Foto atual" />}
      <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] || null)} />
      {foto && <img src={URL.createObjectURL(foto)} width="100" alt="Nova foto" />}

      <h3>Adicionar em Novo Curso</h3>
      <select value={novoCursoId} onChange={(e) => setNovoCursoId(e.target.value)}>
        <option value="">Curso</option>
        {cursos.map((c) => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>

      <select value={novaTurmaId} onChange={(e) => setNovaTurmaId(e.target.value)}>
        <option value="">Turma</option>
        {turmas.map((t) => (
          <option key={t.id} value={t.id}>{t.nome}</option>
        ))}
      </select>

      <br /><br />
      <button onClick={salvar}>Salvar Alterações</button>
    </div>
  );
}