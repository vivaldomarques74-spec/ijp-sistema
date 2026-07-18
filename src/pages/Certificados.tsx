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

  const emitirCertificado = (aluno: Aluno) => {
    if (aluno.status !== "aprovado") {
      alert(`Aluno ${aluno.nomeCompleto} não atingiu 70% de presença (${aluno.porcentagem}%).`);
      return;
    }
    const turma = turmas.find(t => t.id === turmaId);
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
    const marginX = 25;
    const marginY = 20;

    // Logo
    try {
      const logoImg = new Image();
      logoImg.src = "/logo-ijp.png";
      pdf.addImage(logoImg, "PNG", pageWidth / 2 - 40, marginY, 80, 35);
    } catch (error) {
      console.warn("Logo não encontrada em /logo-ijp.png");
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    pdf.text("INSTITUTO JOVENS PERIFÉRICOS", pageWidth / 2, marginY + 45, { align: "center" });

    pdf.setFontSize(24);
    pdf.setTextColor(80, 80, 80);
    pdf.text("CERTIFICADO", pageWidth / 2, marginY + 70, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(13);
    pdf.setTextColor(0, 0, 0);

    const linha1 = `Orgulhosamente certificamos que ${aluno.nomeCompleto} concluiu o curso "${cursoNome}",`;
    const linha2 = `com carga horária de ${cargaHoraria} horas, ministrado pelo Instituto Jovens Periféricos`;
    const linha3 = `(CNPJ: 43.248.302/0001-96), ${periodo}.`;
    const linha4 = `Frequência: ${aluno.porcentagem}%`;

    let y = marginY + 110;
    pdf.text(linha1, pageWidth / 2, y, { align: "center" });
    y += 8;
    pdf.text(linha2, pageWidth / 2, y, { align: "center" });
    y += 8;
    pdf.text(linha3, pageWidth / 2, y, { align: "center" });
    y += 10;
    pdf.text(linha4, pageWidth / 2, y, { align: "center" });

    // Assinaturas
    const assinaturaY = y + 20;
    const larguraAss = 60;
    const alturaAss = 20;
    const espaco = 30;
    const esquerdaX = pageWidth / 2 - espaco - larguraAss;
    const direitaX = pageWidth / 2 + espaco;

    try {
      const ass1 = new Image();
      ass1.src = "/Assinatura1.png";
      pdf.addImage(ass1, "PNG", esquerdaX, assinaturaY, larguraAss, alturaAss);
    } catch (e) {
      pdf.line(esquerdaX + 10, assinaturaY + alturaAss, esquerdaX + larguraAss - 10, assinaturaY + alturaAss);
    }
    pdf.setFontSize(11);
    pdf.text("Jadison dos Santos Palma", esquerdaX + larguraAss / 2, assinaturaY + alturaAss + 6, { align: "center" });

    try {
      const ass2 = new Image();
      ass2.src = "/assinatura2.png";
      pdf.addImage(ass2, "PNG", direitaX, assinaturaY, larguraAss, alturaAss);
    } catch (e) {
      pdf.line(direitaX + 10, assinaturaY + alturaAss, direitaX + larguraAss - 10, assinaturaY + alturaAss);
    }
    pdf.text("_________________________", direitaX + larguraAss / 2, assinaturaY + alturaAss + 6, { align: "center" });
    pdf.setFontSize(10);
    pdf.text("Professor(a)", direitaX + larguraAss / 2, assinaturaY + alturaAss + 12, { align: "center" });

    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(`Emitido em: ${new Date().toLocaleDateString()}`, pageWidth - marginX, pageHeight - marginY, { align: "right" });

    pdf.save(`certificado_${aluno.nomeCompleto.replace(/\s/g, "_")}.pdf`);
  };

  const emitirTodosCertificados = () => {
    const aprovados = alunos.filter(a => a.status === "aprovado");
    if (aprovados.length === 0) {
      alert("Nenhum aluno aprovado.");
      return;
    }
    for (const aluno of aprovados) {
      emitirCertificado(aluno);
    }
    alert(`${aprovados.length} certificados gerados.`);
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
                      <button onClick={() => emitirCertificado(aluno)}>Emitir certificado</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}