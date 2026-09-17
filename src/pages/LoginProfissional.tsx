import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";

type Etapa = "codigo" | "criarSenha" | "digitarSenha";

export default function LoginProfissional() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>("codigo");
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [profissional, setProfissional] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);

  // 🔍 ETAPA 1: buscar profissional pelo código
  const buscarCodigo = async () => {
    if (!codigo.trim()) return alert("Informe o código");
    setCarregando(true);
    try {
      const q = query(collection(db, "profissionais"), where("codigo", "==", codigo.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("Código não encontrado");
        return;
      }
      const docProf = snap.docs[0];
      const profData = docProf.data();
      setProfissional({ id: docProf.id, ...profData });

      // Se já tem senha → etapa digitar senha
      // Se não tem senha → etapa criar senha
      if (profData.senha && profData.senha.length > 0) {
        setEtapa("digitarSenha");
      } else {
        setEtapa("criarSenha");
      }
    } catch (error: any) {
      alert(`Erro ao buscar código: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  // 🔐 ETAPA 2: criar senha
  const criarSenha = async () => {
    if (!senha || senha.length < 4) return alert("A senha deve ter pelo menos 4 caracteres");
    if (senha !== confirmarSenha) return alert("As senhas não coincidem");
    setCarregando(true);
    try {
      await updateDoc(doc(db, "profissionais", profissional.id), { senha });
      alert("Senha criada com sucesso! Bem-vindo(a).");

      // Armazena dados da sessão
      localStorage.setItem("profissionalAutenticado", "true");
      localStorage.setItem("profissionalId", profissional.id);
      localStorage.setItem("profissionalCodigo", profissional.codigo || "");
      localStorage.setItem("profissionalNome", profissional.nome || "");
      localStorage.setItem("profissionalTipo", profissional.tipo || "profissional");

      navigate(`/profissional/${profissional.codigo}/agenda`);
    } catch (error: any) {
      alert(`Erro ao criar senha: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  // 🔐 ETAPA 3: digitar senha existente
  const entrar = async () => {
    if (!senha) return alert("Informe a senha");
    setCarregando(true);
    try {
      if (profissional.senha !== senha) {
        alert("Senha incorreta");
        return;
      }

      localStorage.setItem("profissionalAutenticado", "true");
      localStorage.setItem("profissionalId", profissional.id);
      localStorage.setItem("profissionalCodigo", profissional.codigo || "");
      localStorage.setItem("profissionalNome", profissional.nome || "");
      localStorage.setItem("profissionalTipo", profissional.tipo || "profissional");

      navigate(`/profissional/${profissional.codigo}/agenda`);
    } catch (error: any) {
      alert(`Erro ao entrar: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const voltar = () => {
    setEtapa("codigo");
    setCodigo("");
    setSenha("");
    setConfirmarSenha("");
    setProfissional(null);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: 10,
    marginBottom: 12,
    border: "1px solid #ccc",
    borderRadius: 8,
    fontSize: 15,
  };

  const btnStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 20px",
    background: "#0070f3",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
  };

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 20 }}>
      <h1 style={{ marginBottom: 24 }}>Acesso Profissional</h1>

      {/* ETAPA 1: CÓDIGO */}
      {etapa === "codigo" && (
        <>
          <input
            placeholder="Código (ex: PRO001)"
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            onKeyDown={e => e.key === "Enter" && buscarCodigo()}
            style={inputStyle}
            autoFocus
          />
          <button onClick={buscarCodigo} disabled={carregando} style={btnStyle}>
            {carregando ? "Verificando..." : "Continuar"}
          </button>
        </>
      )}

      {/* ETAPA 2: CRIAR SENHA */}
      {etapa === "criarSenha" && profissional && (
        <>
          <p style={{ color: "#6b7a8f", marginBottom: 16 }}>
            Olá, <strong>{profissional.nome}</strong>! É seu primeiro acesso. Crie uma senha:
          </p>
          <input
            type="password"
            placeholder="Nova senha (mín. 4 caracteres)"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            style={inputStyle}
            autoFocus
          />
          <input
            type="password"
            placeholder="Confirme a senha"
            value={confirmarSenha}
            onChange={e => setConfirmarSenha(e.target.value)}
            onKeyDown={e => e.key === "Enter" && criarSenha()}
            style={inputStyle}
          />
          <button onClick={criarSenha} disabled={carregando} style={btnStyle}>
            {carregando ? "Criando..." : "Criar senha e entrar"}
          </button>
          <button
            onClick={voltar}
            style={{ ...btnStyle, background: "#6c757d", marginTop: 8 }}
          >
            Voltar
          </button>
        </>
      )}

      {/* ETAPA 3: DIGITAR SENHA */}
      {etapa === "digitarSenha" && profissional && (
        <>
          <p style={{ color: "#6b7a8f", marginBottom: 16 }}>
            Olá, <strong>{profissional.nome}</strong>! Informe sua senha:
          </p>
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === "Enter" && entrar()}
            style={inputStyle}
            autoFocus
          />
          <button onClick={entrar} disabled={carregando} style={btnStyle}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
          <button
            onClick={voltar}
            style={{ ...btnStyle, background: "#6c757d", marginTop: 8 }}
          >
            Voltar
          </button>
        </>
      )}
    </div>
  );
}