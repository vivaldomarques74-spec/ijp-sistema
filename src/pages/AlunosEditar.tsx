import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "../services/firebase";

export default function EditarAluno() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [aluno, setAluno] = useState<any>(null);
  const [foto, setFoto] = useState<File | null>(null);

  // 🔹 carrega aluno
  useEffect(() => {
    async function carregarAluno() {
      if (!id) return;

      const refAluno = doc(db, "alunos", id);
      const snap = await getDoc(refAluno);

      if (snap.exists()) {
        setAluno({ id: snap.id, ...snap.data() });
      }

      setLoading(false);
    }

    carregarAluno();
  }, [id]);

  // 🔹 salvar dados (SEM FOTO)
  async function salvarDados() {
    if (!id) return;

    setSalvando(true);

    try {
      await updateDoc(doc(db, "alunos", id), {
        nome: aluno.nome,
        telefone: aluno.telefone,
        email: aluno.email,
        endereco: aluno.endereco,
        base: aluno.base,
        sensei: aluno.sensei,
        observacoesMedicas: aluno.observacoesMedicas || "",
      });

      alert("Dados atualizados com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar dados");
    }

    setSalvando(false);
  }

  // 🔹 upload da foto (ISOLADO)
  async function salvarFoto() {
    if (!id || !foto) {
      alert("Selecione uma foto");
      return;
    }

    setSalvando(true);

    try {
      const fotoRef = ref(storage, `alunos/${id}/foto.jpg`);
      await uploadBytes(fotoRef, foto);

      const downloadURL = await getDownloadURL(fotoRef);

      await updateDoc(doc(db, "alunos", id), {
        fotoURL: downloadURL,
      });

      setAluno((prev: any) => ({
        ...prev,
        fotoURL: downloadURL,
      }));

      alert("Foto atualizada com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar foto");
    }

    setSalvando(false);
  }

  if (loading) return <p>Carregando aluno...</p>;
  if (!aluno) return <p>Aluno não encontrado</p>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2>Editar Aluno</h2>

      {/* FOTO */}
      <div style={{ marginBottom: 20 }}>
        <img
          src={aluno.fotoURL || "/avatar-placeholder.png"}
          alt="Foto do aluno"
          style={{
            width: 120,
            height: 120,
            objectFit: "cover",
            borderRadius: "50%",
            display: "block",
            marginBottom: 10,
          }}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              setFoto(e.target.files[0]);
            }
          }}
        />

        <button onClick={salvarFoto} disabled={salvando}>
          Atualizar Foto
        </button>
      </div>

      {/* DADOS */}
      <input
        placeholder="Nome"
        value={aluno.nome || ""}
        onChange={(e) =>
          setAluno({ ...aluno, nome: e.target.value })
        }
      />

      <input
        placeholder="Telefone"
        value={aluno.telefone || ""}
        onChange={(e) =>
          setAluno({ ...aluno, telefone: e.target.value })
        }
      />

      <input
        placeholder="Email"
        value={aluno.email || ""}
        onChange={(e) =>
          setAluno({ ...aluno, email: e.target.value })
        }
      />

      <input
        placeholder="Endereço"
        value={aluno.endereco || ""}
        onChange={(e) =>
          setAluno({ ...aluno, endereco: e.target.value })
        }
      />

      <input
        placeholder="Base"
        value={aluno.base || ""}
        onChange={(e) =>
          setAluno({ ...aluno, base: e.target.value })
        }
      />

      <input
        placeholder="Sensei"
        value={aluno.sensei || ""}
        onChange={(e) =>
          setAluno({ ...aluno, sensei: e.target.value })
        }
      />

      <textarea
        placeholder="Observações Médicas"
        value={aluno.observacoesMedicas || ""}
        onChange={(e) =>
          setAluno({
            ...aluno,
            observacoesMedicas: e.target.value,
          })
        }
      />

      <button onClick={salvarDados} disabled={salvando}>
        Salvar Dados
      </button>

      <button
        style={{ marginLeft: 10 }}
        onClick={() => navigate("/alunos")}
      >
        Voltar
      </button>
    </div>
  );
}
