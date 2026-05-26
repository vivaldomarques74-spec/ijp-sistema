import { useEffect, useState } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudeAgenda() {
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [form, setForm] = useState({ profissionalId: "", tipoId: "", data: "", horario: "" });

  useEffect(() => {
    const carregar = async () => {
      const p = await getDocs(collection(db, "profissionais"));
      const t = await getDocs(collection(db, "tiposAtendimento"));
      setProfissionais(p.docs.map(d => ({ id: d.id, ...d.data() })));
      setTipos(t.docs.map(d => ({ id: d.id, ...d.data() })));
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
    </div>
  );
}