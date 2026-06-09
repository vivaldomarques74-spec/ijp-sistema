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
    const dataInicio = turma?.dataInicio ? turma.dataInicio.toDate().toLocaleDateString() : "20 de Janeiro";
    const dataFim = turma?.dataFim ? turma.dataFim.toDate().toLocaleDateString() : "30 de Abril de 2026";

    const pdf = new jsPDF("landscape");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;

    // Logo
    try {
      const logoImg = new Image();
      logoImg.src = "/logo-ijp.png";
      pdf.addImage(logoImg, "PNG", pageWidth / 2 - 40, margin, 80, 35);
    } catch (error) {
      console.warn("Logo não encontrada");
    }

    // Título
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.setTextColor(0, 0, 0);
    pdf.text("INSTITUTO JOVENS PERIFÉRICOS", pageWidth / 2, margin + 55, { align: "center" });

    pdf.setFontSize(26);
    pdf.setTextColor(100, 100, 100);
    pdf.text("CERTIFICADO", pageWidth / 2, margin + 85, { align: "center" });

    // Corpo
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Orgulhosamente certificamos que`, pageWidth / 2, margin + 120, { align: "center" });

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(`${aluno.nomeCompleto}`, pageWidth / 2, margin + 145, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(14);
    pdf.text(`concluiu o curso "${cursoNome}"`, pageWidth / 2, margin + 170, { align: "center" });
    pdf.text(`com carga horária de ${cargaHoraria} horas, ministrado pelo Instituto Jovens Periféricos`, pageWidth / 2, margin + 190, { align: "center" });
    pdf.text(`(CNPJ: 43.248.302/0001-96), em ${dataInicio} a ${dataFim}.`, pageWidth / 2, margin + 210, { align: "center" });
    pdf.text(`Frequência: ${aluno.porcentagem}%`, pageWidth / 2, margin + 235, { align: "center" });

    // Assinaturas
    const assY = pageHeight - margin - 30;
    const assW = 70;
    const assH = 25;
    const espaco = 40;
    const esquerdaX = pageWidth / 2 - espaco - assW;
    const direitaX = pageWidth / 2 + espaco;

    try {
      const ass1 = new Image();
      ass1.src = "/assinatura1.png";
      pdf.addImage(ass1, "PNG", esquerdaX, assY, assW, assH);
    } catch (error) {
      pdf.line(esquerdaX + 10, assY + assH, esquerdaX + assW - 10, assY + assH);
    }
    try {
      const ass2 = new Image();
      ass2.src = "/assinatura2.png";
      pdf.addImage(ass2, "PNG", direitaX, assY, assW, assH);
    } catch (error) {
      pdf.line(direitaX + 10, assY + assH, direitaX + assW - 10, assY + assH);
    }

    pdf.setFontSize(10);
    pdf.text("Diretor(a) Geral", esquerdaX + assW / 2, assY + assH + 6, { align: "center" });
    pdf.text("Coordenador(a) Pedagógico(a)", direitaX + assW / 2, assY + assH + 6, { align: "center" });

    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(`Emitido em: ${new Date().toLocaleDateString()}`, pageWidth - margin, pageHeight - margin, { align: "right" });

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
              {alunos.length === 0 && (
                <tr>
                  <td colSpan={6}>Nenhum aluno encontrado para esta turma.</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}