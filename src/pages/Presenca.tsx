import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Curso = {
  id: string;
  nome: string;
};

type Turma = {
  id: string;
  nome: string;
  alunos: string[];
};

type Aluno = {
  id: string;
  nomeCompleto: string;
};

export default function Presencas() {
  const [aba, setAba] = useState<"registrar" | "historico">("registrar");

  const [data, setData] = useState("");
  const [cursoId, setCursoId] = useState("");
  const [turmaId, setTurmaId] = useState("");

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [presencasMarcadas, setPresencasMarcadas] = useState<string[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);

  /* =========================
     CARREGAR CURSOS
  ========================= */
  useEffect(() => {
    async function carregarCursos() {
      const snap = await getDocs(collection(db, "cursos"));
      setCursos(
        snap.docs.map((d) => ({
          id: d.id,
          nome: d.data().nome,
        }))
      );
    }
    carregarCursos();
  }, []);

  /* =========================
     CARREGAR TURMAS (SUBCOLEÇÃO)
  ========================= */
  useEffect(() => {
    if (!cursoId) {
      setTurmas([]);
      setTurmaId("");
      setAlunos([]);
      return;
    }

    async function carregarTurmas() {
      const snap = await getDocs(
        collection(db, "cursos", cursoId, "turmas")
      );

      const lista: Turma[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          nome: data.nome || "(sem nome)",
          alunos: Array.isArray(data.alunos) ? data.alunos : [],
        };
      });

      setTurmas(lista);
    }

    carregarTurmas();
  }, [cursoId]);

  /* =========================
     CARREGAR ALUNOS DA TURMA
  ========================= */
  useEffect(() => {
    if (!cursoId || !turmaId) {
      setAlunos([]);
      setPresencasMarcadas([]);
      return;
    }

    async function carregarAlunos() {
      const turmaRef = doc(db, "cursos", cursoId, "turmas", turmaId);
      const turmaSnap = await getDoc(turmaRef);

      if (!turmaSnap.exists()) {
        setAlunos([]);
        return;
      }

      const turma = turmaSnap.data();
      const alunosIds: string[] = Array.isArray(turma.alunos)
        ? turma.alunos
        : [];

      if (alunosIds.length === 0) {
        setAlunos([]);
        return;
      }

      const alunosSnap = await getDocs(collection(db, "alunos"));

      const lista: Aluno[] = alunosSnap.docs
        .filter((d) => alunosIds.includes(d.id))
        .map((d) => ({
          id: d.id,
          nomeCompleto: d.data().nomeCompleto,
        }));

      setAlunos(lista);
      setPresencasMarcadas([]);
    }

    carregarAlunos();
  }, [cursoId, turmaId]);

  /* =========================
     SALVAR PRESENÇA
  ========================= */
  const salvarPresencas = async () => {
    if (!data || !cursoId || !turmaId) {
      alert("Informe data, curso e turma");
      return;
    }

    const dataPresenca = Timestamp.fromDate(new Date(data));

    for (const alunoId of presencasMarcadas) {
      await addDoc(collection(db, "presencas"), {
        alunoId,
        cursoId,
        turmaId,
        data: dataPresenca,
        presente: true,
      });

      await updateDoc(doc(db, "alunos", alunoId), {
        historicoPresenca: arrayUnion({
          cursoId,
          turmaId,
          data: dataPresenca,
          presente: true,
        }),
      });
    }

    alert("Presença registrada com sucesso");
    setPresencasMarcadas([]);
  };

  /* =========================
     HISTÓRICO
  ========================= */
  const gerarHistorico = async () => {
    const snap = await getDocs(collection(db, "presencas"));

    const lista = snap.docs
      .map((d) => d.data())
      .filter(
        (p) =>
          p.cursoId === cursoId &&
          p.turmaId === turmaId &&
          (!data ||
            p.data.toDate().toISOString().slice(0, 10) === data)
      );

    setHistorico(lista);
  };

  /* =========================
     PDF
  ========================= */
  const gerarPdfPresenca = () => {
    const pdf = new jsPDF();
    pdf.text("Lista de Presença", 14, 15);

    autoTable(pdf, {
      startY: 20,
      head: [["Aluno", "Presente"]],
      body: alunos.map((a) => [
        a.nomeCompleto,
        presencasMarcadas.includes(a.id) ? "Sim" : "Não",
      ]),
    });

    pdf.save("presenca.pdf");
  };

  const gerarPdfAluno = () => {
    const pdf = new jsPDF();
    pdf.text("Relatório de Presença", 14, 15);

    autoTable(pdf, {
      startY: 20,
      head: [["Aluno", "Data", "Status"]],
      body: historico.map((h) => [
        h.alunoId,
        h.data.toDate().toLocaleDateString(),
        h.presente ? "Presente" : "Ausente",
      ]),
    });

    pdf.save("relatorio-presenca.pdf");
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Presenças</h1>

      <button onClick={() => setAba("registrar")}>Registrar</button>
      <button onClick={() => setAba("historico")} style={{ marginLeft: 10 }}>
        Histórico
      </button>

      <hr />

      <input type="date" value={data} onChange={(e) => setData(e.target.value)} />

      <select value={cursoId} onChange={(e) => setCursoId(e.target.value)}>
        <option value="">Curso</option>
        {cursos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>

      <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
        <option value="">Turma</option>
        {turmas.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome}
          </option>
        ))}
      </select>

      <hr />

      {aba === "registrar" && turmaId && (
        <>
          {alunos.map((a) => (
            <label key={a.id} style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={presencasMarcadas.includes(a.id)}
                onChange={(e) =>
                  setPresencasMarcadas((prev) =>
                    e.target.checked
                      ? [...prev, a.id]
                      : prev.filter((id) => id !== a.id)
                  )
                }
              />
              {a.nomeCompleto}
            </label>
          ))}

          <br />

          {alunos.length > 0 && (
            <>
              <button onClick={salvarPresencas}>Salvar Presença</button>
              <button onClick={gerarPdfPresenca} style={{ marginLeft: 10 }}>
                Gerar PDF
              </button>
            </>
          )}
        </>
      )}

      {aba === "historico" && (
        <>
          <button onClick={gerarHistorico}>Buscar Histórico</button>
          <button onClick={gerarPdfAluno} style={{ marginLeft: 10 }}>
            Gerar PDF
          </button>
        </>
      )}
    </div>
  );
}
