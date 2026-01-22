import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../services/firebase";

export default function EditarAluno() {
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

    cursos: [], // 🔹 HISTÓRICO DE CURSOS
  });

  const [foto, setFoto] = useState<File | null>(null);
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [novoCursoId, setNovoCursoId] = useState("");
  const [novaTurmaId, setNovaTurmaId] = useState("");

  // 🔹 CARREGAR ALUNO
  useEffect(() => {
    async function carregarAluno() {
      if (!id) return;

      const refAluno = doc(db, "alunos", id);
      const snap = await getDoc(refAluno);

      if (snap.exists()) {
        setDadosAluno({ id: snap.id, ...snap.data() });
      }
    }

    carregarAluno();
  }, [id]);

  // 🔹 CARREGAR CURSOS
  useEffect(() => {
    async function carregarCursos() {
      const snap = await getDocs(collection(db, "cursos"));
      setCursos(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    }

    carregarCursos();
  }, []);

  // 🔹 CARREGAR TURMAS DO NOVO CURSO
  useEffect(() => {
    if (!novoCursoId) {
      setTurmas([]);
      return;
    }

    async function carregarTurmas() {
      const snap = await getDocs(
        collection(db, "cursos", novoCursoId, "turmas")
      );

      setTurmas(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
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

      const refAluno = doc(db, "alunos", id);

      // 🖼️ UPLOAD DE FOTO
      let fotoURL = dadosAluno.fotoURL;

      if (foto) {
        const fotoRef = ref(storage, `alunos/${id}/foto.jpg`);
        await uploadBytes(fotoRef, foto);
        fotoURL = await getDownloadURL(fotoRef);
      }

      // 🎓 ADICIONAR NOVO CURSO (SEM APAGAR OS ANTIGOS)
      let cursosAtualizados = dadosAluno.cursos || [];

      if (novoCursoId && novaTurmaId) {
        cursosAtualizados = [
          ...cursosAtualizados,
          {
            cursoId: novoCursoId,
            turmaId: novaTurmaId,
            data: new Date(),
          },
        ];
      }

      await updateDoc(refAluno, {
        ...dadosAluno,
        fotoURL,
        cursos: cursosAtualizados,
        atualizadoEm: new Date(),
      });

      alert("Aluno atualizado com sucesso");
      navigate("/alunos");
    } catch (error) {
      console.error("Erro ao atualizar aluno:", error);
      alert("Erro ao salvar alterações");
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

      <label>
        <input type="checkbox" name="menor" checked={dadosAluno.menor} onChange={handleChange} />
        Aluno é menor
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

      <textarea
        name="observacoes"
        value={dadosAluno.observacoes}
        onChange={handleChange}
        placeholder="Observações"
      />

      <h3>Foto do Aluno</h3>
      <input type="file" onChange={(e) => setFoto(e.target.files?.[0] || null)} />

      <h3>Cadastrar em Novo Curso</h3>
      <select value={novoCursoId} onChange={(e) => setNovoCursoId(e.target.value)}>
        <option value="">Selecione o curso</option>
        {cursos.map((c) => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>

      <select value={novaTurmaId} onChange={(e) => setNovaTurmaId(e.target.value)}>
        <option value="">Selecione a turma</option>
        {turmas.map((t) => (
          <option key={t.id} value={t.id}>{t.nome}</option>
        ))}
      </select>

      <br /><br />

      <button onClick={salvar}>Salvar Alterações</button>
    </div>
  );
}
