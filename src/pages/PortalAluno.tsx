import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import CertificateTemplate from "./CertificateTemplate";
import {
  obterOuCriarCertificado,
  buscarCertificadoPorCodigo,
  urlValidacao,
} from "../services/certificados";
import type { ProfessorCertificado } from "../services/certificados";

// ============ Helpers ============
const apenasDigitos = (s: string) => (s || "").replace(/\D/g, "");

const formatarCpf = (v: string) =>
  apenasDigitos(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

const formatarTelefone = (v: string) => {
  const d = apenasDigitos(v).slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
};

const formatarData = (v: any): string => {
  if (!v) return "-";
  try {
    if (typeof v?.toDate === "function")
      return v.toDate().toLocaleDateString("pt-BR");
    if (v instanceof Date) return v.toLocaleDateString("pt-BR");
    if (typeof v === "string") {
      const d = new Date(v.length === 10 ? v + "T12:00:00" : v);
      if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
      return v;
    }
  } catch {}
  return "-";
};

const normalizarData = (v: any): string => {
  if (!v) return "";
  try {
    if (typeof v === "string") return v.slice(0, 10);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v?.toDate === "function")
      return v.toDate().toISOString().slice(0, 10);
  } catch {}
  return "";
};

// ============ Tipos ============
interface Aluno {
  id: string;
  nomeCompleto: string;
  cpf?: string;
  nascimento?: string;
  telefone?: string;
  whatsapp?: string;
  [k: string]: any;
}

interface Certificado {
  id: string;
  codigo: string;
  cursoNome: string;
  cargaHoraria: number;
  frequencia?: number;
  dataInicio?: any;
  dataFim?: any;
  status: string;
}

interface Agendamento {
  id: string;
  data: string;
  horario: string;
  status: string;
  nomeProfissional?: string;
  especialidade?: string;
}

interface CursoMatriculado {
  cursoId: string;
  cursoNome: string;
  turmaId: string;
  turmaNome: string;
  cargaHoraria?: number;
  dataInicio?: string;
  dataFim?: string;
  status?: string;
}

// ============ Componente ============
export default function PortalAluno() {
  const [cpf, setCpf] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [aluno, setAluno] = useState<Aluno | null>(null);

  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [cursos, setCursos] = useState<CursoMatriculado[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<"certificados" | "agenda" | "cursos">(
    "certificados"
  );

  useEffect(() => {
    const salvo = sessionStorage.getItem("portalAluno");
    if (salvo) {
      try {
        setAluno(JSON.parse(salvo));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!aluno) return;
    sessionStorage.setItem("portalAluno", JSON.stringify(aluno));
    carregarDados(aluno);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aluno]);

  // ============ Login ============
  const buscarAluno = async () => {
    setErro("");
    const cpfDig = apenasDigitos(cpf);
    const zapDig = apenasDigitos(whatsapp);

    if (cpfDig.length !== 11) return setErro("Informe um CPF válido (11 dígitos).");
    if (!nascimento) return setErro("Informe sua data de nascimento.");
    if (zapDig.length < 10) return setErro("Informe um WhatsApp válido.");

    setCarregando(true);
    try {
      const variantesCpf = [cpfDig, formatarCpf(cpfDig)];
      let encontrado: Aluno | null = null;

      for (const v of variantesCpf) {
        const q = query(collection(db, "alunos"), where("cpf", "==", v));
        const snap = await getDocs(q);
        if (!snap.empty) {
          encontrado = { id: snap.docs[0].id, ...snap.docs[0].data() } as Aluno;
          break;
        }
      }

      if (!encontrado) {
        setErro("Não encontramos seu cadastro. Verifique os dados ou fale com o IJP.");
        return;
      }

      const nascCad = normalizarData(encontrado.nascimento);
      if (nascCad && nascCad !== nascimento) {
        setErro("Os dados não conferem. Verifique a data de nascimento.");
        return;
      }

      const zapCad = apenasDigitos(encontrado.whatsapp || encontrado.telefone || "");
      if (zapCad && zapCad.slice(-8) !== zapDig.slice(-8)) {
        setErro("Os dados não conferem. Verifique o WhatsApp informado.");
        return;
      }

      setAluno(encontrado);
    } catch (e) {
      console.error(e);
      setErro("Erro ao consultar. Tente novamente em instantes.");
    } finally {
      setCarregando(false);
    }
  };

  // ============ Carrega TUDO + gera certificados automaticamente ============
  const carregarDados = async (a: Aluno) => {
    setCarregando(true);
    try {
      // --- 1) CURSOS + CERTIFICADOS ---
      const cursosSnap = await getDocs(collection(db, "cursos"));
      const certificadosEncontrados: Certificado[] = [];
      const cursosEncontrados: CursoMatriculado[] = [];
      const hojeISO = new Date().toISOString().slice(0, 10);

      for (const cursoDoc of cursosSnap.docs) {
        const cursoData = cursoDoc.data();
        const turmasSnap = await getDocs(
          collection(db, "cursos", cursoDoc.id, "turmas")
        );

        for (const turmaDoc of turmasSnap.docs) {
          const t = turmaDoc.data();
          const alunosArr: string[] = t.alunos || [];
          if (!alunosArr.includes(a.id)) continue;

          const totalAulas = t.totalAulas || 0;
          const statusTurma = t.status || "ativa";
          const dataFimISO = normalizarData(t.dataFim);

          // Calcula frequência
          let frequencia = 0;
          if (totalAulas > 0) {
            const presSnap = await getDocs(
              query(
                collection(db, "presencas"),
                where("alunoId", "==", a.id),
                where("cursoId", "==", cursoDoc.id),
                where("turmaId", "==", turmaDoc.id),
                where("presente", "==", true)
              )
            );
            frequencia = parseFloat(
              ((presSnap.size / totalAulas) * 100).toFixed(2)
            );
          }

          // 🎯 Se aprovado (>= 70%), GARANTE certificado automaticamente
          if (totalAulas > 0 && frequencia >= 70) {
            try {
              const { codigo } = await obterOuCriarCertificado({
                alunoId: a.id,
                alunoNome: a.nomeCompleto,
                alunoCpf: a.cpf,
                cursoId: cursoDoc.id,
                cursoNome: cursoData.nome || "Curso",
                turmaId: turmaDoc.id,
                cargaHoraria: t.cargaHoraria || 0,
                dataInicio: normalizarData(t.dataInicio),
                dataFim: dataFimISO,
                frequencia,
              });
              certificadosEncontrados.push({
                id: `${cursoDoc.id}_${turmaDoc.id}`,
                codigo,
                cursoNome: cursoData.nome || "Curso",
                cargaHoraria: t.cargaHoraria || 0,
                frequencia,
                dataInicio: t.dataInicio,
                dataFim: t.dataFim,
                status: "valido",
              });
            } catch (err) {
              console.warn("Erro ao garantir certificado:", err);
            }
          }

          // 📚 Só mostra em "Cursos" se AINDA está ativo
          const isAtivo =
            statusTurma === "ativa" && (!dataFimISO || dataFimISO >= hojeISO);

          if (isAtivo) {
            cursosEncontrados.push({
              cursoId: cursoDoc.id,
              cursoNome: cursoData.nome || "Curso",
              turmaId: turmaDoc.id,
              turmaNome: t.nome || "Turma",
              cargaHoraria: t.cargaHoraria,
              dataInicio: normalizarData(t.dataInicio),
              dataFim: dataFimISO,
              status: statusTurma,
            });
          }
        }
      }

      // Ordena certificados: mais recente primeiro
      certificadosEncontrados.sort((x, y) => {
        const dx = normalizarData(x.dataFim);
        const dy = normalizarData(y.dataFim);
        return dy.localeCompare(dx);
      });

      setCertificados(certificadosEncontrados);
      setCursos(cursosEncontrados);

      // --- 2) AGENDAMENTOS ---
      try {
        const agSnap = await getDocs(
          query(collection(db, "agendamentos"), where("alunoId", "==", a.id))
        );

        const profSnap = await getDocs(collection(db, "profissionais"));
        const profMap: Record<string, { nome: string; especialidade?: string }> = {};
        profSnap.docs.forEach((d) => {
          const p = d.data();
          profMap[d.id] = { nome: p.nome, especialidade: p.especialidade };
        });

        setAgendamentos(
          agSnap.docs
            .map((d) => {
              const data = d.data() as any;
              return {
                id: d.id,
                data: data.data,
                horario: data.horario,
                status: data.status,
                nomeProfissional: profMap[data.profissionalId]?.nome,
                especialidade: profMap[data.profissionalId]?.especialidade,
              };
            })
            .filter((ag) => ag.data >= hojeISO)
            .sort((x, y) =>
              (x.data + x.horario).localeCompare(y.data + y.horario)
            )
        );
      } catch (e) {
        console.warn("Sem agendamentos:", e);
      }
    } finally {
      setCarregando(false);
    }
  };

  const sair = () => {
    sessionStorage.removeItem("portalAluno");
    setAluno(null);
    setCpf("");
    setNascimento("");
    setWhatsapp("");
    setCertificados([]);
    setAgendamentos([]);
    setCursos([]);
  };

  // ============ Baixar PDF ============
  const baixarPDF = async (cert: Certificado) => {
    if (!aluno) return;
    setBaixando(cert.codigo);
    try {
      // Pega dados completos (com professores salvos) do Firestore
      const full = await buscarCertificadoPorCodigo(cert.codigo);
      if (!full) {
        alert("Certificado não encontrado.");
        return;
      }

      const professores: ProfessorCertificado[] = full.professores || [];
      const dataInicio = formatarData(full.dataInicio);
      const dataFim = formatarData(full.dataFim);

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
          cursoNome={cert.cursoNome}
          cargaHoraria={cert.cargaHoraria}
          dataInicio={dataInicio}
          dataFim={dataFim}
          frequencia={cert.frequencia || 0}
          professores={professores}
          codigoValidacao={cert.codigo}
          linkValidacao={urlValidacao(cert.codigo)}
          logoUrl="/logo-ijp.png"
          assinaturaUrl="/assinatura.png"
        />
      );

      await new Promise((r) => setTimeout(r, 300));

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

      const canvas = await html2canvas(root, {
        scale: 4,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: root.scrollWidth,
        height: root.scrollHeight,
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 297, 210);

      const nomeSanit = aluno.nomeCompleto.replace(/[^\w-]/g, "_");
      const cursoSanit = cert.cursoNome.replace(/[^\w-]/g, "_");
      pdf.save(`certificado_${nomeSanit}_${cursoSanit}.pdf`);

      reactRoot.unmount();
      document.body.removeChild(container);
    } catch (e) {
      console.error("Erro ao baixar PDF:", e);
      alert("Erro ao gerar o PDF. Tente novamente.");
    } finally {
      setBaixando(null);
    }
  };

  // ================================================================
  // LOGIN
  // ================================================================
  if (!aluno) {
    return (
      <div style={estilos.wrapper}>
        <div style={estilos.card}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <img
              src="/logo-ijp.png"
              alt="IJP"
              style={{ width: 90, height: 90, objectFit: "contain" }}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <h1 style={estilos.titulo}>Portal do Aluno</h1>
            <p style={estilos.subtitulo}>Instituto Jovens Periféricos</p>
          </div>

          <div style={estilos.mensagem}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>
              <strong>Que alegria ter você por aqui!</strong>
              <br />
              Sua dedicação e sua trajetória merecem ser celebradas. Neste espaço
              você pode acessar seus certificados, conferir seus próximos
              atendimentos e acompanhar seus cursos no Instituto Jovens Periféricos.
            </p>
          </div>

          <div style={{ marginTop: 24 }}>
            <label style={estilos.label}>CPF</label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(formatarCpf(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              style={estilos.input}
            />

            <label style={estilos.label}>Data de nascimento</label>
            <input
              type="date"
              value={nascimento}
              onChange={(e) => setNascimento(e.target.value)}
              style={estilos.input}
            />

            <label style={estilos.label}>WhatsApp</label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatarTelefone(e.target.value))}
              placeholder="(71) 99999-9999"
              inputMode="numeric"
              style={estilos.input}
            />

            {erro && (
              <div
                style={{
                  background: "#fff3cd",
                  border: "1px solid #ffeeba",
                  color: "#856404",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  fontSize: 14,
                }}
              >
                {erro}
              </div>
            )}

            <button
              onClick={buscarAluno}
              disabled={carregando}
              style={{
                ...estilos.botao,
                opacity: carregando ? 0.7 : 1,
                cursor: carregando ? "wait" : "pointer",
              }}
            >
              {carregando ? "Consultando..." : "🔎 Encontrar meus dados"}
            </button>

            <p
              style={{
                fontSize: 12,
                color: "#8a99ad",
                textAlign: "center",
                marginTop: 16,
              }}
            >
              🔒 Seus dados estão protegidos. Usamos 3 informações para confirmar
              sua identidade.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ================================================================
  // LOGADO
  // ================================================================
  return (
    <div style={estilos.wrapper}>
      <div style={{ ...estilos.card, maxWidth: 780 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: "#1a2a4f" }}>
              Olá, {aluno.nomeCompleto.split(" ")[0]} 👋
            </h2>
            <p style={{ margin: "4px 0 0", color: "#6b7a8f", fontSize: 13 }}>
              {aluno.nomeCompleto}
            </p>
          </div>
          <button onClick={sair} style={estilos.botaoSair}>
            Sair
          </button>
        </div>

        <div style={estilos.abas}>
          <AbaBtn
            ativo={abaAtiva === "certificados"}
            onClick={() => setAbaAtiva("certificados")}
          >
            📜 Certificados {certificados.length > 0 && `(${certificados.length})`}
          </AbaBtn>
          <AbaBtn
            ativo={abaAtiva === "agenda"}
            onClick={() => setAbaAtiva("agenda")}
          >
            📅 Atendimentos {agendamentos.length > 0 && `(${agendamentos.length})`}
          </AbaBtn>
          <AbaBtn
            ativo={abaAtiva === "cursos"}
            onClick={() => setAbaAtiva("cursos")}
          >
            📚 Cursos {cursos.length > 0 && `(${cursos.length})`}
          </AbaBtn>
        </div>

        {carregando && (
          <p style={{ textAlign: "center", color: "#6b7a8f", padding: 20 }}>
            Carregando suas informações...
          </p>
        )}

        {/* ============ CERTIFICADOS ============ */}
        {!carregando && abaAtiva === "certificados" && (
          <div>
            {certificados.length === 0 ? (
              <Vazio
                emoji="📜"
                titulo="Nenhum certificado disponível ainda"
                texto="Quando você concluir os requisitos de um curso, seu certificado aparecerá aqui automaticamente."
              />
            ) : (
              certificados.map((c) => (
                <div key={c.id} style={estilos.item}>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontWeight: 700, color: "#1a2a4f", fontSize: 16 }}
                    >
                      {c.cursoNome}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7a8f", marginTop: 4 }}>
                      {c.cargaHoraria}h
                      {c.frequencia != null &&
                        ` • ${c.frequencia}% de frequência`}
                      {c.dataFim && ` • Concluído em ${formatarData(c.dataFim)}`}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#8a99ad",
                        marginTop: 4,
                        fontFamily: "monospace",
                      }}
                    >
                      Código: {c.codigo}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() =>
                        window.open(`/certificado/${c.codigo}`, "_blank")
                      }
                      style={estilos.botaoAcaoSec}
                      title="Ver validação pública"
                    >
                      👁️ Ver
                    </button>
                    <button
                      onClick={() => baixarPDF(c)}
                      disabled={baixando === c.codigo}
                      style={{
                        ...estilos.botaoAcao,
                        opacity: baixando === c.codigo ? 0.6 : 1,
                        cursor: baixando === c.codigo ? "wait" : "pointer",
                      }}
                    >
                      {baixando === c.codigo ? "..." : "⬇️ Baixar PDF"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ============ AGENDAMENTOS ============ */}
        {!carregando && abaAtiva === "agenda" && (
          <div>
            {agendamentos.length === 0 ? (
              <Vazio
                emoji="📅"
                titulo="Nenhum atendimento futuro"
                texto="Você não tem atendimentos marcados. Quando houver, aparecerão aqui."
              />
            ) : (
              agendamentos.map((ag) => (
                <div key={ag.id} style={estilos.item}>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontWeight: 700, color: "#1a2a4f", fontSize: 15 }}
                    >
                      {formatarData(ag.data)} às {ag.horario}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7a8f", marginTop: 4 }}>
                      {ag.nomeProfissional || "Profissional"}
                      {ag.especialidade && ` • ${ag.especialidade}`}
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 6,
                        padding: "2px 10px",
                        borderRadius: 999,
                        background:
                          ag.status === "realizado" ? "#d4edda" : "#e6f0ff",
                        color:
                          ag.status === "realizado" ? "#155724" : "#1a2a4f",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {ag.status === "realizado" ? "Realizado" : "Agendado"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ============ CURSOS ============ */}
        {!carregando && abaAtiva === "cursos" && (
          <div>
            {cursos.length === 0 ? (
              <Vazio
                emoji="📚"
                titulo="Nenhum curso ativo no momento"
                texto="Seus cursos concluídos aparecem na aba de certificados."
              />
            ) : (
              cursos.map((c) => (
                <div key={`${c.cursoId}-${c.turmaId}`} style={estilos.item}>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontWeight: 700, color: "#1a2a4f", fontSize: 16 }}
                    >
                      {c.cursoNome}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7a8f", marginTop: 4 }}>
                      Turma: {c.turmaNome}
                      {c.cargaHoraria && ` • ${c.cargaHoraria}h`}
                    </div>
                    {(c.dataInicio || c.dataFim) && (
                      <div
                        style={{ fontSize: 12, color: "#8a99ad", marginTop: 4 }}
                      >
                        {c.dataInicio && `Início: ${formatarData(c.dataInicio)}`}
                        {c.dataFim && ` • Término: ${formatarData(c.dataFim)}`}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 999,
                      background: "#e6f0ff",
                      color: "#1a2a4f",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    ativa
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        <p
          style={{
            textAlign: "center",
            color: "#8a99ad",
            fontSize: 12,
            marginTop: 24,
          }}
        >
          Precisa de ajuda? Fale com o Instituto Jovens Periféricos.
        </p>
      </div>
    </div>
  );
}

// ============ Subcomponentes ============
function AbaBtn({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 14px",
        border: "none",
        background: ativo ? "#1a2a4f" : "#f4f6f9",
        color: ativo ? "#fff" : "#33415c",
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 13,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function Vazio({
  emoji,
  titulo,
  texto,
}: {
  emoji: string;
  titulo: string;
  texto: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px 20px",
        background: "#fafbfd",
        borderRadius: 12,
        border: "1px dashed #e0e4e8",
      }}
    >
      <div style={{ fontSize: 42, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontWeight: 700, color: "#1a2a4f", marginBottom: 4 }}>
        {titulo}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "#6b7a8f",
          maxWidth: 400,
          margin: "0 auto",
        }}
      >
        {texto}
      </div>
    </div>
  );
}

// ============ Estilos ============
const estilos: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2f7 0%, #dbe6f3 100%)",
    padding: "40px 16px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    maxWidth: 560,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 16,
    padding: 32,
    boxShadow: "0 10px 40px rgba(26,42,79,0.08)",
  },
  titulo: {
    color: "#1a2a4f",
    margin: "12px 0 4px",
    fontSize: 24,
    letterSpacing: "0.3px",
  },
  subtitulo: { color: "#6b7a8f", fontSize: 13, margin: 0 },
  mensagem: {
    background: "linear-gradient(135deg, #eef2f7 0%, #e6f0ff 100%)",
    padding: 20,
    borderRadius: 12,
    color: "#1a2a4f",
    border: "1px solid #dbe6f3",
  },
  label: {
    display: "block",
    fontWeight: 600,
    color: "#1a2a4f",
    marginBottom: 6,
    fontSize: 13,
  },
  input: {
    width: "100%",
    padding: 12,
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 15,
    outline: "none",
  },
  botao: {
    width: "100%",
    padding: "14px 20px",
    background: "#1a2a4f",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  botaoSair: {
    padding: "6px 14px",
    background: "#f4f6f9",
    color: "#33415c",
    border: "1px solid #e0e4e8",
    borderRadius: 8,
    fontSize: 13,
    cursor: "pointer",
  },
  abas: {
    display: "flex",
    gap: 8,
    margin: "20px 0 16px",
    padding: 4,
    background: "#f4f6f9",
    borderRadius: 12,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    background: "#fff",
    border: "1px solid #e0e4e8",
    borderRadius: 12,
    marginBottom: 10,
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
  },
  botaoAcao: {
    padding: "8px 14px",
    background: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  botaoAcaoSec: {
    padding: "8px 12px",
    background: "#fff",
    color: "#33415c",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};