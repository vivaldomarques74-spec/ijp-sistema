import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function ProfissionalAgenda() {
  const [agenda, setAgenda] = useState<any[]>([]);
  const profissionalId = localStorage.getItem("profissionalId");

  useEffect(() => {
    const carregar = async () => {
      const snap = await getDocs(collection(db, "agendamentos"));
      const meus = snap.docs.filter(d => d.data().profissionalId === profissionalId);
      setAgenda(meus.map(d => ({ id: d.id, ...d.data() })));
    };
    carregar();
  }, [profissionalId]);

  const registrarPresenca = async (id: string, presente: boolean) => {
    await updateDoc(doc(db, "agendamentos", id), { status: presente ? "realizado" : "falta" });
    alert("Registrado");
    window.location.reload();
  };

  return (
    <div>
      <h2>Minha Agenda</h2>
      <table>
        <thead><tr><th>Data</th><th>Horário</th><th>Paciente</th><th>Ações</th></tr></thead>
        <tbody>
          {agenda.map(a => (
            <tr key={a.id}>
              <td>{a.data}</td>
              <td>{a.horario}</td>
              <td>{a.alunoId ? a.alunoId : "Livre"}</td>
              <td>
                {a.alunoId && a.status !== "realizado" && a.status !== "falta" && (
                  <>
                    <button onClick={() => registrarPresenca(a.id, true)}>Atendeu</button>
                    <button onClick={() => registrarPresenca(a.id, false)}>Faltou</button>
                    <button onClick={() => window.location.href = `/profissional/${localStorage.getItem("profissionalCodigo")}/paciente/${a.alunoId}`}>
                      Ficha
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}