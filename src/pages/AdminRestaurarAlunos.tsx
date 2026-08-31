import { useState } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function RestaurarAlunos() {
  const [carregando, setCarregando] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const adicionarLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleRestaurar = async () => {
    if (!confirm("Recriar documentos de alunos que estão em turmas mas não existem?")) return;
    setCarregando(true);
    setLogs([]);

    try {
      const cursosSnap = await getDocs(collection(db, "cursos"));
      const idsTurmas = new Set<string>();

      for (const cursoDoc of cursosSnap.docs) {
        const cursoId = cursoDoc.id;
        const turmasSnap = await getDocs(collection(db, "cursos", cursoId, "turmas"));
        turmasSnap.forEach(turmaDoc => {
          const alunos = turmaDoc.data().alunos || [];
          alunos.forEach((id: string) => idsTurmas.add(id));
        });
      }

      const alunosSnap = await getDocs(collection(db, "alunos"));
      const idsExistentes = new Set<string>();
      alunosSnap.forEach(doc => idsExistentes.add(doc.id));

      const idsParaRestaurar = [...idsTurmas].filter(id => !idsExistentes.has(id));

      if (idsParaRestaurar.length === 0) {
        adicionarLog("✅ Nenhum aluno removido encontrado.");
        setCarregando(false);
        return;
      }

      adicionarLog(`⚠️ Encontrados ${idsParaRestaurar.length} alunos removidos. Recriando...`);
      let count = 0;
      for (const id of idsParaRestaurar) {
        await setDoc(doc(db, "alunos", id), {
          nomeCompleto: `Aluno recuperado (${id.slice(0, 8)})`,
          cpf: "",
          status: "ativo",
          criadoEm: new Date(),
        });
        count++;
        adicionarLog(`✅ Recriado: ${id}`);
      }
      adicionarLog(`🎉 ${count} alunos recriados.`);
    } catch (error: any) {
      adicionarLog(`❌ Erro: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Restaurar Alunos Removidos</h1>
      <button onClick={handleRestaurar} disabled={carregando}>
        {carregando ? "Processando..." : "Restaurar Alunos"}
      </button>
      <div style={{ marginTop: 16, background: "#f8f9fa", padding: 16, borderRadius: 8, maxHeight: 400, overflow: "auto" }}>
        {logs.map((log, i) => <div key={i}>{log}</div>)}
      </div>
    </div>
  );
}