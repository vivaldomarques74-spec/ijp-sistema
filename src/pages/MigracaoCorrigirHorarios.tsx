import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function MigracaoCorrigirHorarios() {
  const [status, setStatus] = useState("Aguardando...");
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function corrigir() {
      setStatus("Buscando horários...");
      const snap = await getDocs(collection(db, "agendamentos"));
      let corrigidos = 0;
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (data.recorrenteTipo === "livre" && data.groupId) {
          await updateDoc(docSnap.ref, { groupId: null });
          corrigidos++;
        }
      }
      setStatus(`Correção concluída! ${corrigidos} horários corrigidos.`);
      setCount(corrigidos);
    }
    corrigir();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Corrigir horários "livres" que estavam com groupId</h1>
      <p>Status: {status}</p>
      <p>Horários corrigidos: {count}</p>
    </div>
  );
}