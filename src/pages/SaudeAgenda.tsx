import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudeAgenda() {
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [horarios, setHorarios] = useState<any[]>([]);
  const [form, setForm] = useState({ profissionalId: "", tipoId: "", data: "", horario: "" });

  useEffect(() => {
    const carregar = async () => {
      const p = await getDocs(collection(db, "profissionais"));
      const t = await getDocs(collection(db, "tiposAtendimento"));
      const h = await getDocs(collection(db, "agendamentos"));
      setProfissionais(p.docs.map(d => ({ id: d.id, ...d.data() })));
      setTipos(t.docs.map(d => ({ id: d.id, ...d.data() })));
      setHorarios(h.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    carregar();
  }, []);

  const adicionarHorario = async () => {
    if (!form.profissionalId || !form.tipoId || !form.data || !form.horario) return alert("Preencha tudo");
    await addDoc(collection(db, "agendamentos"), {
      ...form, status: "agendado", tipoPaciente: "social", createdAt: new Date(),
    });
    alert("Horário criado");
    setForm({ profissionalId: "", tipoId: "", data: "", horario: "" });
    // recarregar lista
    const h = await getDocs(collection(db, "agendamentos"));
    setHorarios(h.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const excluirHorario = async (id: string) => {
    if (confirm("Excluir este horário?")) {
      await deleteDoc(doc(db, "agendamentos", id));
      setHorarios(horarios.filter(h => h.id !== id));
      alert("Horário excluído");
    }
  };

  return (
    <div>
      <h2>Criar horário livre</h2>
      <select value={form.profissionalId} onChange={e => setForm({ ...form, profissionalId: e.target.value })}>
        <option value="">Profissional</option>
        {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.codigo})</option>)}
      </select>
      <select value={form.tipoId} onChange={e => setForm({ ...form, tipoId: e.target.value })}>
        <option value="">Tipo</option>
        {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>
      <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
      <input type="time" value={form.horario} onChange={e => setForm({ ...form, horario: e.target.value })} />
      <button onClick={adicionarHorario}>Adicionar</button>

      <h3>Horários cadastrados</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr><th>Data</th><th>Horário</th><th>Profissional</th><th>Tipo</th><th>Status</th><th>Ações</th></tr>
        </thead>
        <tbody>
          {horarios.map(h => {
            const prof = profissionais.find(p => p.id === h.profissionalId);
            const tipo = tipos.find(t => t.id === h.tipoId);
            return (
              <tr key={h.id}>
                <td>{h.data}</td>
                <td>{h.horario}</td>
                <td>{prof?.nome || h.profissionalId}</td>
                <td>{tipo?.nome || h.tipoId}</td>
                <td>{h.status} {h.alunoId ? `(Paciente: ${h.alunoId})` : ""}</td>
                <td><button onClick={() => excluirHorario(h.id)}>Excluir</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}