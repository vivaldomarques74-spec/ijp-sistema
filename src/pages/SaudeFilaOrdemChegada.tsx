import { useState, useEffect } from "react";
import { collection, getDocs, query, where, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudeFilaOrdemChegada() {
  const [tipos, setTipos] = useState<any[]>([]);
  const [tipoId, setTipoId] = useState("");
  const [fila, setFila] = useState<any[]>([]);
  const [emAtendimento, setEmAtendimento] = useState<any | null>(null);

  useEffect(() => {
    const carregarTipos = async () => {
      const snap = await getDocs(collection(db, "tiposAtendimento"));
      const lista = snap.docs.filter(d => d.data().tipoAgendamento === "fila").map(d => ({ id: d.id, ...d.data() }));
      setTipos(lista);
    };
    carregarTipos();
  }, []);

  const carregarFila = async () => {
    if (!tipoId) return;
    const q = query(collection(db, "filaEspera"), where("tipoId", "==", tipoId), where("status", "==", "aguardando"));
    const snap = await getDocs(q);
    let lista = [];
    for (const docFil of snap.docs) {
      const data = docFil.data();
      const alunoSnap = await getDoc(doc(db, "alunos", data.alunoId));
      lista.push({
        id: docFil.id,
        alunoId: data.alunoId,
        nome: alunoSnap.data()?.nomeCompleto,
        dataSolicitacao: data.dataSolicitacao.toDate(),
        prioridade: data.prioridade || false,
        senha: data.senhaNumero || "",
      });
    }
    // ordenar: prioridade primeiro, depois número da senha
    lista.sort((a, b) => {
      if (a.prioridade !== b.prioridade) return a.prioridade ? -1 : 1;
      const numA = parseInt(a.senha.replace(/\D/g, "") || "999999");
      const numB = parseInt(b.senha.replace(/\D/g, "") || "999999");
      return numA - numB;
    });
    setFila(lista);

    const atSnap = await getDocs(query(collection(db, "filaEspera"), where("tipoId", "==", tipoId), where("status", "==", "emAtendimento")));
    if (!atSnap.empty) {
      const docAt = atSnap.docs[0];
      const alunoSnap = await getDoc(doc(db, "alunos", docAt.data().alunoId));
      setEmAtendimento({ id: docAt.id, alunoId: docAt.data().alunoId, nome: alunoSnap.data()?.nomeCompleto });
    } else {
      setEmAtendimento(null);
    }
  };

  useEffect(() => { carregarFila(); }, [tipoId]);

  const chamarProximo = async () => {
    if (emAtendimento) return alert("Já existe paciente em atendimento.");
    if (fila.length === 0) return alert("Fila vazia.");
    const proximo = fila[0];
    await updateDoc(doc(db, "filaEspera", proximo.id), { status: "emAtendimento" });
    carregarFila();
  };

  const atender = async () => {
    if (!emAtendimento) return alert("Nenhum paciente em atendimento.");
    await updateDoc(doc(db, "filaEspera", emAtendimento.id), { status: "atendido" });
    carregarFila();
  };

  const pausar = async () => {
    if (!emAtendimento) return alert("Nenhum paciente em atendimento.");
    const agora = new Date();
    await updateDoc(doc(db, "filaEspera", emAtendimento.id), { status: "aguardando", dataSolicitacao: agora });
    carregarFila();
  };

  const cancelar = async (itemId: string, nome: string) => {
    if (window.confirm(`Cancelar atendimento de ${nome}?`)) {
      await updateDoc(doc(db, "filaEspera", itemId), { status: "cancelado" });
      carregarFila();
    }
  };

  const buttonStyle = { padding: "4px 12px", border: "none", borderRadius: 4, cursor: "pointer", marginRight: 4 };

  return (
    <div>
      <h3 style={{ fontSize: 16, margin: "0 0 12px", color: "#1a2a4f" }}>Atendimento por Ordem de Chegada</h3>
      <select onChange={e => setTipoId(e.target.value)} value={tipoId} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8, marginBottom: 16 }}>
        <option value="">Selecione o serviço (fila)</option>
        {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>
      {tipoId && (
        <>
          <div style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 16 }}>
            <strong>Em atendimento:</strong> {emAtendimento?.nome || "Nenhum"}
          </div>
          <div style={{ marginBottom: 16 }}>
            <button onClick={chamarProximo} style={{ ...buttonStyle, background: "#0070f3", color: "#fff" }}>Chamar próximo</button>
            <button onClick={atender} style={{ ...buttonStyle, background: "#28a745", color: "#fff" }}>Atender (finalizar)</button>
            <button onClick={pausar} style={{ ...buttonStyle, background: "#ffc107", color: "#000" }}>Pausar</button>
          </div>
          <h4 style={{ margin: "0 0 8px" }}>Fila ({fila.length} aguardando)</h4>
          {fila.map(p => (
            <div key={p.id} style={{ background: "#fff", borderRadius: 12, padding: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 600, minWidth: 60 }}>Senha: {p.senha || "-"}</span>
              <span style={{ minWidth: 80 }}>{p.prioridade ? "Prioritário" : "Normal"}</span>
              <span style={{ flex: 1 }}>{p.nome}</span>
              <span style={{ fontSize: 13, color: "#6b7a8f" }}>{p.dataSolicitacao.toLocaleString()}</span>
              <button onClick={() => cancelar(p.id, p.nome)} style={{ ...buttonStyle, background: "#dc3545", color: "#fff" }}>Cancelar</button>
            </div>
          ))}
          {fila.length === 0 && <p>Fila vazia.</p>}
        </>
      )}
    </div>
  );
}