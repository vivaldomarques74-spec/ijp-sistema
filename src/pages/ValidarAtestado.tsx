import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebase";

export default function ValidarAtestado() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const [busca, setBusca] = useState(codigo || "");
  const [resultado, setResultado] = useState<any>(null);
  const [buscando, setBuscando] = useState(false);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  useEffect(() => {
    if (codigo) validar(codigo);
  }, [codigo]);

  const validar = async (cod: string) => {
    setBuscando(true);
    setNaoEncontrado(false);
    setResultado(null);
    try {
      const q = query(collection(db, "atestados"), where("codigo", "==", cod.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setNaoEncontrado(true);
      } else {
        setResultado({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setBuscando(false);
    }
  };

  const handleBuscar = () => {
    if (!busca.trim()) return alert("Digite o código");
    navigate(`/validar/${busca.trim().toUpperCase()}`);
    validar(busca.trim().toUpperCase());
  };

  const fmtData = (d: any) => {
    if (!d) return "-";
    if (d.toDate) return d.toDate().toLocaleDateString("pt-BR");
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("pt-BR");
  };

  const fmtDataHora = (d: any) => {
    if (!d) return "-";
    if (d.toDate) return d.toDate().toLocaleString("pt-BR");
    return new Date(d).toLocaleString("pt-BR");
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f4f6f9 0%, #eef2f7 100%)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <img src="/logo-ijp.png" alt="IJP" style={{ width: 120, marginBottom: 12 }} />
          <h1 style={{ color: "#1a2a4f", margin: 0, fontSize: 24 }}>Validação de Atestado</h1>
          <p style={{ color: "#6b7a8f", marginTop: 8 }}>
            Instituto Jovens Periféricos • CNPJ 43.248.302/0001-96
          </p>
        </div>

        {/* Card de busca */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 4px 12px rgba(0,0,0,0.06)", marginBottom: 20 }}>
          <label style={{ fontWeight: 600, display: "block", marginBottom: 10 }}>
            Digite o código de autenticação do atestado:
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="text"
              placeholder="Ex: 202609-ABCD-1234"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleBuscar()}
              style={{ flex: 1, padding: 14, border: "1px solid #ccc", borderRadius: 8, fontSize: 15 }}
            />
            <button
              onClick={handleBuscar}
              disabled={buscando}
              style={{ padding: "14px 24px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 8, cursor: buscando ? "wait" : "pointer", fontSize: 15, fontWeight: 600 }}
            >
              {buscando ? "Validando..." : "Validar"}
            </button>
          </div>
        </div>

        {/* Resultado */}
        {naoEncontrado && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 30, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", borderTop: "6px solid #dc3545" }}>
            <div style={{ fontSize: 60, marginBottom: 12 }}>❌</div>
            <h2 style={{ color: "#dc3545", margin: 0 }}>Atestado não encontrado</h2>
            <p style={{ color: "#6b7a8f", marginTop: 12 }}>
              O código informado não corresponde a nenhum atestado emitido pelo Instituto Jovens Periféricos.
            </p>
            <p style={{ color: "#6b7a8f", fontSize: 13 }}>
              Verifique se digitou corretamente ou entre em contato com a instituição.
            </p>
          </div>
        )}

        {resultado && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 30, boxShadow: "0 4px 12px rgba(0,0,0,0.06)", borderTop: "6px solid #28a745" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 60 }}>✅</div>
              <h2 style={{ color: "#28a745", margin: "8px 0 0" }}>Atestado Válido</h2>
              <p style={{ color: "#6b7a8f", fontSize: 13, margin: "8px 0 0" }}>
                Este documento foi emitido pelo Instituto Jovens Periféricos
              </p>
            </div>

            <div style={{ background: "#f8f9fa", padding: 20, borderRadius: 8, fontSize: 14, lineHeight: 1.9 }}>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#1a2a4f" }}>Código:</strong> {resultado.codigo}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#1a2a4f" }}>Paciente:</strong> {resultado.alunoNome}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#1a2a4f" }}>CPF:</strong> {resultado.alunoCpf || "-"}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#1a2a4f" }}>Matrícula:</strong> {resultado.alunoMatricula || "-"}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#1a2a4f" }}>Data do atendimento:</strong> {fmtData(resultado.dia)}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#1a2a4f" }}>Horário:</strong> {resultado.chegada} às {resultado.saida}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#1a2a4f" }}>Motivo:</strong> {resultado.descricaoServico}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "#1a2a4f" }}>Assinado por:</strong> {resultado.assinanteNome} ({resultado.assinanteFuncao})
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #dee2e6", fontSize: 12, color: "#6b7a8f" }}>
                <strong>Emitido em:</strong> {fmtDataHora(resultado.emitidoEm)}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 30, fontSize: 12, color: "#a0aec0" }}>
          Instituto Jovens Periféricos • Documento emitido eletronicamente
        </div>
      </div>
    </div>
  );
}