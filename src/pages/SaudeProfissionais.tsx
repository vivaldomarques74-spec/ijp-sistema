// src/pages/SaudeProfissionais.tsx - versão completa
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudeProfissionais() {
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "", email: "", telefone: "", especialidade: "", tipo: "profissional",
    supervisorId: "", modalidade: "presencial",
  });

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    const snap = await getDocs(collection(db, "profissionais"));
    setProfissionais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const salvar = async () => {
    if (!form.nome) return alert("Informe o nome");
    if (editandoId) {
      await updateDoc(doc(db, "profissionais", editandoId), form);
      alert("Profissional atualizado");
      setEditandoId(null);
    } else {
      const prefixo = form.tipo === "estagiario" ? "EST" : (form.tipo === "supervisor" ? "SUP" : "PRO");
      const count = profissionais.length + 1;
      const codigo = `${prefixo}${String(count).padStart(3, "0")}`;
      await addDoc(collection(db, "profissionais"), { ...form, codigo, createdAt: new Date() });
      alert(`Profissional cadastrado. Código: ${codigo}`);
    }
    setForm({ nome: "", email: "", telefone: "", especialidade: "", tipo: "profissional", supervisorId: "", modalidade: "presencial" });
    carregar();
  };

  const editar = (p: any) => {
    setEditandoId(p.id);
    setForm({
      nome: p.nome, email: p.email || "", telefone: p.telefone || "", especialidade: p.especialidade || "",
      tipo: p.tipo, supervisorId: p.supervisorId || "", modalidade: p.modalidade || "presencial",
    });
  };

  const excluir = async (id: string, nome: string) => {
    if (window.confirm(`Excluir profissional ${nome}?`)) {
      await deleteDoc(doc(db, "profissionais", id));
      carregar();
    }
  };

  return (
    <div>
      <h2>Profissionais</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <input placeholder="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Telefone" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
        <input placeholder="Especialidade" value={form.especialidade} onChange={e => setForm({ ...form, especialidade: e.target.value })} />
        <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
          <option value="profissional">Profissional</option>
          <option value="estagiario">Estagiário</option>
          <option value="supervisor">Supervisor</option>
        </select>
        {form.tipo === "estagiario" && (
          <select value={form.supervisorId} onChange={e => setForm({ ...form, supervisorId: e.target.value })}>
            <option value="">Supervisor</option>
            {profissionais.filter(p => p.tipo === "supervisor").map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        )}
        <select value={form.modalidade} onChange={e => setForm({ ...form, modalidade: e.target.value })}>
          <option value="presencial">Presencial</option>
          <option value="online">Online</option>
          <option value="ambos">Ambos</option>
        </select>
        <button onClick={salvar}>{editandoId ? "Atualizar" : "Cadastrar"}</button>
        {editandoId && <button onClick={() => { setEditandoId(null); setForm({ nome: "", email: "", telefone: "", especialidade: "", tipo: "profissional", supervisorId: "", modalidade: "presencial" }); }}>Cancelar</button>}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th>Código</th><th>Nome</th><th>Especialidade</th><th>Tipo</th><th>Modalidade</th><th>Ações</th></tr></thead>
        <tbody>
          {profissionais.map(p => (
            <tr key={p.id}>
              <td>{p.codigo}</td>
              <td>{p.nome}</td>
              <td>{p.especialidade || "-"}</td>
              <td>{p.tipo}</td>
              <td>{p.modalidade}</td>
              <td>
                <button onClick={() => editar(p)}>Editar</button>
                <button onClick={() => excluir(p.id, p.nome)} style={{ marginLeft: 8, background: "#dc3545" }}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}