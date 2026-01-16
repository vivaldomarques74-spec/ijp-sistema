import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";

interface Curso {
  id: string;
  nome: string;
}

interface Turma {
  id: string;
  nome: string;
}

export default function AlunosCadastrar() {
  const navigate = useNavigate();
  const storage = getStorage();

  // dados do aluno
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [rg, setRg] = useState("");
  const [cpf, setCpf] = useState("");
  const [endereco, setEndereco] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  // FOTO
  const [foto, setFoto] = useState<File | null>(null);

  // menor
  const [menor, setMenor] = useState(false);

  // responsável
  const [respNome, setRespNome] = useState("");
  const [respRg, setRespRg] = useState("");
  const [respCpf, setRespCpf] = useState("");
  const [respEmail, setRespEmail] = useState("");
  const [respTelefone, setRespTelefone] = useState("");

  // curso / turma
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [cursoId, setCursoId] = useState("");
  const [turmaId, setTurmaId] = useState("");

  useEffect(() => {
    const carregarCursos = async () => {
      const snap = await getDocs(collection(db, "cursos"));
      setCursos(
        snap.docs.map((d) => ({
          id: d.id,
          nome: d.data().nome,
        }))
      );
    };

    carregarCursos();
  }, []);

  useEffect(() => {
    if (!cursoId) return;

    const carregarTurmas = async () => {
      const snap = await getDocs(collection(db, "cursos", cursoId, "turmas"));
      setTurmas(
        snap.docs.map((d) => ({
          id: d.id,
          nome: d.data().nome,
        }))
      );
    };

    carregarTurmas();
  }, [cursoId]);

  const salvarAluno = async () => {
    try {
      // 🔎 LOG TEMPORÁRIO PARA DEBUG
      console.log("DB:", db);

      if (
        !nomeCompleto ||
        !rg ||
        !cpf ||
        !endereco ||
        !email ||
        !telefone ||
        !cursoId ||
        !turmaId
      ) {
        alert("Preencha todos os campos obrigatórios");
        return;
      }

      if (menor) {
        if (!respNome || !respRg || !respCpf || !respEmail || !respTelefone) {
          alert("Preencha todos os dados do responsável");
          return;
        }
      }

      let fotoURL: string | null = null;

      if (foto) {
        try {
          const fotoRef = ref(
            storage,
            `alunos/${Date.now()}_${foto.name}`
          );
          await uploadBytes(fotoRef, foto);
          fotoURL = await getDownloadURL(fotoRef);
        } catch (err) {
          console.error("Erro ao subir foto:", err);
          alert("A foto não pôde ser enviada, mas o aluno será cadastrado.");
        }
      }

      await addDoc(collection(db, "alunos"), {
        nomeCompleto,
        rg,
        cpf,
        endereco,
        email,
        telefone,
        fotoURL,
        menorDeIdade: menor,
        responsavel: menor
          ? {
              nome: respNome,
              rg: respRg,
              cpf: respCpf,
              email: respEmail,
              telefone: respTelefone,
            }
          : null,
        cursoAtualId: cursoId,
        turmaAtualId: turmaId,
        createdAt: Timestamp.now(),
      });

      alert("Aluno cadastrado com sucesso!");
      navigate("/alunos");
    } catch (error) {
      console.error("Erro ao salvar aluno:", error);
      alert("Erro ao salvar aluno. Verifique o console.");
    }
  };

  return (
    <div className="container">
      <h1>Cadastrar Aluno</h1>

      <h3>Dados do Aluno</h3>

      <input
        placeholder="Nome completo"
        value={nomeCompleto}
        onChange={(e) => setNomeCompleto(e.target.value)}
      />
      <input placeholder="RG" value={rg} onChange={(e) => setRg(e.target.value)} />
      <input placeholder="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} />
      <input
        placeholder="Endereço"
        value={endereco}
        onChange={(e) => setEndereco(e.target.value)}
      />
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        placeholder="Telefone"
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
      />

      <label>Foto do aluno</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFoto(e.target.files?.[0] || null)}
      />

      <hr />

      <label>
        <input
          type="checkbox"
          checked={menor}
          onChange={(e) => setMenor(e.target.checked)}
        />{" "}
        Aluno é menor de idade
      </label>

      {menor && (
        <>
          <h3>Dados do Responsável</h3>
          <input
            placeholder="Nome do responsável"
            value={respNome}
            onChange={(e) => setRespNome(e.target.value)}
          />
          <input
            placeholder="RG do responsável"
            value={respRg}
            onChange={(e) => setRespRg(e.target.value)}
          />
          <input
            placeholder="CPF do responsável"
            value={respCpf}
            onChange={(e) => setRespCpf(e.target.value)}
          />
          <input
            placeholder="Email do responsável"
            value={respEmail}
            onChange={(e) => setRespEmail(e.target.value)}
          />
          <input
            placeholder="Telefone do responsável"
            value={respTelefone}
            onChange={(e) => setRespTelefone(e.target.value)}
          />
        </>
      )}

      <hr />

      <h3>Curso e Turma</h3>

      <select value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
        <option value="">Selecione o curso</option>
        {cursos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>

      <select
        value={turmaId}
        onChange={(e) => setTurmaId(e.target.value)}
        disabled={!cursoId}
      >
        <option value="">Selecione a turma</option>
        {turmas.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome}
          </option>
        ))}
      </select>

      <br />
      <br />

      <button onClick={salvarAluno}>Salvar Aluno</button>
    </div>
  );
}
