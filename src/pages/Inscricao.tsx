import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

// Tipos para os dados do curso e turma
interface TurmaData {
  id: string;
  nome: string;
  vagasDisponiveis: number;
  vagasTotales?: number;
  // outros campos que a turma possa ter
}

interface CursoData {
  id: string;
  nome: string;
  // outros campos que o curso possa ter
}

export default function Inscricao() {
  const [searchParams] = useSearchParams();
  const turmaId = searchParams.get("turmaId");
  const navigate = useNavigate();

  const [curso, setCurso] = useState<CursoData | null>(null);
  const [turma, setTurma] = useState<TurmaData | null>(null);
  const [vagasDisponiveis, setVagasDisponiveis] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const [form, setForm] = useState({
    nomeCompleto: "",
    cpf: "",
    email: "",
    telefone: "",
    endereco: "",
    nascimento: "",
  });

  useEffect(() => {
    if (!turmaId) {
      setErro("Turma não especificada.");
      setCarregando(false);
      return;
    }
    const carregarDados = async () => {
      try {
        // Buscar todos os cursos
        const cursosSnap = await getDocs(collection(db, "cursos"));
        let cursoEncontrado: CursoData | null = null;
        let turmaEncontrada: TurmaData | null = null;

        // Para cada curso, procurar a turma com o ID informado
        for (const cursoDoc of cursosSnap.docs) {
          const turmasSnap = await getDocs(collection(db, "cursos", cursoDoc.id, "turmas"));
          const turmaDoc = turmasSnap.docs.find(doc => doc.id === turmaId);
          if (turmaDoc) {
            cursoEncontrado = { id: cursoDoc.id, ...cursoDoc.data() } as CursoData;
            turmaEncontrada = { id: turmaDoc.id, ...turmaDoc.data() } as TurmaData;
            break;
          }
        }

        if (!cursoEncontrado || !turmaEncontrada) {
          setErro("Turma não encontrada.");
          setCarregando(false);
          return;
        }

        setCurso(cursoEncontrado);
        setTurma(turmaEncontrada);
        setVagasDisponiveis(turmaEncontrada.vagasDisponiveis || 0);
      } catch (error) {
        console.error(error);
        setErro("Erro ao carregar dados.");
      } finally {
        setCarregando(false);
      }
    };
    carregarDados();
  }, [turmaId]);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaId) return alert("Turma inválida");
    if (vagasDisponiveis <= 0) return alert("Vagas esgotadas!");

    // Verificar se já existe inscrição com este CPF para esta turma
    const q = query(
      collection(db, "inscricoes"),
      where("turmaId", "==", turmaId),
      where("cpf", "==", form.cpf)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      alert("Já existe uma inscrição com este CPF para esta turma.");
      return;
    }

    try {
      await addDoc(collection(db, "inscricoes"), {
        ...form,
        turmaId,
        cursoId: curso?.id,
        status: "pendente",
        createdAt: new Date(),
      });
      setSucesso(true);
      setTimeout(() => navigate("/"), 5000);
    } catch (error) {
      console.error(error);
      alert("Erro ao realizar inscrição. Tente novamente.");
    }
  };

  if (carregando) return <div style={{ padding: 20 }}>Carregando...</div>;
  if (erro) return <div style={{ padding: 20, color: "red" }}>{erro}</div>;
  if (vagasDisponiveis <= 0) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <h2>Vagas encerradas</h2>
        <p>As vagas para este curso foram preenchidas.</p>
      </div>
    );
  }
  if (sucesso) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <h2>Inscrição realizada com sucesso!</h2>
        <p>Aguarde a aprovação da coordenação.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 20 }}>
      <h1>Inscrição - {curso?.nome}</h1>
      <p>Turma: <strong>{turma?.nome}</strong></p>
      <p>Vagas disponíveis: <strong>{vagasDisponiveis}</strong></p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="nomeCompleto"
          placeholder="Nome completo *"
          required
          value={form.nomeCompleto}
          onChange={handleChange}
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
        />
        <input
          type="text"
          name="cpf"
          placeholder="CPF *"
          required
          value={form.cpf}
          onChange={handleChange}
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
        />
        <input
          type="email"
          name="email"
          placeholder="Email *"
          required
          value={form.email}
          onChange={handleChange}
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
        />
        <input
          type="tel"
          name="telefone"
          placeholder="Telefone *"
          required
          value={form.telefone}
          onChange={handleChange}
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
        />
        <input
          type="text"
          name="endereco"
          placeholder="Endereço"
          value={form.endereco}
          onChange={handleChange}
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
        />
        <input
          type="date"
          name="nascimento"
          placeholder="Data de nascimento"
          value={form.nascimento}
          onChange={handleChange}
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
        />
        <button type="submit" style={{ padding: "10px 20px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 4 }}>
          Inscrever-se
        </button>
      </form>
    </div>
  );
}