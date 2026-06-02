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
      const lista = snap.docs
        .filter(d => d.data().tipoAgendamento === "fila")
        .map(d => ({ id: d.id, ...d.data() }));
      setTipos(lista);
    };
    carregarTipos();
  }, []);

  const carregarFila = async () => {
    if (!tipoId) return;
    const q = query(
      collection(db, "filaEspera"),
      where("tipoId", "==", tipoId),
      where("status", "==", "aguardando")
    );
    const snap = await getDocs(q);
    const priorityList = [];
    const normalList = [];
    for (const docFil of snap.docs) {
      const data = docFil.data();
      const alunoSnap = await getDoc(doc(db, "alunos", data.alunoId));
      const paciente = {
        id: docFil.id,
        alunoId: data.alunoId,
        nome: alunoSnap.data()?.nomeCompleto,
        dataSolicitacao: data.dataSolicitacao.toDate(),
        prioridade: data.prioridade || false,
        senha: data.senhaNumero || "",
      };
      if (paciente.prioridade) priorityList.push(paciente);
      else normalList.push(paciente);
    }
    const sortBySenha = (a: any, b: any) => {
      const numA = parseInt(a.senha.replace(/\D/g, "") || "999999");
      const numB = parseInt(b.senha.replace(/\D/g, "") || "999999");
      return numA - numB;
    };
    priorityList.sort(sortBySenha);
    normalList.sort(sortBySenha);

    const intercalada = [];
    let pIdx = 0, nIdx = 0;
    while (pIdx < priorityList.length || nIdx < normalList.length) {
      if (pIdx < priorityList.length) {
        intercalada.push(priorityList[pIdx++]);
      }
      for (let i = 0; i < 2; i++) {
        if (nIdx < normalList.length) {
          intercalada.push(normalList[nIdx++]);
        }
      }
    }
    setFila(intercalada);

    const atSnap = await getDocs(query(
      collection(db, "filaEspera"),
      where("tipoId", "==", tipoId),
      where("status", "==", "emAtendimento")
    ));
    if (!atSnap.empty) {
      const docAt = atSnap.docs[0];
      const alunoSnap = await getDoc(doc(db, "alunos", docAt.data().alunoId));
      setEmAtendimento({
        id: docAt.id,
        alunoId: docAt.data().alunoId,
        nome: alunoSnap.data()?.nomeCompleto,
      });
    } else {
      setEmAtendimento(null);
    }
  };

  useEffect(() => {
    carregarFila();
  }, [tipoId]);

  const chamarProximo = async () => {
    if (emAtendimento) {
      alert("Já existe um paciente em atendimento. Finalize o atual antes de chamar outro.");
      return;
    }
    if (fila.length === 0) {
      alert("Fila vazia.");
      return;
    }
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
    await updateDoc(doc(db, "filaEspera", emAtendimento.id), {
      status: "aguardando",
      dataSolicitacao: agora,
    });
    carregarFila();
  };

  const cancelarAtendimento = async (itemId: string, nome: string) => {
    if (window.confirm(`Cancelar atendimento de ${nome}?`)) {
      await updateDoc(doc(db, "filaEspera", itemId), { status: "cancelado" });
      carregarFila();
    }
  };

  return (
    <div>
      <h2>Atendimento por Ordem de Chegada</h2>
      <select value={tipoId} onChange={e => setTipoId(e.target.value)}>
        <option value="">Selecione o serviço (fila)</option>
        {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>

      {tipoId && (
        <div style={{ marginTop: 20 }}>
          <div style={{ background: "#f0f0f0", padding: 12, marginBottom: 20 }}>
            <strong>Em atendimento:</strong> {emAtendimento?.nome || "Nenhum"}
          </div>

          <div style={{ marginBottom: 20 }}>
            <button onClick={chamarProximo} style={{ marginRight: 8 }}>Chamar próximo</button>
            <button onClick={atender} style={{ marginRight: 8 }}>Atender (finalizar)</button>
            <button onClick={pausar}>Pausar (volta ao final da fila)</button>
          </div>

          <h3>Fila de espera ({fila.length} aguardando)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Senha</th>
                <th>Tipo</th>
                <th>Nome</th>
                <th>Entrada</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {fila.map(p => (
                <tr key={p.id}>
                  <td style={{ padding: 8 }}>{p.senha || "-"}</td>
                  <td style={{ padding: 8 }}>{p.prioridade ? "Prioritário" : "Normal"}</td>
                  <td style={{ padding: 8 }}>{p.nome}</td>
                  <td style={{ padding: 8 }}>{p.dataSolicitacao.toLocaleString()}</td>
                  <td style={{ padding: 8 }}>
                    <button onClick={() => cancelarAtendimento(p.id, p.nome)}>Cancelar</button>
                  </td>
                </tr>
              ))}
              {fila.length === 0 && (
                <tr>
                  <td colSpan={5}>Fila vazia</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}