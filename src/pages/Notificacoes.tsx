import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc, Timestamp, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

type Notificacao = {
  id: string;
  mensagem: string;
  lida: boolean;
  createdAt: Timestamp;
  tipo?: string;
  alunoId?: string;
};

export default function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      try {
        const snap = await getDocs(collection(db, "notificacoes"));
        let lista = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Notificacao[];

        // Para cada notificação, tentar substituir o ID do paciente pelo nome
        for (let i = 0; i < lista.length; i++) {
          const n = lista[i];
          if (n.alunoId) {
            const alunoSnap = await getDoc(doc(db, "alunos", n.alunoId));
            if (alunoSnap.exists()) {
              const nome = alunoSnap.data().nomeCompleto;
              // Substituir na mensagem qualquer ocorrência do ID pelo nome
              lista[i].mensagem = lista[i].mensagem.replace(n.alunoId, nome);
            }
          }
          // Fallback: se ainda houver um padrão de ID na mensagem (formato com 20 caracteres alfanuméricos), tentar extrair e buscar
          const idMatch = lista[i].mensagem.match(/[A-Za-z0-9]{20}/);
          if (idMatch && !lista[i].alunoId) {
            const possivelId = idMatch[0];
            const alunoSnap = await getDoc(doc(db, "alunos", possivelId));
            if (alunoSnap.exists()) {
              lista[i].mensagem = lista[i].mensagem.replace(possivelId, alunoSnap.data().nomeCompleto);
            }
          }
        }

        lista.sort((a, b) => (b.createdAt?.toDate().getTime() || 0) - (a.createdAt?.toDate().getTime() || 0));
        setNotificacoes(lista);
      } catch (error) {
        console.error("Erro ao carregar notificações:", error);
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  const marcarLida = async (id: string) => {
    await updateDoc(doc(db, "notificacoes", id), { lida: true });
    setNotificacoes(prev => prev.map(n => (n.id === id ? { ...n, lida: true } : n)));
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  if (carregando) return <div style={{ padding: 20 }}>Carregando notificações...</div>;
  if (notificacoes.length === 0) return <div style={{ padding: 20 }}>Nenhuma notificação encontrada.</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>
        Notificações{" "}
        {naoLidas > 0 && (
          <span style={{ background: "red", color: "white", borderRadius: "50%", padding: "2px 8px", fontSize: "0.8rem" }}>
            {naoLidas}
          </span>
        )}
      </h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {notificacoes.map(n => (
          <li key={n.id} style={{ background: n.lida ? "#eee" : "#ffcccc", marginBottom: 8, padding: 12, borderRadius: 4 }}>
            <p>{n.mensagem}</p>
            <small>{n.createdAt?.toDate().toLocaleString() || "Data desconhecida"}</small>
            {!n.lida && <button onClick={() => marcarLida(n.id)} style={{ marginLeft: 12 }}>Marcar como lida</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}