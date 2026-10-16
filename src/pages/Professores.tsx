import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";

interface Professor {
  id: string;
  nome: string;
  formacao?: string;
  profissao?: string;
  tipoRegistro?: string;
  conselho?: string;
  numeroRegistro?: string;
  rg?: string;
  situacao: "ativo" | "inativo";
  createdAt?: any;
}

export default function Professores() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState<"todos" | "ativo" | "inativo">("todos");

  const [form, setForm] = useState({
    nome: "",
    formacao: "",
    profissao: "",
    tipoRegistro: "",
    conselho: "",
    numeroRegistro: "",
    rg: "",
    situacao: "ativo" as "ativo" | "inativo",
  });

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    setCarregando(true);
    try {
      const snap = await getDocs(collection(db, "professores"));
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() } as Professor));
      lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      setProfessores(lista);
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const limparForm = () => {
    setForm({
      nome: "",
      formacao: "",
      profissao: "",
      tipoRegistro: "",
      conselho: "",
      numeroRegistro: "",
      rg: "",
      situacao: "ativo",
    });
    setEditandoId(null);
  };

  const salvar = async () => {
    if (!form.nome.trim()) return alert("Informe o nome do professor");
    setSalvando(true);
    try {
      const dados: any = {
        nome: form.nome.trim(),
        formacao: form.formacao.trim(),
        profissao: form.profissao.trim(),
        tipoRegistro: form.tipoRegistro.trim(),
        conselho: form.conselho.trim(),
        numeroRegistro: form.numeroRegistro.trim(),
        rg: form.rg.trim(),
        situacao: form.situacao,
        updatedAt: new Date(),
      };

      if (editandoId) {
        await updateDoc(doc(db, "professores", editandoId), dados);
        alert("Professor atualizado!");
      } else {
        await addDoc(collection(db, "professores"), {
          ...dados,
          createdAt: new Date(),
        });
        alert("Professor cadastrado!");
      }
      limparForm();
      carregar();
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const editar = (p: Professor) => {
    setEditandoId(p.id);
    setForm({
      nome: p.nome || "",
      formacao: p.formacao || "",
      profissao: p.profissao || "",
      tipoRegistro: p.tipoRegistro || "",
      conselho: p.conselho || "",
      numeroRegistro: p.numeroRegistro || "",
      rg: p.rg || "",
      situacao: p.situacao || "ativo",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const excluir = async (p: Professor) => {
    if (!window.confirm(`Excluir o professor "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteDoc(doc(db, "professores", p.id));
      alert("Professor excluído.");
      carregar();
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    }
  };

  const alterarSituacao = async (p: Professor) => {
    const nova = p.situacao === "ativo" ? "inativo" : "ativo";
    if (!window.confirm(`Marcar "${p.nome}" como ${nova.toUpperCase()}?`)) return;
    try {
      await updateDoc(doc(db, "professores", p.id), { situacao: nova });
      carregar();
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    }
  };

  const handleChange = (campo: string, valor: any) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
  };

  const professoresFiltrados = professores.filter(p => {
    if (filtroSituacao !== "todos" && p.situacao !== filtroSituacao) return false;
    if (busca.trim()) {
      const b = busca.toLowerCase();
      return (
        (p.nome || "").toLowerCase().includes(b) ||
        (p.profissao || "").toLowerCase().includes(b) ||
        (p.numeroRegistro || "").toLowerCase().includes(b)
      );
    }
    return true;
  });

  const sInput = { width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8, marginBottom: 12 };

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ color: "#1a2a4f", marginTop: 0 }}>Professores</h1>
      <p style={{ color: "#6b7a8f", marginBottom: 20 }}>
        Cadastre os professores que assinam os certificados dos cursos.
        Serão vinculados às turmas e utilizados automaticamente nos certificados.
      </p>

      {/* FORMULÁRIO */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, color: "#1a2a4f", marginTop: 0 }}>
          {editandoId ? "✏️ Editando professor" : "➕ Novo professor"}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6, fontSize: 13 }}>
              Nome completo *
            </label>
            <input
              type="text"
              value={form.nome}
              onChange={e => handleChange("nome", e.target.value)}
              placeholder="Ex: Maria Silva Santos"
              style={sInput}
            />
          </div>

          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6, fontSize: 13 }}>
              Formação / Titulação
            </label>
            <input
              type="text"
              value={form.formacao}
              onChange={e => handleChange("formacao", e.target.value)}
              placeholder="Ex: Graduação em Letras"
              style={sInput}
            />
          </div>

          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6, fontSize: 13 }}>
              Profissão / Função
            </label>
            <input
              type="text"
              value={form.profissao}
              onChange={e => handleChange("profissao", e.target.value)}
              placeholder="Ex: Professora de LIBRAS"
              style={sInput}
            />
          </div>

          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6, fontSize: 13 }}>
              Tipo de registro profissional
            </label>
            <input
              type="text"
              value={form.tipoRegistro}
              onChange={e => handleChange("tipoRegistro", e.target.value)}
              placeholder="Ex: CRP, CRM, CREF, OAB (opcional)"
              style={sInput}
            />
          </div>

          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6, fontSize: 13 }}>
              Conselho profissional
            </label>
            <input
              type="text"
              value={form.conselho}
              onChange={e => handleChange("conselho", e.target.value)}
              placeholder="Ex: Conselho Regional de Psicologia (opcional)"
              style={sInput}
            />
          </div>

          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6, fontSize: 13 }}>
              Número do registro
            </label>
            <input
              type="text"
              value={form.numeroRegistro}
              onChange={e => handleChange("numeroRegistro", e.target.value)}
              placeholder="Ex: 06/12345 (opcional)"
              style={sInput}
            />
          </div>

          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6, fontSize: 13 }}>
              RG (interno)
            </label>
            <input
              type="text"
              value={form.rg}
              onChange={e => handleChange("rg", e.target.value)}
              placeholder="Uso administrativo interno (opcional)"
              style={sInput}
            />
            <p style={{ fontSize: 11, color: "#6b7a8f", margin: "-8px 0 12px" }}>
              🔒 Não aparece no certificado.
            </p>
          </div>

          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6, fontSize: 13 }}>
              Situação
            </label>
            <select
              value={form.situacao}
              onChange={e => handleChange("situacao", e.target.value)}
              style={sInput}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button
            onClick={salvar}
            disabled={salvando}
            style={{
              padding: "10px 24px",
              background: salvando ? "#999" : "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: salvando ? "wait" : "pointer",
              fontWeight: 600,
            }}
          >
            {salvando ? "Salvando..." : editandoId ? "💾 Salvar" : "➕ Cadastrar"}
          </button>
          {editandoId && (
            <button
              onClick={limparForm}
              style={{
                padding: "10px 24px",
                background: "#6c757d",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* LISTA */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="🔍 Buscar por nome, profissão ou registro..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8, flex: "1 1 300px" }}
          />
          <select
            value={filtroSituacao}
            onChange={e => setFiltroSituacao(e.target.value as any)}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          >
            <option value="todos">Todos</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
          <span style={{ fontSize: 13, color: "#6b7a8f" }}>
            {professoresFiltrados.length} professor(es)
          </span>
        </div>

        {carregando && <p>Carregando...</p>}
        {!carregando && professoresFiltrados.length === 0 && (
          <p style={{ color: "#6b7a8f" }}>
            {professores.length === 0
              ? "Nenhum professor cadastrado ainda."
              : "Nenhum resultado para os filtros aplicados."}
          </p>
        )}

        {!carregando && professoresFiltrados.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Nome</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Profissão</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Registro</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Situação</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 13, color: "#6b7a8f" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {professoresFiltrados.map(p => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f0f2f5" }}>
                    <td style={{ padding: 12 }}>
                      <strong>{p.nome}</strong>
                      {p.formacao && (
                        <div style={{ fontSize: 12, color: "#6b7a8f" }}>{p.formacao}</div>
                      )}
                    </td>
                    <td style={{ padding: 12, fontSize: 13 }}>{p.profissao || "-"}</td>
                    <td style={{ padding: 12, fontSize: 13 }}>
                      {p.numeroRegistro
                        ? `${p.tipoRegistro ? p.tipoRegistro + " " : ""}${p.numeroRegistro}`
                        : "-"}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          background: p.situacao === "ativo" ? "#d4edda" : "#f8d7da",
                          color: p.situacao === "ativo" ? "#155724" : "#721c24",
                        }}
                      >
                        {p.situacao === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <button
                        onClick={() => editar(p)}
                        style={{
                          padding: "5px 12px",
                          background: "#ffc107",
                          color: "#000",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          marginRight: 6,
                          fontSize: 13,
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => alterarSituacao(p)}
                        style={{
                          padding: "5px 12px",
                          background: p.situacao === "ativo" ? "#6c757d" : "#28a745",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          marginRight: 6,
                          fontSize: 13,
                        }}
                      >
                        {p.situacao === "ativo" ? "Inativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => excluir(p)}
                        style={{
                          padding: "5px 12px",
                          background: "#dc3545",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}