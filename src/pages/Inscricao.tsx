import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { collection, getDoc, doc, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

export default function Inscricao() {
  const [searchParams] = useSearchParams();
  const cursoId = searchParams.get("cursoId");
  const navigate = useNavigate();

  const [curso, setCurso] = useState<any>(null);
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
    if (!cursoId) {
      setErro("Curso não especificado.");
      setCarregando(false);
      return;
    }
    const carregarCurso = async () => {
      const cursoSnap = await getDoc(doc(db, "cursos", cursoId));
      if (!cursoSnap.exists()) {
        setErro("Curso não encontrado.");
        setCarregando(false);
        return;
      }
      const data = cursoSnap.data();
      setCurso({ id: cursoId, ...data });
      setVagasDisponiveis(data.vagasDisponiveis || 0);
      setCarregando(false);
    };
    carregarCurso();
  }, [cursoId]);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoId) return alert("Curso inválido");
    if (vagasDisponiveis <= 0) return alert("Vagas esgotadas!");

    const q = query(
      collection(db, "inscricoes"),
      where("cursoId", "==", cursoId),
      where("cpf", "==", form.cpf)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      alert("Já existe uma inscrição com este CPF para este curso.");
      return;
    }

    try {
      await addDoc(collection(db, "inscricoes"), {
        ...form,
        cursoId,
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