import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "../services/firebase";

type Notificacao = {
  id: string;
  mensagem: string;
  lida: boolean;
  createdAt: Timestamp;
  tipo?: string;
};

export default function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      try {
        const snap = await getDocs(collection(db, "notificacoes"));
        const lista = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Notificacao[];
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

  if (notificacoes.length === 0) {
    return <div style={{ padding: 20 }}>Nenhuma notificação encontrada.</div>;
  }

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