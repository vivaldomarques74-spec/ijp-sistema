import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SaudePacientes() {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    const carregar = async () => {
      const alunosSnap = await getDocs(collection(db, "alunos"));
      const vinculados = alunosSnap.docs.filter(d => d.data().servicosAtivos?.length > 0);
      setPacientes(vinculados.map(d => ({ id: d.id, ...d.data() })));
    };
    carregar();
  }, []);

  return (
    <div>
      <h2>Pacientes em atendimento</h2>
      <input placeholder="Buscar" onChange={e => setFiltro(e.target.value)} />
      <table style={{ width: "100%", marginTop: 20 }}>
        <thead><tr><th>Nome</th><th>Matrícula</th><th>Serviços</th></tr></thead>
        <tbody>
          {pacientes.filter(p => p.nomeCompleto?.toLowerCase().includes(filtro.toLowerCase())).map(p => (
            <tr key={p.id}>
              <td>{p.nomeCompleto}</td>
              <td>{p.matricula}</td>
              <td>{p.servicosAtivos?.map((s: any) => s).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}