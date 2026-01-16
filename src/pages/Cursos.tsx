import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";

export default function Cursos() {
  const [cursos, setCursos] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function carregar() {
      const snap = await getDocs(collection(db, "cursos"));
      setCursos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    carregar();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Cursos</h2>

      <button onClick={() => navigate("/cursos/novo")}>
        + Novo Curso
      </button>

      <ul>
        {cursos.map(c => (
          <li key={c.id}>
            <strong>{c.nome}</strong>{" "}
            <button onClick={() => navigate(`/cursos/${c.id}`)}>
              Ver
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
