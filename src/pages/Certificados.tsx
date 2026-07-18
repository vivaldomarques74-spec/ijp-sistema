import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import jsPDF from "jspdf";

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
}

interface Aluno {
  id: string;
  nomeCompleto: string;
  presencas: number;
  porcentagem: number;
  status: "aprovado" | "reprovado";
}

export default function Certificados() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [cursoId, setCursoId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [quantidadeProfessores, setQuantidadeProfessores] = useState(2);
  const [nomesProfessores, setNomesProfessores] = useState<string[]>(["", ""]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [modoEmissao, setModoEmissao] = useState<"individual" | "todos">("individual");

  useEffect(() => {
    const carregarCursos = async () => {
      const snap = await getDocs(collection(db, "cursos"));
      setCursos(snap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
    };
    carregarCursos();
  }, []);

  useEffect(() => {
    if (!cursoId) {
      setTurmas([]);
      setTurmaId("");
      setAlunos([]);
      return;
    }
    const carregarTurmas = async () => {
      const snap = await getDocs(collection(db, "cursos", cursoId, "turmas"));
      setTurmas(snap.docs.map(d => ({
        id: d.id,
        nome: d.data().nome,
        alunos: d.data().alunos || [],
        totalAulas: d.data().totalAulas || 0,
        dataInicio: d.data().dataInicio,
        dataFim: d.data().dataFim,
        cargaHoraria: d.data().cargaHoraria || 0,
      })));
    };
    carregarTurmas();
  }, [cursoId]);

  useEffect(() => {
    if (!cursoId || !turmaId) {
      setAlunos([]);
      return;
    }
    const carregarAlunos = async () => {
      setCarregando(true);
      const turma = turmas.find(t => t.id === turmaId);
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
      const alunosSnap = await getDocs(collection(db, "alunos"));
      const lista: Aluno[] = [];
      for (const alunoDoc of alunosSnap.docs) {
        if (alunosIds.includes(alunoDoc.id)) {
          const nome = alunoDoc.data().nomeCompleto;
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
            presencas: totalPresencas,
            porcentagem: parseFloat(porcentagem.toFixed(2)),
            status,
          });
        }
      }
      lista.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
      setAlunos(lista);
      setCarregando(false);
    };
    carregarAlunos();
  }, [cursoId, turmaId, turmas]);

  const abrirModal = (aluno: Aluno, modo: "individual" | "todos") => {
    setAlunoSelecionado(aluno);
    setModoEmissao(modo);
    setMostrarModal(true);
    // Inicializar professores com valores padrão
    setQuantidadeProfessores(2);
    setNomesProfessores(["Jadison dos Santos Palma", ""]);
  };

  const fecharModal = () => {
    setMostrarModal(false);
    setAlunoSelecionado(null);
  };

  const atualizarQuantidade = (qtd: number) => {
    setQuantidadeProfessores(qtd);
    const novos = [];
    for (let i = 0; i < qtd; i++) {
      novos.push(nomesProfessores[i] || "");
    }
    setNomesProfessores(novos);
  };

  const atualizarNomeProfessor = (index: number, valor: string) => {
    const novos = [...nomesProfessores];
    novos[index] = valor;
    setNomesProfessores(novos);
  };

  const gerarPDF = (aluno: Aluno) => {
    // Validar nomes dos professores
    for (let i = 0; i < nomesProfessores.length; i++) {
      if (!nomesProfessores[i].trim()) {
        alert(`Preencha o nome do Professor ${i + 1}`);
        return;
      }
    }

    const turma = turmas.find(t => t.id === turmaId)!;
    const cursoNome = cursos.find(c => c.id === cursoId)?.nome || "Curso";
    const cargaHoraria = turma?.cargaHoraria || 720;
    const dataInicio = turma?.dataInicio ? turma.dataInicio.toDate().toLocaleDateString() : "08 de Junho";
    const dataFim = turma?.dataFim ? turma.dataFim.toDate().toLocaleDateString() : "08 de Setembro de 2026";
    const periodo = `no período de ${dataInicio} a ${dataFim}`;

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;

    // Fundo
    pdf.setFillColor(248, 245, 240);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    // Bordas
    pdf.setDrawColor(180, 150, 100);
    pdf.setLineWidth(3);
    pdf.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);
    pdf.setDrawColor(200, 180, 140);
    pdf.setLineWidth(1);
    pdf.rect(margin + 6, margin + 6, pageWidth - margin * 2 - 12, pageHeight - margin * 2 - 12);
    pdf.setDrawColor(180, 150, 100);
    pdf.setLineWidth(0.5);
    pdf.rect(margin + 10, margin + 10, pageWidth - margin * 2 - 20, pageHeight - margin * 2 - 20);

    // Selo
    pdf.setDrawColor(180, 150, 100);
    pdf.setLineWidth(2);
    pdf.circle(pageWidth - 35, 35, 18);
    pdf.setFontSize(14);
    pdf.setTextColor(180, 150, 100);
    pdf.text("★", pageWidth - 35, 32, { align: "center" });
    pdf.setFontSize(8);
    pdf.text("INSTITUTO", pageWidth - 35, 43, { align: "center" });
    pdf.text("JOVENS", pageWidth - 35, 48, { align: "center" });

    // Logo
    try {
      const logoImg = new Image();
      logoImg.src = "/logo-ijp.png";
      pdf.addImage(logoImg, "PNG", pageWidth / 2 - 35, margin + 15, 70, 30);
    } catch (error) {}

    // Títulos
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.setTextColor(40, 50, 80);
    pdf.text("INSTITUTO JOVENS PERIFÉRICOS", pageWidth / 2, margin + 65, { align: "center" });

    pdf.setFontSize(28);
    pdf.setTextColor(180, 150, 100);
    pdf.text("CERTIFICADO", pageWidth / 2, margin + 95, { align: "center" });

    pdf.setDrawColor(180, 150, 100);
    pdf.setLineWidth(0.8);
    pdf.line(pageWidth / 2 - 70, margin + 102, pageWidth / 2 + 70, margin + 102);

    // Texto
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);

    const linhas = [
      `Orgulhosamente certificamos que ${aluno.nomeCompleto} concluiu o curso "${cursoNome}",`,
      `com carga horária de ${cargaHoraria} horas, ministrado pelo Instituto Jovens Periféricos`,
      `(CNPJ: 43.248.302/0001-96), ${periodo}.`,
      `Frequência: ${aluno.porcentagem}%`,
    ];
    let y = margin + 125;
    for (const linha of linhas) {
      pdf.text(linha, pageWidth / 2, y, { align: "center" });
      y += 9;
    }

    // Assinaturas
    const assinaturaY = y + 20;
    const larguraAss = 70;
    const alturaAss = 25;
    const totalAssinaturas = nomesProfessores.length;
    const espacoTotal = pageWidth - margin * 2 - larguraAss * totalAssinaturas;
    const espaco = totalAssinaturas > 1 ? espacoTotal / (totalAssinaturas + 1) : 0;

    let assinaturaImg: HTMLImageElement | null = null;
    try {
      const img = new Image();
      img.src = "/Assinatura1.png";
      assinaturaImg = img;
    } catch (e) {}

    for (let i = 0; i < totalAssinaturas; i++) {
      const x = totalAssinaturas === 1
        ? (pageWidth - larguraAss) / 2
        : margin + espaco + i * (larguraAss + espaco);

      if (assinaturaImg) {
        try {
          pdf.addImage(assinaturaImg, "PNG", x, assinaturaY, larguraAss, alturaAss);
        } catch (e) {
          pdf.line(x + 10, assinaturaY + alturaAss, x + larguraAss - 10, assinaturaY + alturaAss);
        }
      } else {
        pdf.line(x + 10, assinaturaY + alturaAss, x + larguraAss - 10, assinaturaY + alturaAss);
      }

      pdf.setFontSize(10);
      pdf.text(nomesProfessores[i], x + larguraAss / 2, assinaturaY + alturaAss + 6, { align: "center" });

      if (i === 0 && totalAssinaturas > 1) {
        pdf.setFontSize(8);
        pdf.text("Diretor(a) Geral", x + larguraAss / 2, assinaturaY + alturaAss + 12, { align: "center" });
      } else if (i === 1 && totalAssinaturas > 1) {
        pdf.setFontSize(8);
        pdf.text("Coordenador(a) Pedagógico(a)", x + larguraAss / 2, assinaturaY + alturaAss + 12, { align: "center" });
      } else if (i === 2 && totalAssinaturas > 1) {
        pdf.setFontSize(8);
        pdf.text("Professor(a)", x + larguraAss / 2, assinaturaY + alturaAss + 12, { align: "center" });
      }
    }

    // Data
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text(`Emitido em: ${new Date().toLocaleDateString()}`, pageWidth - margin, pageHeight - margin, { align: "right" });

    pdf.save(`certificado_${aluno.nomeCompleto.replace(/\s/g, "_")}.pdf`);
  };

  const confirmarEmissao = () => {
    if (modoEmissao === "individual" && alunoSelecionado) {
      gerarPDF(alunoSelecionado);
    } else if (modoEmissao === "todos") {
      const aprovados = alunos.filter(a => a.status === "aprovado");
      if (aprovados.length === 0) {
        alert("Nenhum aluno aprovado.");
        fecharModal();
        return;
      }
      for (const aluno of aprovados) {
        gerarPDF(aluno);
      }
      alert(`${aprovados.length} certificados gerados.`);
    }
    fecharModal();
  };

  const emitirTodosCertificados = () => {
    const aprovados = alunos.filter(a => a.status === "aprovado");
    if (aprovados.length === 0) {
      alert("Nenhum aluno aprovado.");
      return;
    }
    abrirModal(aprovados[0], "todos");
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Certificados</h1>
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div>
          <label>Curso: </label>
          <select value={cursoId} onChange={e => setCursoId(e.target.value)}>
            <option value="">Selecione</option>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label>Turma: </label>
          <select value={turmaId} onChange={e => setTurmaId(e.target.value)} disabled={!cursoId}>
            <option value="">Selecione</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
      </div>

      {carregando && <p>Carregando dados...</p>}

      {!carregando && turmaId && (
        <>
          <div style={{ marginBottom: 16 }}>
            <button onClick={emitirTodosCertificados} disabled={alunos.filter(a => a.status === "aprovado").length === 0}>
              Emitir certificados para todos aprovados
            </button>
          </div>
          {alunos.length === 0 && <p>Nenhum aluno encontrado para esta turma.</p>}
          {alunos.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Presenças</th>
                  <th>Total de aulas</th>
                  <th>Porcentagem</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map(aluno => (
                  <tr key={aluno.id}>
                    <td style={{ padding: 8 }}>{aluno.nomeCompleto}</td>
                    <td style={{ padding: 8 }}>{aluno.presencas}</td>
                    <td style={{ padding: 8 }}>{turmas.find(t => t.id === turmaId)?.totalAulas || 0}</td>
                    <td style={{ padding: 8 }}>{aluno.porcentagem}%</td>
                    <td style={{ padding: 8, color: aluno.status === "aprovado" ? "green" : "red" }}>
                      {aluno.status === "aprovado" ? "Aprovado" : "Reprovado"}
                    </td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => abrirModal(aluno, "individual")}>Emitir certificado</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Modal para definir professores */}
      {mostrarModal && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#fff",
            padding: 24,
            borderRadius: 12,
            maxWidth: 500,
            width: "90%",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
          }}>
            <h3 style={{ marginTop: 0 }}>Informe os professores</h3>
            <div style={{ marginBottom: 16 }}>
              <label>Quantidade: </label>
              <select
                value={quantidadeProfessores}
                onChange={e => atualizarQuantidade(Number(e.target.value))}
                style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc", marginLeft: 8 }}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
            {nomesProfessores.map((nome, idx) => (
              <div key={idx} style={{ marginBottom: 8 }}>
                <label style={{ marginRight: 8 }}>Professor {idx + 1}: </label>
                <input
                  type="text"
                  placeholder={`Nome do professor ${idx + 1}`}
                  value={nome}
                  onChange={e => atualizarNomeProfessor(idx, e.target.value)}
                  style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc", width: "70%" }}
                />
              </div>
            ))}
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button onClick={confirmarEmissao} style={{ padding: "8px 20px", background: "#28a745", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                Confirmar
              </button>
              <button onClick={fecharModal} style={{ padding: "8px 20px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}