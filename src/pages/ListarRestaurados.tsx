import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { Link } from "react-router-dom";

interface AlunoInfo {
  id: string;
  nome: string;
  turmas: string[];
}

export default function ListarRestaurados() {
  const [carregando, setCarregando] = useState(true);
  const [alunos, setAlunos] = useState<AlunoInfo[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      // IDs dos alunos restaurados (extraídos do seu console)
      const idsRestaurados = [
        'rRZAfCLIzZg3s5Ivyeon',
        'rboCNUOGEAwAdurY1Dn3',
        'hmvPUgpfdqYEqX9ASaTJ',
        'qq4bSyLsquQwOeDBAIgF',
        'es37elJnrnGVNI57f7hT',
        'qKKJmf01bnkZZzopYIww',
        'BaLzZzGHPRmqurZLBGck',
        '2wweM8mCb5sD81yKBmqF',
        'SEdQX25ADLyUiMxueCBk'
      ];

      // Buscar todos os cursos e turmas
      const cursosSnap = await getDocs(collection(db, 'cursos'));
      const turmasPorAluno: Record<string, string[]> = {};

      for (const cursoDoc of cursosSnap.docs) {
        const cursoId = cursoDoc.id;
        const cursoNome = cursoDoc.data().nome || cursoId;
        const turmasSnap = await getDocs(collection(db, 'cursos', cursoId, 'turmas'));

        for (const turmaDoc of turmasSnap.docs) {
          const turmaData = turmaDoc.data();
          const alunos = turmaData.alunos || [];
          const turmaNome = turmaData.nome || turmaDoc.id;
          
          for (const id of idsRestaurados) {
            if (alunos.includes(id)) {
              if (!turmasPorAluno[id]) turmasPorAluno[id] = [];
              turmasPorAluno[id].push(`${cursoNome} - ${turmaNome}`);
            }
          }
        }
      }

      // Buscar os nomes atuais dos alunos
      const lista: AlunoInfo[] = [];
      for (const id of idsRestaurados) {
        const docSnap = await getDoc(doc(db, 'alunos', id));
        const nome = docSnap.exists() ? docSnap.data().nomeCompleto : 'Não encontrado';
        lista.push({
          id,
          nome,
          turmas: turmasPorAluno[id] || ['Nenhuma turma encontrada']
        });
      }

      setAlunos(lista);
      setTotal(lista.length);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados. Veja o console.');
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) return <div style={{ padding: 20 }}>Carregando...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ color: '#1a2a4f' }}>Alunos Restaurados</h1>
      <p style={{ color: '#6b7a8f' }}>
        Estes são os {total} alunos que foram recriados com nomes genéricos.
        Eles estão vinculados às turmas listadas.
      </p>
      
      <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
        <button 
          onClick={carregarDados}
          style={{ padding: '8px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          Atualizar
        </button>
        <Link to="/admin/unificar">
          <button style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Voltar para Admin
          </button>
        </Link>
      </div>

      <div style={{ marginTop: 20, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: 12, textAlign: 'left' }}>ID</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Nome Atual</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Turmas</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {alunos.map(aluno => (
              <tr key={aluno.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>{aluno.id}</td>
                <td style={{ padding: 12 }}>{aluno.nome}</td>
                <td style={{ padding: 12 }}>
                  {aluno.turmas.map((turma, idx) => (
                    <div key={idx}>• {turma}</div>
                  ))}
                </td>
                <td style={{ padding: 12 }}>
                  <Link to={`/alunos/editar/${aluno.id}`}>
                    <button style={{ padding: '4px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                      Editar
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20, padding: 16, background: '#fff3cd', borderRadius: 8, border: '1px solid #ffeeba' }}>
        <h4 style={{ margin: '0 0 8px' }}>💡 Como identificar esses alunos</h4>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Clique em <strong>"Editar"</strong> para ver/editar os dados de cada um.</li>
          <li>Verifique quais alunos estão faltando nas turmas listadas.</li>
          <li>Se você souber o nome correto, edite o campo "Nome completo".</li>
          <li>Se não souber, converse com os professores das turmas indicadas.</li>
        </ul>
      </div>
    </div>
  );
}