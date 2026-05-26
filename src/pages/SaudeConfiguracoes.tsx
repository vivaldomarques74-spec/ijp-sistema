import { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudeConfiguracoes() {
  const [tipos, setTipos] = useState<any[]>([]);
  const [novoTipo, setNovoTipo] = useState({ nome: "", tipoAgendamento: "agendado" });

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    const snap = await getDocs(collection(db, "tiposAtendimento"));
    setTipos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const salvar = async () => {
    if (!novoTipo.nome) return;
    const id = novoTipo.nome.toLowerCase().replace(/\s/g, "");
    await addDoc(collection(db, "tiposAtendimento"), { ...novoTipo, id });
    alert("Tipo criado");
    setNovoTipo({ nome: "", tipoAgendamento: "agendado" });
    carregar();
  };

  return (
    <div>
      <h2>Tipos de Atendimento</h2>
      <input placeholder="Nome" value={novoTipo.nome} onChange={e => setNovoTipo({ ...novoTipo, nome: e.target.value })} />
      <select value={novoTipo.tipoAgendamento} onChange={e => setNovoTipo({ ...novoTipo, tipoAgendamento: e.target.value })}>
        <option value="agendado">Agendado (horário fixo)</option>
        <option value="fila">Fila (ordem de chegada)</option>
      </select>
      <button onClick={salvar}>Adicionar</button>
      <ul>
        {tipos.map(t => <li key={t.id}>{t.nome} - {t.tipoAgendamento}</li>)}
      </ul>
    </div>
  );
}