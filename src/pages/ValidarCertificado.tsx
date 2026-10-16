// src/pages/ValidarCertificado.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { buscarCertificadoPorCodigo } from "../services/certificados";

interface CertificadoPublico {
  id: string;
  codigo: string;
  alunoNome: string;
  cursoNome: string;
  cargaHoraria: number;
  dataInicio?: any;
  dataFim?: any;
  frequencia?: number;
  professores?: { nome: string; profissao?: string }[];
  status: "valido" | "cancelado" | "revogado";
  emitidoEm?: any;
}

const formatarData = (v: any): string => {
  if (!v) return "-";
  try {
    if (typeof v?.toDate === "function") {
      return v.toDate().toLocaleDateString("pt-BR");
    }
    if (typeof v === "string") {
      // YYYY-MM-DD
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
      return v;
    }
    if (v instanceof Date) return v.toLocaleDateString("pt-BR");
  } catch {}
  return "-";
};

export default function ValidarCertificado() {
  const { codigo } = useParams<{ codigo: string }>();
  const [carregando, setCarregando] = useState(true);
  const [cert, setCert] = useState<CertificadoPublico | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      if (!codigo) return;
      setCarregando(true);
      try {
        const c = await buscarCertificadoPorCodigo(codigo.trim().toUpperCase());
        if (!c) {
          setNaoEncontrado(true);
        } else {
          setCert(c as CertificadoPublico);
        }
      } catch (e) {
        console.error(e);
        setNaoEncontrado(true);
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [codigo]);

  const corStatus = (s: string) => {
    if (s === "valido") return { bg: "#d4edda", color: "#155724", label: "✅ Válido" };
    if (s === "cancelado") return { bg: "#f8d7da", color: "#721c24", label: "❌ Cancelado" };
    if (s === "revogado") return { bg: "#f8d7da", color: "#721c24", label: "❌ Revogado" };
    return { bg: "#e2e3e5", color: "#383d41", label: "Desconhecido" };
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #eef2f7 0%, #dbe6f3 100%)",
        padding: "40px 16px",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 10px 40px rgba(26,42,79,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/logo-ijp.png"
            alt="IJP"
            style={{ width: 80, height: 80, objectFit: "contain" }}
            onError={(e) => ((e.currentTarget.style.display = "none"))}
          />
          <h1
            style={{
              color: "#1a2a4f",
              margin: "12px 0 4px",
              fontSize: 22,
              letterSpacing: "0.3px",
            }}
          >
            Validação de Certificado
          </h1>
          <p style={{ color: "#6b7a8f", fontSize: 13, margin: 0 }}>
            Instituto Jovens Periféricos
          </p>
        </div>

        {carregando && (
          <p style={{ textAlign: "center", color: "#6b7a8f" }}>Verificando...</p>
        )}

        {!carregando && naoEncontrado && (
          <div
            style={{
              background: "#fff3cd",
              border: "1px solid #ffeeba",
              borderRadius: 12,
              padding: 20,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 40 }}>🔍</div>
            <h3 style={{ color: "#856404", marginTop: 8 }}>
              Certificado não encontrado
            </h3>
            <p style={{ color: "#856404", fontSize: 14, margin: 0 }}>
              O código <strong>{codigo}</strong> não corresponde a nenhum certificado
              emitido pelo Instituto Jovens Periféricos.
            </p>
          </div>
        )}

        {!carregando && cert && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  padding: "8px 20px",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 14,
                  background: corStatus(cert.status).bg,
                  color: corStatus(cert.status).color,
                }}
              >
                {corStatus(cert.status).label}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gap: 14,
                background: "#f8fafc",
                borderRadius: 12,
                padding: 20,
              }}
            >
              <Linha label="Nome do aluno" valor={cert.alunoNome} />
              <Linha label="Curso" valor={cert.cursoNome} />
              <Linha label="Carga horária" valor={`${cert.cargaHoraria} horas`} />
              <Linha
                label="Período"
                valor={`${formatarData(cert.dataInicio)} a ${formatarData(cert.dataFim)}`}
              />
              {cert.frequencia != null && (
                <Linha label="Frequência" valor={`${cert.frequencia}%`} />
              )}
              {cert.emitidoEm && (
                <Linha label="Data de emissão" valor={formatarData(cert.emitidoEm)} />
              )}

              {cert.professores && cert.professores.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6b7a8f",
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      marginBottom: 6,
                    }}
                  >
                    Professores
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {cert.professores.map((p, i) => (
                      <span
                        key={i}
                        style={{
                          background: "#e6f0ff",
                          color: "#1a2a4f",
                          borderRadius: 999,
                          padding: "4px 12px",
                          fontSize: 13,
                        }}
                      >
                        {p.nome}
                        {p.profissao ? ` • ${p.profissao}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ borderTop: "1px solid #e0e4e8", paddingTop: 12 }}>
                <Linha
                  label="Código de validação"
                  valor={cert.codigo}
                  mono
                />
              </div>
            </div>

            <p
              style={{
                textAlign: "center",
                color: "#8a99ad",
                fontSize: 12,
                marginTop: 20,
              }}
            >
              Este documento pode ser verificado em qualquer momento pelo código único
              acima. A autenticidade é confirmada pelos registros oficiais do Instituto
              Jovens Periféricos.
            </p>
          </>
        )}

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link
            to="/certificado"
            style={{
              color: "#0070f3",
              fontSize: 13,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            ← Voltar ao portal de certificados
          </Link>
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar
function Linha({
  label,
  valor,
  mono,
}: {
  label: string;
  valor: string;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span
        style={{
          fontSize: 11,
          color: "#6b7a8f",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          alignSelf: "center",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          color: "#1a2a4f",
          fontWeight: 600,
          fontFamily: mono ? "'Courier New', monospace" : "inherit",
          textAlign: "right",
        }}
      >
        {valor}
      </span>
    </div>
  );
}