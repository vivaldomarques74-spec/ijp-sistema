import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, updateDoc, query, where } from "firebase/firestore";
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
      const snap = await getDocs(collection(db, "agendamentos"));
      const livres = snap.docs.filter(d => d.data().profissionalId === profissionalId && d.data().status === "agendado" && !d.data().alunoId);
      setHorarios(livres.map(d => ({ id: d.id, ...d.data() })));
    };
    carregarHorarios();
  }, [profissionalId]);

  const vincular = async (alunoId: string) => {
    if (!horarioId) return alert("Selecione um horário");
    const agendamentoRef = doc(db, "agendamentos", horarioId);
    await updateDoc(agendamentoRef, { alunoId, status: "ocupado" });
    const filaDoc = fila.find(f => f.alunoId === alunoId);
    if (filaDoc) await updateDoc(doc(db, "filaEspera", filaDoc.id), { status: "atendido" });
    alert("Paciente vinculado");
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
        <table style={{ marginTop: 20 }}>
          <thead><tr><th>Paciente</th><th>Ações</th></tr></thead>
          <tbody>
            {fila.map(f => (
              <tr key={f.id}>
                <td>{f.nome}</td>
                <td>
                  <select onChange={e => setProfissionalId(e.target.value)}>
                    <option value="">Profissional</option>
                    {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                  <select onChange={e => setHorarioId(e.target.value)} disabled={!profissionalId}>
                    <option value="">Horário</option>
                    {horarios.map(h => <option key={h.id} value={h.id}>{h.data} {h.horario}</option>)}
                  </select>
                  <button onClick={() => vincular(f.alunoId)}>Vincular</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}