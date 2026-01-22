import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Aluno = {
  id: string;
  nomeCompleto: string;
};

type Curso = {
  id: string;
  nome: string;
};

type Turma = {
  id: string;
  nome: string;
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

  // 🔹 CARREGAR CURSOS
  useEffect(() => {
    getDocs(collection(db, "cursos")).then((snap) =>
      setCursos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Curso)))
    );
  }, []);

  // 🔹 CARREGAR TURMAS
  useEffect(() => {
    if (!cursoId) {
      setTurmas([]);
      return;
    }

    getDocs(collection(db, "cursos", cursoId, "turmas")).then((snap) =>
      setTurmas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Turma)))
    );
  }, [cursoId]);

  // 🔹 CARREGAR ALUNOS
  useEffect(() => {
    getDocs(collection(db, "alunos")).then((snap) =>
      setAlunos(
        snap.docs.map((d) => ({
          id: d.id,
          nomeCompleto: d.data().nomeCompleto,
        }))
      )
    );
  }, []);

  // 🔹 SALVAR PRESENÇA
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

  // 🔹 GERAR HISTÓRICO
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

  // 📄 PDF — PRESENÇA DA AULA
  const gerarPdfPresenca = () => {
    const doc = new jsPDF();

    doc.text("Lista de Presença", 14, 15);

    autoTable(doc, {
      startY: 20,
      head: [["Aluno", "Presente"]],
      body: alunos.map((a) => [
        a.nomeCompleto,
        presencasMarcadas.includes(a.id) ? "Sim" : "Não",
      ]),
    });

    doc.save("presenca.pdf");
  };

  // 📄 PDF — RELATÓRIO POR ALUNO
  const gerarPdfAluno = () => {
    const doc = new jsPDF();

    doc.text("Relatório de Presença por Aluno", 14, 15);

    autoTable(doc, {
      startY: 20,
      head: [["Aluno", "Data", "Status"]],
      body: historico.map((h) => [
        h.alunoId,
        h.data.toDate().toLocaleDateString(),
        h.presente ? "Presente" : "Ausente",
      ]),
    });

    doc.save("relatorio-aluno.pdf");
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

      {aba === "registrar" && (
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
          <button onClick={salvarPresencas}>Salvar Presença</button>
          <button onClick={gerarPdfPresenca} style={{ marginLeft: 10 }}>
            Gerar PDF da Presença
          </button>
        </>
      )}

      {aba === "historico" && (
        <>
          <button onClick={gerarHistorico}>Buscar Histórico</button>
          <button onClick={gerarPdfAluno} style={{ marginLeft: 10 }}>
            Gerar PDF por Aluno
          </button>
        </>
      )}
    </div>
  );
}
