import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../services/firebase";

interface Prontuario {
  id: string;
  alunoId: string;
  texto: string;
  data: any;
  profissionalId?: string;
  profissionalNome?: string;
  tipoId?: string;
  _alunoNome?: string;
  _profNome?: string;
  _profEspecialidade?: string;
}

export default function AdminMigrarProntuarios() {
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false);
  const [filtro, setFiltro] = useState<"todos" | "sem" | "com">("sem");
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState<Prontuario | null>(null);

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setCarregando(true);
    try {
      const servSnap = await getDocs(collection(db, "tiposAtendimento"));
      const servicosLista = servSnap.docs.map(d => ({ id: d.id, nome: d.data().nome }));
      setServicos(servicosLista);

      const alunosSnap = await getDocs(collection(db, "alunos"));
      const alunosMap: Record<string, string> = {};
      alunosSnap.forEach(d => { alunosMap[d.id] = d.data().nomeCompleto; });

      const profSnap = await getDocs(collection(db, "profissionais"));
      const profMap: Record<string, { nome: string; especialidade: string }> = {};
      profSnap.forEach(d => {
        profMap[d.id] = {
          nome: d.data().nome,
          especialidade: d.data().especialidade || "",
        };
      });

      const snap = await getDocs(collection(db, "prontuarios"));
      const lista: Prontuario[] = snap.docs.map(d => {
        const data = d.data();
        const prof = data.profissionalId ? profMap[data.profissionalId] : null;
        return {
          id: d.id,
          alunoId: data.alunoId,
          texto: data.texto || "",
          data: data.data,
          profissionalId: data.profissionalId,
          profissionalNome: data.profissionalNome,
          tipoId: data.tipoId,
          _alunoNome: alunosMap[data.alunoId] || "(aluno não encontrado)",
          _profNome: prof?.nome || data.profissionalNome || "(sem autor)",
          _profEspecialidade: prof?.especialidade || "",
        };
      });
      lista.sort((a, b) => (a._alunoNome || "").localeCompare(b._alunoNome || ""));
      setProntuarios(lista);
    } catch (e: any) { alert(e.message); }
    finally { setCarregando(false); }
  };

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const prontuariosFiltrados = prontuarios.filter(p => {
    if (filtro === "sem" && p.tipoId) return false;
    if (filtro === "com" && !p.tipoId) return false;
    if (busca.trim()) {
      const b = busca.toLowerCase();
      const match = (p._alunoNome || "").toLowerCase().includes(b) ||
                    (p.texto || "").toLowerCase().includes(b);
      if (!match) return false;
    }
    return true;
  });

  const selecionarTodos = () => setSelecionados(new Set(prontuariosFiltrados.map(p => p.id)));
  const desmarcarTodos = () => setSelecionados(new Set());

  const migrarSelecionados = async (nomeServico: string) => {
    const serv = servicos.find(s => s.nome.toLowerCase().trim() === nomeServico.toLowerCase());
    if (!serv) return alert(`Serviço "${nomeServico}" não encontrado`);
    if (selecionados.size === 0) return alert("Selecione pelo menos um");
    if (!confirm(`Migrar ${selecionados.size} prontuários para ${nomeServico}?`)) return;

    setCarregando(true);
    try {
      for (const id of Array.from(selecionados)) {
        await updateDoc(doc(db, "prontuarios", id), { tipoId: serv.id, migradoEm: new Date() });
      }
      alert(`✅ ${selecionados.size} migrados para ${nomeServico}!`);
      setSelecionados(new Set());
      carregar();
    } catch (e: any) { alert(e.message); }
    finally { setCarregando(false); }
  };

  const migrarUm = async (id: string, nomeServico: string) => {
    const serv = servicos.find(s => s.nome.toLowerCase().trim() === nomeServico.toLowerCase());
    if (!serv) return alert(`Serviço "${nomeServico}" não encontrado`);
    try {
      await updateDoc(doc(db, "prontuarios", id), { tipoId: serv.id, migradoEm: new Date() });
      alert(`✅ Migrado para ${nomeServico}!`);
      setModal(null);
      carregar();
    } catch (e: any) { alert(e.message); }
  };

  const deletarSelecionados = async () => {
    if (selecionados.size === 0) return alert("Selecione pelo menos um");
    if (!confirm(`⚠️ DELETAR ${selecionados.size} prontuários?`)) return;
    if (!confirm("TEM CERTEZA?")) return;
    setCarregando(true);
    try {
      for (const id of Array.from(selecionados)) {
        await deleteDoc(doc(db, "prontuarios", id));
      }
      alert(`🗑️ ${selecionados.size} deletados!`);
      setSelecionados(new Set());
      carregar();
    } catch (e: any) { alert(e.message); }
    finally { setCarregando(false); }
  };

  const fmtData = (d: any) => d?.toDate?.()?.toLocaleDateString?.() || "?";

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ color: "#1a2a4f" }}>Migrar Prontuários Antigos</h1>
      <p style={{ color: "#6b7a8f" }}>
        Clique em <strong>Ver completo</strong> para ler o prontuário e classificar como PSI ou NUTRI.
      </p>

      {/* Busca */}
      <input
        type="text"
        placeholder="🔍 Buscar por nome do paciente ou conteúdo..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{ width: "100%", maxWidth: 500, padding: 10, border: "1px solid #ccc", borderRadius: 8, marginBottom: 16 }}
      />

      {/* Botões de ação */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={() => migrarSelecionados("psicologia")} disabled={carregando || selecionados.size === 0} style={{ padding: "10px 16px", background: "#6610f2", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
          🧠 Migrar {selecionados.size} p/ PSI
        </button>
        <button onClick={() => migrarSelecionados("nutrição")} disabled={carregando || selecionados.size === 0} style={{ padding: "10px 16px", background: "#fd7e14", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
          🍎 Migrar {selecionados.size} p/ NUTRI
        </button>
        <button onClick={deletarSelecionados} disabled={carregando || selecionados.size === 0} style={{ padding: "10px 16px", background: "#000", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
          🗑️ Deletar {selecionados.size}
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "#6b7a8f" }}>Filtro:</span>
        <button onClick={() => setFiltro("sem")} style={{ padding: "6px 12px", background: filtro === "sem" ? "#0070f3" : "#e9ecef", color: filtro === "sem" ? "#fff" : "#000", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Sem tipo ({prontuarios.filter(p => !p.tipoId).length})
        </button>
        <button onClick={() => setFiltro("com")} style={{ padding: "6px 12px", background: filtro === "com" ? "#0070f3" : "#e9ecef", color: filtro === "com" ? "#fff" : "#000", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Migrados ({prontuarios.filter(p => !!p.tipoId).length})
        </button>
        <button onClick={() => setFiltro("todos")} style={{ padding: "6px 12px", background: filtro === "todos" ? "#0070f3" : "#e9ecef", color: filtro === "todos" ? "#fff" : "#000", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Todos ({prontuarios.length})
        </button>
        <button onClick={selecionarTodos} style={{ marginLeft: "auto", padding: "6px 12px", background: "#28a745", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Marcar todos ({prontuariosFiltrados.length})
        </button>
        <button onClick={desmarcarTodos} style={{ padding: "6px 12px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Desmarcar
        </button>
      </div>

      {carregando && <p>Processando...</p>}

      {/* Tabela */}
      <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
              <th style={{ padding: 10, width: 40 }}>☑</th>
              <th style={{ padding: 10, textAlign: "left" }}>Paciente</th>
              <th style={{ padding: 10, textAlign: "left" }}>Data</th>
              <th style={{ padding: 10, textAlign: "left" }}>Preview</th>
              <th style={{ padding: 10, textAlign: "left", width: 120 }}>Ações</th>
              <th style={{ padding: 10, textAlign: "left", width: 130 }}>Tipo atual</th>
            </tr>
          </thead>
          <tbody>
            {prontuariosFiltrados.map(p => {
              const servAtual = servicos.find(s => s.id === p.tipoId);
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #f0f2f5", background: selecionados.has(p.id) ? "#e6f0ff" : "transparent" }}>
                  <td style={{ padding: 10, textAlign: "center" }}>
                    <input type="checkbox" checked={selecionados.has(p.id)} onChange={() => toggleSelecionado(p.id)} />
                  </td>
                  <td style={{ padding: 10, fontWeight: 600 }}>{p._alunoNome}</td>
                  <td style={{ padding: 10 }}>{fmtData(p.data)}</td>
                  <td style={{ padding: 10, maxWidth: 400 }}>
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.texto?.substring(0, 150)}
                    </div>
                  </td>
                  <td style={{ padding: 10 }}>
                    <button
                      onClick={() => setModal(p)}
                      style={{ padding: "4px 10px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
                    >
                      👁️ Ver completo
                    </button>
                  </td>
                  <td style={{ padding: 10 }}>
                    {servAtual ? (
                      <span style={{ color: "#28a745", fontSize: 12 }}>✅ {servAtual.nome}</span>
                    ) : (
                      <span style={{ color: "#dc3545", fontSize: 12 }}>— não migrado</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 800, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, color: "#1a2a4f" }}>{modal._alunoNome}</h3>
                <p style={{ margin: "4px 0 0", color: "#6b7a8f", fontSize: 13 }}>
                  {fmtData(modal.data)}
                </p>
              </div>
              <button onClick={() => setModal(null)} style={{ padding: "6px 12px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                ✕ Fechar
              </button>
            </div>

            <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 8, marginBottom: 20, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6, maxHeight: 400, overflowY: "auto" }}>
              {modal.texto}
            </div>

            <div style={{ borderTop: "1px solid #e0e4e8", paddingTop: 16 }}>
              <p style={{ margin: "0 0 12px", fontWeight: 600, color: "#1a2a4f" }}>Este prontuário é de:</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => migrarUm(modal.id, "psicologia")}
                  style={{ flex: 1, minWidth: 160, padding: "14px 20px", background: "#6610f2", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}
                >
                  🧠 PSICOLOGIA
                </button>
                <button
                  onClick={() => migrarUm(modal.id, "nutrição")}
                  style={{ flex: 1, minWidth: 160, padding: "14px 20px", background: "#fd7e14", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}
                >
                  🍎 NUTRIÇÃO
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Deletar este prontuário?")) return;
                    await deleteDoc(doc(db, "prontuarios", modal.id));
                    alert("Deletado!");
                    setModal(null);
                    carregar();
                  }}
                  style={{ padding: "14px 20px", background: "#000", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: 600 }}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}