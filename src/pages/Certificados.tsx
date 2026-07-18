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

  const abrirModal = (aluno: Aluno | null, modo: "individual" | "todos") => {
    setAlunoSelecionado(aluno);
    setModoEmissao(modo);
    setMostrarModal(true);
    setQuantidadeProfessores(2);
    setNomesProfessores(["", ""]);
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

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 25;

    // Marca d'água
    try {
      const logoImg = new Image();
      logoImg.src = "/logo-ijp.png";
      const gState = new (pdf as any).GState({ opacity: 0.05 });
      pdf.setGState(gState);
      pdf.addImage(logoImg, "PNG", pageWidth / 2 - 40, pageHeight / 2 - 30, 80, 60);
      pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
    } catch (e) {
      console.warn("Marca d'água não carregada");
    }

    // Linha dourada superior
    pdf.setDrawColor(201, 169, 110);
    pdf.setLineWidth(0.5);
    pdf.line(margin, margin + 10, pageWidth - margin, margin + 10);

    // Logo
    try {
      const logoImg = new Image();
      logoImg.src = "/logo-ijp.png";
      pdf.addImage(logoImg, "PNG", pageWidth / 2 - 25, margin + 15, 50, 35);
    } catch (e) {}

    // Título da instituição
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(26, 42, 79);
    pdf.text("INSTITUTO JOVENS PERIFÉRICOS", pageWidth / 2, margin + 60, { align: "center" });

    // Linha fina abaixo do título
    pdf.setDrawColor(201, 169, 110);
    pdf.setLineWidth(0.3);
    pdf.line(pageWidth / 2 - 40, margin + 64, pageWidth / 2 + 40, margin + 64);

    // Título CERTIFICADO
    pdf.setFont("times", "italic");
    pdf.setFontSize(26);
    pdf.setTextColor(26, 42, 79);
    pdf.text("CERTIFICADO", pageWidth / 2, margin + 90, { align: "center" });

    // Corpo
    pdf.setFont("times", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);

    const nomeAluno = aluno.nomeCompleto;
    const texto1 = `Certificamos que ${nomeAluno} concluiu com êxito o curso "${cursoNome}",`;
    const texto2 = `com carga horária de ${cargaHoraria} horas, promovido pelo Instituto Jovens Periféricos.`;
    const texto3 = `Período: ${dataInicio} a ${dataFim}`;
    const texto4 = `Frequência: ${aluno.porcentagem}%`;

    let y = margin + 115;
    pdf.text(texto1, pageWidth / 2, y, { align: "center" });
    y += 10;
    pdf.text(texto2, pageWidth / 2, y, { align: "center" });
    y += 14;
    pdf.text(texto3, pageWidth / 2, y, { align: "center" });
    y += 8;
    pdf.text(texto4, pageWidth / 2, y, { align: "center" });

    // Assinatura do Presidente
    const assinaturaY = y + 20;
    const assW = 70;
    const assH = 25;
    const presX = pageWidth / 2 - 35;

    try {
      const assImg = new Image();
      assImg.src = "/assinatura.png";
      if (assImg.complete && assImg.naturalWidth > 0) {
        pdf.addImage(assImg, "PNG", presX, assinaturaY, assW, assH);
      } else {
        pdf.line(presX + 10, assinaturaY + assH, presX + assW - 10, assinaturaY + assH);
      }
    } catch (e) {
      pdf.line(presX + 10, assinaturaY + assH, presX + assW - 10, assinaturaY + assH);
    }
    pdf.setFont("times", "bold");
    pdf.setFontSize(10);
    pdf.text("Jadison dos Santos Palma", presX + assW / 2, assinaturaY + assH + 6, { align: "center" });
    pdf.setFont("times", "normal");
    pdf.setFontSize(9);
    pdf.text("Presidente", presX + assW / 2, assinaturaY + assH + 12, { align: "center" });
    pdf.text("Instituto Jovens Periféricos", presX + assW / 2, assinaturaY + assH + 17, { align: "center" });

    // Professores
    const profYStart = assinaturaY + 30;
    const totalProf = nomesProfessores.length;
    const profSpacing = 40;
    const startXProf = (pageWidth - (totalProf - 1) * profSpacing - 60) / 2;

    for (let i = 0; i < totalProf; i++) {
      const x = startXProf + i * profSpacing;
      const yProf = profYStart + 10;

      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      pdf.line(x, yProf + 15, x + 60, yProf + 15);

      pdf.setFont("times", "normal");
      pdf.setFontSize(10);
      pdf.text(nomesProfessores[i], x + 30, yProf + 22, { align: "center" });
      pdf.setFontSize(9);
      pdf.text("Professor(a)", x + 30, yProf + 28, { align: "center" });
    }

    // Rodapé
    const rodapeY = pageHeight - margin + 5;
    pdf.setDrawColor(201, 169, 110);
    pdf.setLineWidth(0.3);
    pdf.line(margin, rodapeY - 3, pageWidth - margin, rodapeY - 3);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text("Instituto Jovens Periféricos", pageWidth / 2, rodapeY + 3, { align: "center" });
    pdf.text("CNPJ: 43.248.302/0001-96", pageWidth / 2, rodapeY + 8, { align: "center" });
    pdf.text("Salvador - BA | 2026", pageWidth / 2, rodapeY + 13, { align: "center" });

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
    abrirModal(null, "todos");
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
              <label>Quantidade de professores: </label>
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