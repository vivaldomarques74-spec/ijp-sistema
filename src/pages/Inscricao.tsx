import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

interface TurmaData {
  id: string;
  nome: string;
  vagasDisponiveis: number;
}

interface CursoData {
  id: string;
  nome: string;
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
  const [menor, setMenor] = useState(false);

  const [form, setForm] = useState({
    nomeCompleto: "",
    cpf: "",
    email: "",
    telefone: "",
    endereco: "",
    nascimento: "",
    responsavelNome: "",
    responsavelCpf: "",
    responsavelTelefone: "",
    responsavelEmail: "",
  });

  useEffect(() => {
    if (!turmaId) {
      setErro("Turma não especificada.");
      setCarregando(false);
      return;
    }
    const carregarDados = async () => {
      try {
        const cursosSnap = await getDocs(collection(db, "cursos"));
        let cursoEncontrado: CursoData | null = null;
        let turmaEncontrada: TurmaData | null = null;

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
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setMenor(checked);
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaId) return alert("Turma inválida");
    if (vagasDisponiveis <= 0) return alert("Vagas esgotadas!");
    if (form.cpf.length < 11) return alert("CPF inválido (mínimo 11 dígitos)");

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

    if (menor) {
      if (!form.responsavelNome) return alert("Informe o nome do responsável");
      if (!form.responsavelCpf || form.responsavelCpf.length < 11) return alert("CPF do responsável inválido");
    }

    try {
      await addDoc(collection(db, "inscricoes"), {
        ...form,
        turmaId,
        cursoId: curso?.id,
        status: "pendente",
        menor,
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
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 20, background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <h1 style={{ fontSize: 24, margin: "0 0 4px", color: "#1a2a4f" }}>Inscrição</h1>
      <p style={{ fontSize: 14, color: "#6b7a8f", margin: "0 0 20px" }}>
        Curso: <strong>{curso?.nome}</strong> &nbsp;|&nbsp; Turma: <strong>{turma?.nome}</strong> &nbsp;|&nbsp; Vagas: <strong>{vagasDisponiveis}</strong>
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#1a2a4f" }}>Nome completo *</label>
          <input type="text" name="nomeCompleto" required value={form.nomeCompleto} onChange={handleChange} style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#1a2a4f" }}>CPF *</label>
          <input type="text" name="cpf" required value={form.cpf} onChange={handleChange} style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#1a2a4f" }}>Email *</label>
          <input type="email" name="email" required value={form.email} onChange={handleChange} style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#1a2a4f" }}>Telefone *</label>
          <input type="tel" name="telefone" required value={form.telefone} onChange={handleChange} style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#1a2a4f" }}>Endereço</label>
          <input type="text" name="endereco" value={form.endereco} onChange={handleChange} style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#1a2a4f" }}>Data de nascimento *</label>
          <input type="date" name="nascimento" required value={form.nascimento} onChange={handleChange} style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="menor" checked={menor} onChange={handleChange} />
          <label style={{ fontSize: 13, fontWeight: 500, color: "#1a2a4f" }}>Menor de idade</label>
        </div>

        {menor && (
          <div style={{ padding: 16, background: "#f8f9fa", borderRadius: 8, display: "flex", flexDirection: "column", gap: 12 }}>
            <h4 style={{ margin: 0, fontSize: 14, color: "#1a2a4f" }}>Dados do responsável</h4>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#1a2a4f" }}>Nome do responsável *</label>
              <input type="text" name="responsavelNome" required={menor} value={form.responsavelNome} onChange={handleChange} style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#1a2a4f" }}>CPF do responsável *</label>
              <input type="text" name="responsavelCpf" required={menor} value={form.responsavelCpf} onChange={handleChange} style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#1a2a4f" }}>Telefone do responsável *</label>
              <input type="tel" name="responsavelTelefone" required={menor} value={form.responsavelTelefone} onChange={handleChange} style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#1a2a4f" }}>Email do responsável</label>
              <input type="email" name="responsavelEmail" value={form.responsavelEmail} onChange={handleChange} style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 8 }} />
            </div>
          </div>
        )}

        <button type="submit" style={{ padding: "10px 20px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, marginTop: 8 }}>
          Inscrever-se
        </button>
      </form>
    </div>
  );
}