import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudeConfiguracoes() {
  const [tipos, setTipos] = useState<any[]>([]);
  const [novoTipo, setNovoTipo] = useState({ nome: "", tipoAgendamento: "agendado" });
  const [gerenciandoTipoId, setGerenciandoTipoId] = useState<string | null>(null);
  const [senhas, setSenhas] = useState<any[]>([]);
  const [loteNormal, setLoteNormal] = useState(0);
  const [lotePrioridade, setLotePrioridade] = useState(0);

  useEffect(() => {
    carregarTipos();
  }, []);

  const carregarTipos = async () => {
    const snap = await getDocs(collection(db, "tiposAtendimento"));
    setTipos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const salvarTipo = async () => {
    if (!novoTipo.nome) return;
    const id = novoTipo.nome.toLowerCase().replace(/\s/g, "");
    await addDoc(collection(db, "tiposAtendimento"), { ...novoTipo, id });
    alert("Tipo criado");
    setNovoTipo({ nome: "", tipoAgendamento: "agendado" });
    carregarTipos();
  };

  const excluirTipo = async (id: string, nome: string) => {
    if (window.confirm(`Excluir o tipo "${nome}"? Isso removerá também todas as senhas associadas.`)) {
      await deleteDoc(doc(db, "tiposAtendimento", id));
      alert("Tipo excluído.");
      carregarTipos();
      if (gerenciandoTipoId === id) setGerenciandoTipoId(null);
    }
  };

  const carregarSenhas = async (tipoId: string) => {
    const snap = await getDocs(collection(db, "tiposAtendimento", tipoId, "senhas"));
    setSenhas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setGerenciandoTipoId(tipoId);
  };

  const extrairNumero = (str: string): number => {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const gerarSenhasEmLote = async () => {
    if (loteNormal === 0 && lotePrioridade === 0) return alert("Informe ao menos uma quantidade");
    if (!gerenciandoTipoId) return;

    const snap = await getDocs(collection(db, "tiposAtendimento", gerenciandoTipoId, "senhas"));
    const existentes = snap.docs.map(d => d.data().numero);
    let maxNum = 0;
    for (const num of existentes) {
      const n = extrairNumero(num);
      if (n > maxNum) maxNum = n;
    }

    for (let i = 1; i <= loteNormal; i++) {
      const novoNumero = maxNum + i;
      const senhaNumero = String(novoNumero).padStart(3, "0");
      await addDoc(collection(db, "tiposAtendimento", gerenciandoTipoId, "senhas"), {
        numero: senhaNumero,
        tipo: "normal",
        usado: false,
      });
    }
    maxNum += loteNormal;
    for (let i = 1; i <= lotePrioridade; i++) {
      const novoNumero = maxNum + i;
      const senhaNumero = String(novoNumero).padStart(3, "0");
      await addDoc(collection(db, "tiposAtendimento", gerenciandoTipoId, "senhas"), {
        numero: senhaNumero,
        tipo: "prioridade",
        usado: false,
      });
    }
    alert(`${loteNormal} senhas normais e ${lotePrioridade} prioritárias geradas.`);
    setLoteNormal(0);
    setLotePrioridade(0);
    carregarSenhas(gerenciandoTipoId);
  };

  const excluirSenha = async (senhaId: string) => {
    if (window.confirm("Excluir esta senha permanentemente?")) {
      await deleteDoc(doc(db, "tiposAtendimento", gerenciandoTipoId!, "senhas", senhaId));
      carregarSenhas(gerenciandoTipoId!);
    }
  };

  return (
    <div>
      <h2>Tipos de Atendimento</h2>
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Nome do serviço"
          value={novoTipo.nome}
          onChange={e => setNovoTipo({ ...novoTipo, nome: e.target.value })}
        />
        <select
          value={novoTipo.tipoAgendamento}
          onChange={e => setNovoTipo({ ...novoTipo, tipoAgendamento: e.target.value })}
        >
          <option value="agendado">Agendado (horário fixo)</option>
          <option value="fila">Fila (ordem de chegada)</option>
        </select>
        <button onClick={salvarTipo}>Adicionar</button>
      </div>

      <ul>
        {tipos.map(t => (
          <li key={t.id} style={{ marginBottom: 12 }}>
            <strong>{t.nome}</strong> - {t.tipoAgendamento === "agendado" ? "Agendado" : "Fila"}
            {t.tipoAgendamento === "fila" && (
              <button onClick={() => carregarSenhas(t.id)} style={{ marginLeft: 8 }}>
                Gerenciar senhas
              </button>
            )}
            <button onClick={() => excluirTipo(t.id, t.nome)} style={{ marginLeft: 8, color: "red" }}>
              Excluir
            </button>
          </li>
        ))}
      </ul>

      {gerenciandoTipoId && (
        <div style={{ marginTop: 20, borderTop: "1px solid #ccc", paddingTop: 16 }}>
          <h3>Gerenciar senhas</h3>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div>
              <label>Senhas normais: </label>
              <input
                type="number"
                min="0"
                value={loteNormal}
                onChange={e => setLoteNormal(parseInt(e.target.value) || 0)}
                style={{ width: 80 }}
              />
            </div>
            <div>
              <label>Senhas prioritárias: </label>
              <input
                type="number"
                min="0"
                value={lotePrioridade}
                onChange={e => setLotePrioridade(parseInt(e.target.value) || 0)}
                style={{ width: 80 }}
              />
            </div>
            <button onClick={gerarSenhasEmLote}>Gerar lote</button>
            <button onClick={() => setGerenciandoTipoId(null)}>Fechar</button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Número</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {senhas.map(s => (
                <tr key={s.id}>
                  <td style={{ padding: 8 }}>{s.numero}</td>
                  <td style={{ padding: 8 }}>{s.tipo === "prioridade" ? "Prioritário" : "Normal"}</td>
                  <td style={{ padding: 8 }}>{s.usado ? "Usada" : "Disponível"}</td>
                  <td style={{ padding: 8 }}>
                    {!s.usado && <button onClick={() => excluirSenha(s.id)}>Excluir</button>}
                  </td>
                </tr>
              ))}
              {senhas.length === 0 && (
                <tr>
                  <td colSpan={4}>Nenhuma senha cadastrada. Use o lote acima.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}