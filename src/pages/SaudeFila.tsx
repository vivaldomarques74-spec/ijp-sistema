import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, where, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudeFila() {
  const [tipos, setTipos] = useState<any[]>([]);
  const [tipoId, setTipoId] = useState("");
  const [fila, setFila] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [profissionalId, setProfissionalId] = useState("");
  const [horarios, setHorarios] = useState<any[]>([]);
  const [horarioId, setHorarioId] = useState("");

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
        lista.push({ id: docFil.id, alunoId: docFil.data().alunoId, nome: alunoSnap.data()?.nomeCompleto });
      }
      setFila(lista);
    };
    carregarFila();
  }, [tipoId]);

  useEffect(() => {
    if (!profissionalId) return;
    const carregarHorarios = async () => {
      // Buscar horários "livre" ou "aguardandoVinculo" (sem paciente)
      const snap = await getDocs(collection(db, "agendamentos"));
      const livres = snap.docs.filter(d => 
        d.data().profissionalId === profissionalId && 
        (d.data().status === "livre" || d.data().status === "aguardandoVinculo") && 
        !d.data().alunoId && 
        !d.data().pacienteInfo
      );
      setHorarios(livres.map(d => ({ id: d.id, ...d.data() })));
    };
    carregarHorarios();
  }, [profissionalId]);

  const vincular = async (alunoId: string) => {
    if (!horarioId) return alert("Selecione um horário");
    const horarioRef = doc(db, "agendamentos", horarioId);
    const horarioSnap = await getDoc(horarioRef);
    const horarioData = horarioSnap.data();

    if (horarioData?.recorrenteTipo === "fixo" && horarioData?.groupId) {
      const q = query(collection(db, "agendamentos"), where("groupId", "==", horarioData.groupId));
      const groupSnap = await getDocs(q);
      for (const docHor of groupSnap.docs) {
        await updateDoc(docHor.ref, {
          alunoId: alunoId,
          status: "ocupado",
        });
      }
      alert("Paciente vinculado a todas as ocorrências do grupo fixo.");
    } else {
      await updateDoc(horarioRef, {
        alunoId: alunoId,
        status: "ocupado",
      });
      alert("Paciente vinculado ao horário.");
    }

    const filaDoc = fila.find(f => f.alunoId === alunoId);
    if (filaDoc) await updateDoc(doc(db, "filaEspera", filaDoc.id), { status: "atendido" });

    window.location.reload();
  };

  return (
    <div>
      <h2>Fila de Espera</h2>
      <select onChange={e => setTipoId(e.target.value)}>
        <option value="">Selecione o tipo</option>
        {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>
      {tipoId && (
        <div style={{ marginTop: 20 }}>
          <p>Pacientes aguardando:</p>
          <ul>
            {fila.map(f => <li key={f.id}>{f.nome}</li>)}
          </ul>
          <hr />
          <select onChange={e => setProfissionalId(e.target.value)}>
            <option value="">Selecione o profissional</option>
            {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <select onChange={e => setHorarioId(e.target.value)} disabled={!profissionalId}>
            <option value="">Horário livre</option>
            {horarios.map(h => <option key={h.id} value={h.id}>{h.data} {h.horario} {h.recorrenteTipo === "fixo" ? "(fixo)" : ""}</option>)}
          </select>
          <button onClick={() => {
            if (fila.length === 0) return alert("Nenhum paciente na fila");
            const pacienteId = prompt(`Digite o ID do paciente da lista: ${fila.map(f => `${f.nome} (${f.alunoId})`).join(", ")}`);
            if (!pacienteId) return;
            vincular(pacienteId);
          }}>Vincular</button>
        </div>
      )}
    </div>
  );
}