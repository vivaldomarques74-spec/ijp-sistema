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
    <div>
      <h1>Cursos</h1>

      <button onClick={() => navigate("/cursos/novo")}>
        ➕ Novo Curso
      </button>

      {cursos.length === 0 && <p>Nenhum curso cadastrado.</p>}

      <ul>
        {cursos.map(c => (
          <li key={c.id} style={{ marginTop: 8 }}>
            <strong>{c.nome}</strong>{" "}
            <button onClick={() => navigate(`/cursos/${c.id}`)}>
              Ver detalhes
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
