import { useState } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function RestaurarAlunos() {
  const [carregando, setCarregando] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [resultado, setResultado] = useState<{ total: number; recuperados: number } | null>(null);

  const adicionarLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const handleRestaurar = async () => {
    if (!confirm("Isso vai recriar documentos de alunos que estão em turmas mas não existem mais. Continuar?")) return;

    setCarregando(true);
    setLogs([]);
    setResultado(null);

    try {
      adicionarLog("🔍 Buscando IDs de alunos presentes nas turmas...");

      const cursosSnap = await getDocs(collection(db, "cursos"));
      const idsTurmas = new Set<string>();

      for (const cursoDoc of cursosSnap.docs) {
        const cursoId = cursoDoc.id;
        const turmasSnap = await getDocs(collection(db, "cursos", cursoId, "turmas"));
        turmasSnap.forEach(turmaDoc => {
          const data = turmaDoc.data();
          const alunos = data.alunos || [];
          alunos.forEach((id: string) => idsTurmas.add(id));
        });
      }

      adicionarLog(`📌 IDs únicos de alunos encontrados nas turmas: ${idsTurmas.size}`);

      const alunosSnap = await getDocs(collection(db, "alunos"));
      const idsAlunosExistentes = new Set<string>();
      alunosSnap.forEach(doc => idsAlunosExistentes.add(doc.id));

      adicionarLog(`📌 IDs de alunos existentes: ${idsAlunosExistentes.size}`);

      const idsParaRestaurar = [...idsTurmas].filter(id => !idsAlunosExistentes.has(id));

      if (idsParaRestaurar.length === 0) {
        adicionarLog("✅ Nenhum aluno removido encontrado. Tudo certo!");
        setResultado({ total: 0, recuperados: 0 });
        setCarregando(false);
        return;
      }

      adicionarLog(`⚠️ Encontrados ${idsParaRestaurar.length} alunos removidos. Recriando...`);

      let recuperados = 0;
      for (const id of idsParaRestaurar) {
        try {
          await setDoc(doc(db, "alunos", id), {
            nomeCompleto: `Aluno recuperado (${id.slice(0, 8)})`,
            cpf: "",
            endereco: "",
            email: "",
            telefone: "",
            nascimento: "",
            menor: false,
            status: "ativo",
            criadoEm: new Date(),
          });
          adicionarLog(`✅ Aluno recuperado: ${id}`);
          recuperados++;
        } catch (error: any) {
          adicionarLog(`❌ Erro ao recriar ${id}: ${error.message}`);
        }
      }

      adicionarLog(`🎉 Processo concluído! ${recuperados} alunos recriados.`);
      adicionarLog("Agora eles devem aparecer nas turmas novamente. Edite os dados manualmente depois.");
      setResultado({ total: idsParaRestaurar.length, recuperados });

    } catch (error: any) {
      adicionarLog(`❌ Erro geral: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ color: "#1a2a4f" }}>Restaurar Alunos Removidos</h1>
      <p style={{ color: "#6b7a8f" }}>
        Esta página recria documentos de alunos que foram removidos mas ainda estão referenciados em turmas.
      </p>

      <button
        onClick={handleRestaurar}
        disabled={carregando}
        style={{
          padding: "10px 20px",
          background: "#dc3545",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 16,
        }}
      >
        {carregando ? "Processando..." : "Restaurar Alunos"}
      </button>

      {resultado && (
        <div style={{ marginTop: 16, padding: 12, background: "#e9ecef", borderRadius: 8 }}>
          <strong>Resumo:</strong> {resultado.recuperados} de {resultado.total} alunos restaurados.
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          background: "#f8f9fa",
          padding: 16,
          borderRadius: 8,
          maxHeight: 400,
          overflow: "auto",
          border: "1px solid #dee2e6",
          fontFamily: "monospace",
          fontSize: 14,
        }}
      >
        {logs.length === 0 && <span style={{ color: "#6b7a8f" }}>Nenhum log ainda.</span>}
        {logs.map((log, idx) => (
          <div key={idx}>{log}</div>
        ))}
      </div>
    </div>
  );
}