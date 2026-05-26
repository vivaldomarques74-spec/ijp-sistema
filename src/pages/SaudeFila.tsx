import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, where, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudeFila() {
  const [tipos, setTipos] = useState<any[]>([]);
  const [tipoId, setTipoId] = useState("");
  const [fila, setFila] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [horarios, setHorarios] = useState<any[]>([]);
  // Armazenar, para cada paciente, o profissional e horário selecionados
  const [selecoes, setSelecoes] = useState<Record<string, { profissionalId: string; horarioId: string }>>({});

  useEffect(() => {
    const carregarTipos = async () => {
      const snap = await getDocs(collection(db, "tiposAtendimento"));
      setTipos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    const carregarProfissionais = async () => {
      const snap = await getDocs(collection(db, "profissionais"));
      setProfissionais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    carregarTipos();
    carregarProfissionais();
  }, []);

  useEffect(() => {
    if (!tipoId) return;
    const carregarFila = async () => {
      const q = query(collection(db, "filaEspera"), where("tipoId", "==", tipoId), where("status", "==", "aguardando"));
      const snap = await getDocs(q);
      const lista = [];
      for (const docFil of snap.docs) {
        const alunoSnap = await getDoc(doc(db, "alunos", docFil.data().alunoId));
        const alunoData = alunoSnap.data();
        lista.push({
          id: docFil.id,
          alunoId: docFil.data().alunoId,
          nome: alunoData?.nomeCompleto,
          matricula: alunoData?.matricula || "",
          dataSolicitacao: docFil.data().dataSolicitacao,
        });
      }
      // Ordenar por matrícula (assumindo que matrículas mais antigas têm números menores)
      lista.sort((a, b) => {
        const numA = parseInt(a.matricula.split('-')[1] || '0');
        const numB = parseInt(b.matricula.split('-')[1] || '0');
        return numA - numB;
      });
      setFila(lista);
      // Resetar seleções
      setSelecoes({});
    };
    carregarFila();
  }, [tipoId]);

  // Carregar horários do profissional selecionado para um determinado paciente
  const carregarHorariosParaProfissional = async (pacienteId: string, profId: string) => {
    if (!profId) return;
    const snap = await getDocs(collection(db, "agendamentos"));
    const livres = snap.docs.filter(d => 
      d.data().profissionalId === profId && 
      (d.data().status === "livre" || d.data().status === "aguardandoVinculo") && 
      !d.data().alunoId && 
      !d.data().pacienteInfo
    );
    const horariosList = livres.map(d => ({ id: d.id, ...d.data() }));
    setHorarios(horariosList);
    // Atualizar seleção do paciente com o profissional escolhido
    setSelecoes(prev => ({
      ...prev,
      [pacienteId]: { ...prev[pacienteId], profissionalId: profId, horarioId: "" }
    }));
  };

  const handleProfissionalChange = (pacienteId: string, profId: string) => {
    carregarHorariosParaProfissional(pacienteId, profId);
  };

  const handleHorarioChange = (pacienteId: string, horarioId: string) => {
    setSelecoes(prev => ({
      ...prev,
      [pacienteId]: { ...prev[pacienteId], horarioId }
    }));
  };

  const vincular = async (paciente: any) => {
    const selecao = selecoes[paciente.alunoId];
    if (!selecao || !selecao.profissionalId || !selecao.horarioId) {
      alert("Selecione profissional e horário para este paciente");
      return;
    }
    const horarioRef = doc(db, "agendamentos", selecao.horarioId);
    const horarioSnap = await getDoc(horarioRef);
    const horarioData = horarioSnap.data();

    if (horarioData?.recorrenteTipo === "fixo" && horarioData?.groupId) {
      const q = query(collection(db, "agendamentos"), where("groupId", "==", horarioData.groupId));
      const groupSnap = await getDocs(q);
      for (const docHor of groupSnap.docs) {
        await updateDoc(docHor.ref, {
          alunoId: paciente.alunoId,
          status: "ocupado",
        });
      }
      alert("Paciente vinculado a todas as ocorrências do grupo fixo.");
    } else {
      await updateDoc(horarioRef, {
        alunoId: paciente.alunoId,
        status: "ocupado",
      });
      alert("Paciente vinculado ao horário.");
    }

    // Remover da fila
    await updateDoc(doc(db, "filaEspera", paciente.id), { status: "atendido" });

    // Recarregar a fila
    const q = query(collection(db, "filaEspera"), where("tipoId", "==", tipoId), where("status", "==", "aguardando"));
    const snap = await getDocs(q);
    const lista = [];
    for (const docFil of snap.docs) {
      const alunoSnap = await getDoc(doc(db, "alunos", docFil.data().alunoId));
      const alunoData = alunoSnap.data();
      lista.push({
        id: docFil.id,
        alunoId: docFil.data().alunoId,
        nome: alunoData?.nomeCompleto,
        matricula: alunoData?.matricula || "",
      });
    }
    lista.sort((a, b) => {
      const numA = parseInt(a.matricula.split('-')[1] || '0');
      const numB = parseInt(b.matricula.split('-')[1] || '0');
      return numA - numB;
    });
    setFila(lista);
    setSelecoes({});
  };

  return (
    <div>
      <h2>Fila de Espera (Agendados)</h2>
      <select onChange={e => setTipoId(e.target.value)} value={tipoId}>
        <option value="">Selecione o tipo</option>
        {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>

      {tipoId && (
        <div style={{ marginTop: 20 }}>
          {fila.length === 0 && <p>Nenhum paciente aguardando.</p>}
          {fila.map(paciente => {
            const selecao = selecoes[paciente.alunoId] || { profissionalId: "", horarioId: "" };
            const horariosDisponiveis = horarios.filter(h => h.profissionalId === selecao.profissionalId);
            return (
              <div key={paciente.alunoId} style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12, borderRadius: 8 }}>
                <div><strong>{paciente.nome}</strong> (Matrícula: {paciente.matricula})</div>
                <div style={{ marginTop: 8 }}>
                  <select
                    value={selecao.profissionalId}
                    onChange={e => handleProfissionalChange(paciente.alunoId, e.target.value)}
                    style={{ marginRight: 8 }}
                  >
                    <option value="">Selecione profissional</option>
                    {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.codigo})</option>)}
                  </select>
                  <select
                    value={selecao.horarioId}
                    onChange={e => handleHorarioChange(paciente.alunoId, e.target.value)}
                    disabled={!selecao.profissionalId}
                    style={{ marginRight: 8 }}
                  >
                    <option value="">Horário livre</option>
                    {horariosDisponiveis.map(h => <option key={h.id} value={h.id}>{h.data} {h.horario}</option>)}
                  </select>
                  <button onClick={() => vincular(paciente)}>Vincular</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}