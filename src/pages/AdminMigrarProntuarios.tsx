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
    if (filtro === "sem") return !p.tipoId;
    if (filtro === "com") return !!p.tipoId;
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

  const migrarAutomatico = async () => {
    const semTipo = prontuarios.filter(p => !p.tipoId && p._profEspecialidade);
    if (semTipo.length === 0) return alert("Nenhum prontuário para migrar automaticamente");
    if (!confirm(`Migrar ${semTipo.length} prontuários automaticamente baseado em quem escreveu?`)) return;

    setCarregando(true);
    let ok = 0, erro = 0;
    try {
      for (const p of semTipo) {
        const serv = servicos.find(s => s.nome.toLowerCase().trim() === p._profEspecialidade?.toLowerCase().trim());
        if (serv) {
          await updateDoc(doc(db, "prontuarios", p.id), { tipoId: serv.id, migradoEm: new Date() });
          ok++;
        } else erro++;
      }
      alert(`✅ ${ok} migrados | ⚠️ ${erro} sem correspondência`);
      carregar();
    } catch (e: any) { alert(e.message); }
    finally { setCarregando(false); }
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
        Migre prontuários antigos para PSI ou NUTRI. A coluna "Quem escreveu" mostra a especialidade do autor.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={migrarAutomatico} disabled={carregando} style={{ padding: "10px 16px", background: "#6f42c1", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
          ⚡ Migrar Automaticamente
        </button>
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

      <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
              <th style={{ padding: 10 }}>☑</th>
              <th style={{ padding: 10, textAlign: "left" }}>Paciente</th>
              <th style={{ padding: 10, textAlign: "left" }}>Quem escreveu</th>
              <th style={{ padding: 10, textAlign: "left" }}>Especialidade</th>
              <th style={{ padding: 10, textAlign: "left" }}>Data</th>
              <th style={{ padding: 10, textAlign: "left" }}>Preview</th>
              <th style={{ padding: 10, textAlign: "left" }}>Tipo atual</th>
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
                  <td style={{ padding: 10 }}>{p._profNome}</td>
                  <td style={{ padding: 10 }}>
                    {p._profEspecialidade ? (
                      <span style={{
                        padding: "2px 8px", borderRadius: 10, fontSize: 11,
                        background: p._profEspecialidade.toLowerCase().includes("psic") ? "#e0d4ff" : "#ffe0cc",
                        color: "#333",
                      }}>
                        {p._profEspecialidade}
                      </span>
                    ) : <span style={{ color: "#dc3545", fontSize: 11 }}>⚠️ sem</span>}
                  </td>
                  <td style={{ padding: 10 }}>{fmtData(p.data)}</td>
                  <td style={{ padding: 10, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.texto?.substring(0, 80)}...
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
    </div>
  );
}