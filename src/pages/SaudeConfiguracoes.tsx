import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudeConfiguracoes() {
  const [tipos, setTipos] = useState<any[]>([]);
  const [novoTipo, setNovoTipo] = useState({ nome: "", tipoAgendamento: "agendado" });
  const [gerenciandoTipoId, setGerenciandoTipoId] = useState<string | null>(null);
  const [senhas, setSenhas] = useState<any[]>([]);
  const [novaSenha, setNovaSenha] = useState({ numero: "", tipo: "normal" });

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

  const carregarSenhas = async (tipoId: string) => {
    const snap = await getDocs(collection(db, "tiposAtendimento", tipoId, "senhas"));
    setSenhas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setGerenciandoTipoId(tipoId);
  };

  const adicionarSenha = async () => {
    if (!novaSenha.numero) return alert("Informe o número da senha");
    await addDoc(collection(db, "tiposAtendimento", gerenciandoTipoId!, "senhas"), {
      numero: novaSenha.numero,
      tipo: novaSenha.tipo,
      usado: false,
    });
    setNovaSenha({ numero: "", tipo: "normal" });
    carregarSenhas(gerenciandoTipoId!);
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
          </li>
        ))}
      </ul>

      {gerenciandoTipoId && (
        <div style={{ marginTop: 20, borderTop: "1px solid #ccc", paddingTop: 16 }}>
          <h3>Senhas disponíveis</h3>
          <div>
            <input
              placeholder="Número da senha (ex: 001, P01, 23)"
              value={novaSenha.numero}
              onChange={e => setNovaSenha({ ...novaSenha, numero: e.target.value })}
            />
            <select
              value={novaSenha.tipo}
              onChange={e => setNovaSenha({ ...novaSenha, tipo: e.target.value })}
            >
              <option value="normal">Normal</option>
              <option value="prioridade">Prioridade</option>
            </select>
            <button onClick={adicionarSenha}>Adicionar senha</button>
            <button onClick={() => setGerenciandoTipoId(null)} style={{ marginLeft: 8 }}>
              Fechar
            </button>
          </div>

          <table style={{ marginTop: 12, width: "100%", borderCollapse: "collapse" }}>
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
                  <td>{s.numero}</td>
                  <td>{s.tipo === "prioridade" ? "Prioritário" : "Normal"}</td>
                  <td>{s.usado ? "Usada" : "Disponível"}</td>
                  <td>
                    {!s.usado && <button onClick={() => excluirSenha(s.id)}>Excluir</button>}
                  </td>
                </tr>
              ))}
              {senhas.length === 0 && (
                <tr>
                  <td colSpan={4}>Nenhuma senha cadastrada para este serviço. Adicione acima.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}