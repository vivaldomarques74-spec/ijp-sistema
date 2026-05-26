import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudeProfissionais() {
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [form, setForm] = useState({
    nome: "", email: "", telefone: "", especialidade: "", tipo: "profissional",
    supervisorId: "", modalidade: "presencial", disponibilidade: [] as string[],
  });

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    const snap = await getDocs(collection(db, "profissionais"));
    setProfissionais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const salvar = async () => {
    if (!form.nome) return alert("Informe o nome");
    const prefixo = form.tipo === "estagiario" ? "EST" : (form.tipo === "supervisor" ? "SUP" : "PRO");
    const count = profissionais.length + 1;
    const codigo = `${prefixo}${String(count).padStart(3, "0")}`;
    await addDoc(collection(db, "profissionais"), { ...form, codigo, createdAt: new Date() });
    alert(`Profissional cadastrado. Código: ${codigo}`);
    setForm({ nome: "", email: "", telefone: "", especialidade: "", tipo: "profissional", supervisorId: "", modalidade: "presencial", disponibilidade: [] });
    carregar();
  };

  const excluir = async (id: string, nome: string) => {
    if (window.confirm(`Excluir ${nome}? Isso não removerá agendamentos passados, mas ele não poderá mais ser vinculado.`)) {
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
        <button onClick={salvar}>Cadastrar</button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th>Código</th><th>Nome</th><th>Tipo</th><th>Especialidade</th><th>Modalidade</th><th>Ações</th></tr></thead>
        <tbody>
          {profissionais.map(p => (
            <tr key={p.id}>
              <td>{p.codigo}</td>
              <td>{p.nome}</td>
              <td>{p.tipo}</td>
              <td>{p.especialidade}</td>
              <td>{p.modalidade}</td>
              <td><button onClick={() => excluir(p.id, p.nome)}>Excluir</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}