import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import CertificateTemplate from "./CertificateTemplate";

// Interfaces
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
  const [gerando, setGerando] = useState(false);

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

  const gerarPDF = async (aluno: Aluno) => {
    // Validação dos professores
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

    setGerando(true);

    let container: HTMLDivElement | null = null;
    let reactRoot: any = null;

    try {
      container = document.createElement("div");
      container.style.position = "fixed";
      container.style.top = "-9999px";
      container.style.left = "-9999px";
      container.style.width = "297mm";
      container.style.height = "210mm";
      container.style.background = "#fcfbf8";
      document.body.appendChild(container);

      const root = document.createElement("div");
      root.style.width = "297mm";
      root.style.height = "210mm";
      container.appendChild(root);

      const ReactDOM = await import("react-dom/client");
      reactRoot = ReactDOM.createRoot(root);
      reactRoot.render(
        <CertificateTemplate
          alunoNome={aluno.nomeCompleto}
          cursoNome={cursoNome}
          cargaHoraria={cargaHoraria}
          dataInicio={dataInicio}
          dataFim={dataFim}
          frequencia={aluno.porcentagem}
          professores={nomesProfessores}
          logoUrl="/logo-ijp.png"
          assinaturaUrl="/assinatura.png"
        />
      );

      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 50));

      const images = root.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            if (img.complete && img.naturalWidth > 0) resolve();
          });
        })
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(root, {
        scale: 5,
        useCORS: true,
        logging: false,
        backgroundColor: "#fcfbf8",
        windowWidth: root.scrollWidth,
        windowHeight: root.scrollHeight,
      });

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

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar certificado. Tente novamente.");
    } finally {
      if (reactRoot) {
        try { reactRoot.unmount(); } catch (_) {}
      }
      if (container && container.parentNode) {
        try { document.body.removeChild(container); } catch (_) {}
      }
      setGerando(false);
    }
  };

  const confirmarEmissao = async () => {
    if (modoEmissao === "individual" && alunoSelecionado) {
      await gerarPDF(alunoSelecionado);
    } else if (modoEmissao === "todos") {
      const aprovados = alunos.filter(a => a.status === "aprovado");
      if (aprovados.length === 0) {
        alert("Nenhum aluno aprovado.");
        fecharModal();
        return;
      }
      for (const aluno of aprovados) {
        await gerarPDF(aluno);
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
            <button onClick={emitirTodosCertificados} disabled={alunos.filter(a => a.status === "aprovado").length === 0 || gerando}>
              {gerando ? "Gerando..." : "Emitir certificados para todos aprovados"}
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
                      <button onClick={() => abrirModal(aluno, "individual")} disabled={gerando}>
                        Emitir certificado
                      </button>
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
              <button onClick={confirmarEmissao} style={{ padding: "8px 20px", background: "#28a745", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }} disabled={gerando}>
                {gerando ? "Gerando..." : "Confirmar"}
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