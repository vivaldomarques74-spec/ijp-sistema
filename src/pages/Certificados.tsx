import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import CertificateTemplate from "./CertificateTemplate";
import {
  obterOuCriarCertificado,
  urlValidacao,
} from "../services/certificados";
import type { ProfessorCertificado } from "../services/certificados";

// ============ Tipos ============
interface Curso {
  id: string;
  nome: string;
}

interface Turma {
  id: string;
  nome: string;
  alunos: string[];
  totalAulas: number;
  dataInicio?: any;
  dataFim?: any;
  cargaHoraria?: number;
  professoresIds?: string[];
}

interface Aluno {
  id: string;
  nomeCompleto: string;
  cpf?: string;
  presencas: number;
  porcentagem: number;
  status: "aprovado" | "reprovado";
  certificadoCodigo?: string;
}

const formatarDataFirestore = (v: any): string => {
  if (!v) return "-";
  try {
    if (typeof v?.toDate === "function") {
      return v.toDate().toLocaleDateString("pt-BR", { timeZone: "UTC" });
    }
    if (typeof v === "string") return v;
    if (v instanceof Date) return v.toLocaleDateString("pt-BR");
  } catch {}
  return "-";
};

export default function Certificados() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [cursoId, setCursoId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);

  // Modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [modoEmissao, setModoEmissao] = useState<"individual" | "todos">(
    "individual"
  );
  const [professoresTurma, setProfessoresTurma] = useState<
    ProfessorCertificado[]
  >([]);
  const [carregandoProfs, setCarregandoProfs] = useState(false);

  // ============ Carrega cursos ============
  useEffect(() => {
    const carregarCursos = async () => {
      const snap = await getDocs(collection(db, "cursos"));
      setCursos(snap.docs.map((d) => ({ id: d.id, nome: d.data().nome })));
    };
    carregarCursos();
  }, []);

  // ============ Carrega turmas ============
  useEffect(() => {
    if (!cursoId) {
      setTurmas([]);
      setTurmaId("");
      setAlunos([]);
      return;
    }
    const carregarTurmas = async () => {
      const snap = await getDocs(collection(db, "cursos", cursoId, "turmas"));
      setTurmas(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            nome: data.nome,
            alunos: data.alunos || [],
            totalAulas: data.totalAulas || 0,
            dataInicio: data.dataInicio,
            dataFim: data.dataFim,
            cargaHoraria: data.cargaHoraria || 0,
            professoresIds: data.professoresIds || [],
          };
        })
      );
    };
    carregarTurmas();
  }, [cursoId]);

  // ============ Carrega alunos + certificados existentes ============
  useEffect(() => {
    if (!cursoId || !turmaId) {
      setAlunos([]);
      return;
    }
    const carregarAlunos = async () => {
      setCarregando(true);
      const turma = turmas.find((t) => t.id === turmaId);
      if (!turma || turma.totalAulas === 0) {
        setAlunos([]);
        setCarregando(false);
        return;
      }
      const alunosIds = turma.alunos;
      if (alunosIds.length === 0) {
        setAlunos([]);
        setCarregando(false);
        return;
      }

      // Certificados já emitidos desta turma
      const certSnap = await getDocs(
        query(
          collection(db, "certificados"),
          where("cursoId", "==", cursoId),
          where("turmaId", "==", turmaId)
        )
      );
      const certMap: Record<string, string> = {};
      certSnap.docs.forEach((d) => {
        const data = d.data();
        certMap[data.alunoId] = data.codigo;
      });

      const alunosSnap = await getDocs(collection(db, "alunos"));
      const lista: Aluno[] = [];

      for (const alunoDoc of alunosSnap.docs) {
        if (!alunosIds.includes(alunoDoc.id)) continue;
        const data = alunoDoc.data();
        const nome = data.nomeCompleto;

        const presencasQuery = query(
          collection(db, "presencas"),
          where("alunoId", "==", alunoDoc.id),
          where("cursoId", "==", cursoId),
          where("turmaId", "==", turmaId),
          where("presente", "==", true)
        );
        const presencasSnap = await getDocs(presencasQuery);
        const totalPresencas = presencasSnap.size;
        const porcentagem = (totalPresencas / turma.totalAulas) * 100;
        const status = porcentagem >= 70 ? "aprovado" : "reprovado";

        lista.push({
          id: alunoDoc.id,
          nomeCompleto: nome,
          cpf: data.cpf || "",
          presencas: totalPresencas,
          porcentagem: parseFloat(porcentagem.toFixed(2)),
          status,
          certificadoCodigo: certMap[alunoDoc.id],
        });
      }
      lista.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
      setAlunos(lista);
      setCarregando(false);
    };
    carregarAlunos();
  }, [cursoId, turmaId, turmas]);

  // ============ Abre modal ============
  const abrirModal = async (
    aluno: Aluno | null,
    modo: "individual" | "todos"
  ) => {
    setAlunoSelecionado(aluno);
    setModoEmissao(modo);
    setMostrarModal(true);

    // Carrega professores da turma automaticamente
    setCarregandoProfs(true);
    try {
      const turma = turmas.find((t) => t.id === turmaId);
      if (!turma || !turma.professoresIds || turma.professoresIds.length === 0) {
        setProfessoresTurma([]);
        return;
      }
      const profs: ProfessorCertificado[] = [];
      for (const id of turma.professoresIds) {
        const snap = await getDocs(
          query(collection(db, "professores"), where("__name__", "==", id))
        );
        if (!snap.empty) {
          const p = snap.docs[0].data();
          profs.push({
            nome: p.nome || "",
            profissao: p.profissao || "",
            tipoRegistro: p.tipoRegistro || "",
            numeroRegistro: p.numeroRegistro || "",
          });
        }
      }
      setProfessoresTurma(profs);
    } finally {
      setCarregandoProfs(false);
    }
  };

  const fecharModal = () => {
    setMostrarModal(false);
    setAlunoSelecionado(null);
    setProfessoresTurma([]);
  };

  // ============ Gera PDF ============
  const gerarPDF = async (aluno: Aluno) => {
    if (professoresTurma.length === 0) {
      alert(
        "Esta turma não tem professores vinculados. Edite a turma e adicione os professores antes de emitir."
      );
      return;
    }

    const turma = turmas.find((t) => t.id === turmaId)!;
    const cursoNome = cursos.find((c) => c.id === cursoId)?.nome || "Curso";
    const cargaHoraria = turma?.cargaHoraria || 0;
    const dataInicio = formatarDataFirestore(turma?.dataInicio);
    const dataFim = formatarDataFirestore(turma?.dataFim);

    setGerando(true);
    try {
      // 1) Grava (ou recupera) o certificado
      const { codigo } = await obterOuCriarCertificado({
        alunoId: aluno.id,
        alunoNome: aluno.nomeCompleto,
        alunoCpf: aluno.cpf,
        cursoId,
        cursoNome,
        turmaId,
        cargaHoraria,
        dataInicio: dataInicio,
        dataFim: dataFim,
        frequencia: aluno.porcentagem,
      });

      // 2) Renderiza offscreen
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.top = "-9999px";
      container.style.left = "-9999px";
      container.style.width = "297mm";
      container.style.height = "210mm";
      container.style.background = "#ffffff";
      document.body.appendChild(container);

      const root = document.createElement("div");
      root.style.width = "297mm";
      root.style.height = "210mm";
      container.appendChild(root);

      const ReactDOM = await import("react-dom/client");
      const reactRoot = ReactDOM.createRoot(root);

      reactRoot.render(
        <CertificateTemplate
          alunoNome={aluno.nomeCompleto}
          alunoCpf={aluno.cpf}
          cursoNome={cursoNome}
          cargaHoraria={cargaHoraria}
          dataInicio={dataInicio}
          dataFim={dataFim}
          frequencia={aluno.porcentagem}
          professores={professoresTurma}
          codigoValidacao={codigo}
          linkValidacao={urlValidacao(codigo)}
          logoUrl="/logo-ijp.png"
          assinaturaUrl="/assinatura.png"
        />
      );

      await new Promise((r) => setTimeout(r, 300));

      // Aguarda imagens
      const images = root.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        })
      );

      await new Promise((r) => setTimeout(r, 200));

      // 3) html2canvas
      const canvas = await html2canvas(root, {
        scale: 4,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: root.scrollWidth,
        height: root.scrollHeight,
      });

      // 4) PDF
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, 297, 210);

      const nomeSanitizado = aluno.nomeCompleto.replace(/[^\w-]/g, "_");
      pdf.save(`certificado_${nomeSanitizado}.pdf`);

      reactRoot.unmount();
      document.body.removeChild(container);

      // Atualiza lista local
      setAlunos((prev) =>
        prev.map((a) =>
          a.id === aluno.id ? { ...a, certificadoCodigo: codigo } : a
        )
      );
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar certificado. Tente novamente.");
    } finally {
      setGerando(false);
    }
  };

  // ============ Confirma emissão ============
  const confirmarEmissao = async () => {
    if (modoEmissao === "individual" && alunoSelecionado) {
      await gerarPDF(alunoSelecionado);
    } else if (modoEmissao === "todos") {
      const aprovados = alunos.filter((a) => a.status === "aprovado");
      if (aprovados.length === 0) {
        alert("Nenhum aluno aprovado.");
        fecharModal();
        return;
      }
      for (const aluno of aprovados) {
        await gerarPDF(aluno);
      }
      alert(`${aprovados.length} certificado(s) gerado(s).`);
    }
    fecharModal();
  };

  const emitirTodosCertificados = () => {
    const aprovados = alunos.filter((a) => a.status === "aprovado");
    if (aprovados.length === 0) {
      alert("Nenhum aluno aprovado.");
      return;
    }
    abrirModal(null, "todos");
  };

  const turmaAtual = turmas.find((t) => t.id === turmaId);

  return (
    <div style={{ padding: 20 }}>
      <h1>Certificados</h1>

      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div>
          <label>Curso: </label>
          <select value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
            <option value="">Selecione</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Turma: </label>
          <select
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            disabled={!cursoId}
          >
            <option value="">Selecione</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {turmaAtual && (
        <div
          style={{
            background: "#e8f0ff",
            border: "1px solid #0070f3",
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: "#1a2a4f" }}>
            <strong>Professores vinculados:</strong>{" "}
            {turmaAtual.professoresIds && turmaAtual.professoresIds.length > 0
              ? `${turmaAtual.professoresIds.length} professor(es) aparecerão automaticamente no certificado`
              : "⚠️ Nenhum professor vinculado. Edite a turma para adicionar."}
          </p>
        </div>
      )}

      {carregando && <p>Carregando dados...</p>}

      {!carregando && turmaId && (
        <>
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={emitirTodosCertificados}
              disabled={
                alunos.filter((a) => a.status === "aprovado").length === 0 ||
                gerando
              }
              style={{
                padding: "10px 20px",
                background: "#0070f3",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: gerando ? "wait" : "pointer",
                fontWeight: 600,
              }}
            >
              {gerando
                ? "Gerando..."
                : "📜 Emitir certificados para todos aprovados"}
            </button>
          </div>

          {alunos.length === 0 && (
            <p>Nenhum aluno encontrado para esta turma.</p>
          )}

          {alunos.length > 0 && (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#fff",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  <th
                    style={{
                      padding: 12,
                      textAlign: "left",
                      fontSize: 13,
                      color: "#6b7a8f",
                    }}
                  >
                    Aluno
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: "left",
                      fontSize: 13,
                      color: "#6b7a8f",
                    }}
                  >
                    Presenças
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: "left",
                      fontSize: 13,
                      color: "#6b7a8f",
                    }}
                  >
                    Total
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: "left",
                      fontSize: 13,
                      color: "#6b7a8f",
                    }}
                  >
                    %
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: "left",
                      fontSize: 13,
                      color: "#6b7a8f",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: "left",
                      fontSize: 13,
                      color: "#6b7a8f",
                    }}
                  >
                    Certificado
                  </th>
                  <th
                    style={{
                      padding: 12,
                      textAlign: "left",
                      fontSize: 13,
                      color: "#6b7a8f",
                    }}
                  >
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => (
                  <tr
                    key={aluno.id}
                    style={{ borderTop: "1px solid #f0f2f5" }}
                  >
                    <td style={{ padding: 12 }}>
                      <strong>{aluno.nomeCompleto}</strong>
                      {aluno.cpf && (
                        <div style={{ fontSize: 11, color: "#8a99ad" }}>
                          CPF: {aluno.cpf}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>{aluno.presencas}</td>
                    <td style={{ padding: 12 }}>
                      {turmaAtual?.totalAulas || 0}
                    </td>
                    <td style={{ padding: 12 }}>{aluno.porcentagem}%</td>
                    <td
                      style={{
                        padding: 12,
                        color:
                          aluno.status === "aprovado" ? "green" : "red",
                        fontWeight: 600,
                      }}
                    >
                      {aluno.status === "aprovado" ? "Aprovado" : "Reprovado"}
                    </td>
                    <td style={{ padding: 12 }}>
                      {aluno.certificadoCodigo ? (
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 11,
                            color: "#28a745",
                          }}
                        >
                          ✓ {aluno.certificadoCodigo}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#8a99ad" }}>
                          Não emitido
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      <button
                        onClick={() => abrirModal(aluno, "individual")}
                        disabled={gerando}
                        style={{
                          padding: "6px 14px",
                          background: aluno.certificadoCodigo
                            ? "#6c757d"
                            : "#28a745",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        {aluno.certificadoCodigo ? "🔄 Reemitir" : "📜 Emitir"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ============ MODAL ============ */}
      {mostrarModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 12,
              maxWidth: 520,
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ marginTop: 0, color: "#1a2a4f" }}>
              {modoEmissao === "todos"
                ? "Emitir certificados"
                : "Emitir certificado"}
            </h3>

            {modoEmissao === "individual" && alunoSelecionado && (
              <p style={{ color: "#6b7a8f", fontSize: 14 }}>
                <strong>{alunoSelecionado.nomeCompleto}</strong>
                {alunoSelecionado.cpf && (
                  <span style={{ display: "block", fontSize: 12 }}>
                    CPF: {alunoSelecionado.cpf}
                  </span>
                )}
              </p>
            )}

            {modoEmissao === "todos" && (
              <p style={{ color: "#6b7a8f", fontSize: 14 }}>
                Serão gerados certificados para todos os{" "}
                <strong>
                  {alunos.filter((a) => a.status === "aprovado").length} alunos
                  aprovados
                </strong>
                .
              </p>
            )}

            <div
              style={{
                background: "#f8fafc",
                borderRadius: 8,
                padding: 14,
                marginTop: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#6b7a8f",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  marginBottom: 8,
                }}
              >
                Professores que aparecerão no certificado
              </div>

              {carregandoProfs && (
                <p style={{ margin: 0, fontSize: 13, color: "#6b7a8f" }}>
                  Carregando professores...
                </p>
              )}

              {!carregandoProfs && professoresTurma.length === 0 && (
                <p style={{ margin: 0, fontSize: 13, color: "#dc3545" }}>
                  ⚠️ Nenhum professor vinculado a esta turma. Edite a turma e
                  adicione professores antes de emitir o certificado.
                </p>
              )}

              {!carregandoProfs &&
                professoresTurma.map((p, idx) => (
                  <div key={idx} style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: "#1a2a4f" }}>
                      {p.nome}
                    </span>
                    {p.profissao && (
                      <span style={{ color: "#6b7a8f", fontSize: 12 }}>
                        {" "}
                        • {p.profissao}
                      </span>
                    )}
                    {p.numeroRegistro && (
                      <span
                        style={{
                          color: "#8a99ad",
                          fontSize: 11,
                          marginLeft: 6,
                          fontFamily: "monospace",
                        }}
                      >
                        ({p.tipoRegistro} {p.numeroRegistro})
                      </span>
                    )}
                  </div>
                ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={confirmarEmissao}
                disabled={gerando || professoresTurma.length === 0}
                style={{
                  flex: 1,
                  padding: "10px 20px",
                  background:
                    gerando || professoresTurma.length === 0
                      ? "#999"
                      : "#28a745",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor:
                    gerando || professoresTurma.length === 0
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: 600,
                }}
              >
                {gerando ? "Gerando..." : "✓ Confirmar e gerar PDF"}
              </button>
              <button
                onClick={fecharModal}
                style={{
                  padding: "10px 20px",
                  background: "#6c757d",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}