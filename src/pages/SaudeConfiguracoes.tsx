import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";

type Senha = {
  id: string;
  numero: string;
  tipo: string;
  usado: boolean;
};

export default function SaudeConfiguracoes() {
  const [tipos, setTipos] = useState<any[]>([]);
  const [novoTipo, setNovoTipo] = useState({ nome: "", tipoAgendamento: "agendado" });
  const [gerenciandoTipoId, setGerenciandoTipoId] = useState<string | null>(null);
  const [senhas, setSenhas] = useState<Senha[]>([]);
  const [loteNormal, setLoteNormal] = useState(0);
  const [lotePrioridade, setLotePrioridade] = useState(0);
  const [inicioLote, setInicioLote] = useState("");
  const [apagarExistentes, setApagarExistentes] = useState(false);

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
    try {
      await addDoc(collection(db, "tiposAtendimento"), { ...novoTipo, id });
      alert("Tipo criado");
      setNovoTipo({ nome: "", tipoAgendamento: "agendado" });
      carregarTipos();
    } catch (error) {
      console.error("Erro ao criar tipo:", error);
      alert("Erro ao criar tipo. Verifique as regras de segurança.");
    }
  };

  const excluirTipo = async (id: string, nome: string) => {
    if (!window.confirm(`Excluir o tipo "${nome}"? Isso removerá também todas as senhas associadas.`)) return;
    try {
      // Excluir todas as senhas da subcoleção
      const senhasSnap = await getDocs(collection(db, "tiposAtendimento", id, "senhas"));
      for (const senhaDoc of senhasSnap.docs) {
        await deleteDoc(senhaDoc.ref);
      }
      // Excluir o tipo
      await deleteDoc(doc(db, "tiposAtendimento", id));
      alert("Tipo excluído com sucesso.");
      carregarTipos();
      if (gerenciandoTipoId === id) setGerenciandoTipoId(null);
    } catch (error) {
      console.error("Erro ao excluir tipo:", error);
      alert("Erro ao excluir tipo. Verifique as regras de segurança.");
    }
  };

  const carregarSenhas = async (tipoId: string) => {
    const snap = await getDocs(collection(db, "tiposAtendimento", tipoId, "senhas"));
    let lista: Senha[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Senha));
    lista.sort((a, b) => {
      const numA = parseInt(a.numero.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.numero.replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });
    setSenhas(lista);
    setGerenciandoTipoId(tipoId);
  };

  const extrairNumero = (str: string): number => {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const gerarSenhasEmLote = async () => {
    if (loteNormal === 0 && lotePrioridade === 0) return alert("Informe ao menos uma quantidade");
    if (!gerenciandoTipoId) return;

    // Se apagarExistentes for true, deleta todas as senhas atuais
    if (apagarExistentes) {
      const snap = await getDocs(collection(db, "tiposAtendimento", gerenciandoTipoId, "senhas"));
      for (const docSenha of snap.docs) {
        await deleteDoc(docSenha.ref);
      }
    }

    // Determinar o número inicial
    let startNum = 0;
    if (inicioLote && !isNaN(parseInt(inicioLote))) {
      startNum = parseInt(inicioLote, 10);
    } else if (!apagarExistentes) {
      // Se não apagou e não informou início, calcular o maior número existente + 1
      const snap = await getDocs(collection(db, "tiposAtendimento", gerenciandoTipoId, "senhas"));
      let maxNum = 0;
      for (const docSenha of snap.docs) {
        const num = extrairNumero(docSenha.data().numero);
        if (num > maxNum) maxNum = num;
      }
      startNum = maxNum + 1;
    } else {
      // Se apagou e não informou início, começar de 1
      startNum = 1;
    }

    let currentNum = startNum;
    // Gerar prioritárias
    for (let i = 0; i < lotePrioridade; i++) {
      const senhaNumero = String(currentNum + i).padStart(3, "0");
      await addDoc(collection(db, "tiposAtendimento", gerenciandoTipoId, "senhas"), {
        numero: senhaNumero,
        tipo: "prioridade",
        usado: false,
      });
    }
    currentNum += lotePrioridade;
    // Gerar normais
    for (let i = 0; i < loteNormal; i++) {
      const senhaNumero = String(currentNum + i).padStart(3, "0");
      await addDoc(collection(db, "tiposAtendimento", gerenciandoTipoId, "senhas"), {
        numero: senhaNumero,
        tipo: "normal",
        usado: false,
      });
    }

    alert(`${lotePrioridade} senhas prioritárias e ${loteNormal} normais geradas a partir de ${startNum}.`);
    setLoteNormal(0);
    setLotePrioridade(0);
    setInicioLote("");
    setApagarExistentes(false);
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
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <label>Prioritárias: </label>
              <input
                type="number"
                min="0"
                value={lotePrioridade}
                onChange={e => setLotePrioridade(parseInt(e.target.value) || 0)}
                style={{ width: 80 }}
              />
            </div>
            <div>
              <label>Normais: </label>
              <input
                type="number"
                min="0"
                value={loteNormal}
                onChange={e => setLoteNormal(parseInt(e.target.value) || 0)}
                style={{ width: 80 }}
              />
            </div>
            <div>
              <label>Iniciar em (opcional): </label>
              <input
                type="number"
                min="1"
                value={inicioLote}
                onChange={e => setInicioLote(e.target.value)}
                style={{ width: 100 }}
                placeholder="ex: 1"
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={apagarExistentes}
                onChange={e => setApagarExistentes(e.target.checked)}
              />
              Apagar senhas existentes antes de gerar
            </label>
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
                  <td colSpan={4}>Nenhuma senha cadastrada. Use o lote acima.ERC20</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}