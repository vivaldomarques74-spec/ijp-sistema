import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

export default function Atestados() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);

  const [buscaAluno, setBuscaAluno] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);

  const [form, setForm] = useState({
    dia: new Date().toISOString().split("T")[0],
    chegada: "",
    saida: "",
    tipo: "saude" as "saude" | "curso",
    servicoId: "",
    cursoId: "",
    turmaId: "",
    profissionalId: "",
    assinanteNome: "",
    assinanteFuncao: "",
  });

  useEffect(() => {
    const carregar = async () => {
      const a = await getDocs(collection(db, "alunos"));
      setAlunos(a.docs.map(d => ({ id: d.id, ...d.data() })));
      const c = await getDocs(collection(db, "cursos"));
      setCursos(c.docs.map(d => ({ id: d.id, nome: d.data().nome })));
      const s = await getDocs(collection(db, "tiposAtendimento"));
      setServicos(s.docs.map(d => ({ id: d.id, nome: d.data().nome })));
      const p = await getDocs(collection(db, "profissionais"));
      setProfissionais(p.docs.map(d => ({ id: d.id, nome: d.data().nome, especialidade: d.data().especialidade })));
    };
    carregar();
  }, []);

  useEffect(() => {
    if (!form.cursoId) { setTurmas([]); return; }
    const carregarTurmas = async () => {
      const snap = await getDocs(collection(db, "cursos", form.cursoId, "turmas"));
      setTurmas(snap.docs.map(d => ({ id: d.id, nome: d.data().nome })));
    };
    carregarTurmas();
  }, [form.cursoId]);

  const handleChange = (campo: string, valor: any) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
  };

  const alunosFiltrados = alunos
    .filter(a => {
      if (!buscaAluno.trim()) return false;
      const b = buscaAluno.toLowerCase();
      return (a.nomeCompleto || "").toLowerCase().includes(b) || (a.matricula || "").toLowerCase().includes(b);
    })
    .slice(0, 8);

  const gerarAtestado = () => {
    if (!alunoSelecionado) return alert("Selecione o aluno");
    if (!form.chegada || !form.saida) return alert("Preencha os horários");
    if (!form.assinanteNome || !form.assinanteFuncao) return alert("Preencha o assinante");

    const servico = servicos.find(s => s.id === form.servicoId);
    const curso = cursos.find(c => c.id === form.cursoId);
    const turma = turmas.find(t => t.id === form.turmaId);
    const profissional = profissionais.find(p => p.id === form.profissionalId);

    const descricaoServico = form.tipo === "saude"
      ? `Serviço de ${servico?.nome || ""}${profissional ? ` com ${profissional.nome}` : ""}`
      : `Curso "${curso?.nome || ""}"${turma ? ` - Turma ${turma.nome}` : ""}`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return alert("Permita pop-ups");

    const hoje = new Date().toLocaleDateString("pt-BR");
    const horaEmissao = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const dataFormatada = new Date(form.dia + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const codigoAutenticacao = `IJP-${Date.now().toString(36).toUpperCase()}-${(alunoSelecionado.matricula || "").replace(/\D/g, "").slice(-4)}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Atestado - ${alunoSelecionado.nomeCompleto}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; }
            body {
              font-family: 'Georgia', 'Times New Roman', serif;
              color: #1a2a4f;
              margin: 0;
              padding: 20px;
              background: #fff;
            }
            .container {
              border: 2px solid #c9a96e;
              padding: 40px 50px;
              min-height: 90vh;
              position: relative;
              background: #fefdfb;
            }
            .container::before {
              content: "";
              position: absolute;
              top: 12px; left: 12px; right: 12px; bottom: 12px;
              border: 1px solid #c9a96e;
              pointer-events: none;
            }
            .header {
              text-align: center;
              border-bottom: 3px double #c9a96e;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              width: 160px;
              height: auto;
              margin-bottom: 12px;
            }
            h1 {
              font-family: 'Georgia', serif;
              font-size: 26px;
              margin: 8px 0 6px;
              letter-spacing: 3px;
              color: #1a2a4f;
              font-weight: 700;
            }
            .cnpj {
              font-family: 'Georgia', serif;
              font-size: 13px;
              color: #666;
              font-style: italic;
            }
            h2 {
              text-align: center;
              font-family: 'Georgia', serif;
              font-size: 42px;
              margin: 40px 0 30px;
              letter-spacing: 8px;
              color: #1a2a4f;
              font-weight: 700;
            }
            .conteudo {
              font-size: 18px;
              line-height: 2;
              text-align: justify;
              margin: 30px 0;
              text-indent: 40px;
            }
            .destaque {
              font-weight: 700;
              color: #0a1a3a;
            }
            .info {
              margin: 30px 0;
              font-size: 15px;
              color: #333;
              font-style: italic;
            }
            .assinatura {
              margin-top: 120px;
              text-align: center;
            }
            .linha {
              border-top: 2px solid #1a2a4f;
              width: 350px;
              margin: 0 auto 8px;
            }
            .assinatura-nome {
              font-size: 20px;
              font-weight: 700;
              color: #1a2a4f;
              font-family: 'Georgia', serif;
            }
            .assinatura-funcao {
              font-size: 15px;
              color: #555;
              font-style: italic;
              margin-top: 4px;
            }
            .footer {
              position: absolute;
              bottom: 30px;
              left: 50px;
              right: 50px;
              text-align: center;
              font-size: 11px;
              color: #999;
              line-height: 1.6;
              border-top: 1px solid #d4c5a0;
              padding-top: 12px;
            }
            .footer strong {
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="/logo-ijp.png" class="logo" />
              <h1>INSTITUTO JOVENS PERIFÉRICOS</h1>
              <div class="cnpj">CNPJ 43.248.302/0001-96 &bull; Salvador/Bahia</div>
            </div>

            <h2>ATESTADO</h2>

            <div class="conteudo">
              Atestamos para os devidos fins que <span class="destaque">${alunoSelecionado.nomeCompleto}</span>,
              matrícula <span class="destaque">${alunoSelecionado.matricula || "-"}</span>,
              compareceu nesta instituição no dia <span class="destaque">${dataFormatada}</span>,
              no horário das <span class="destaque">${form.chegada}</span> às <span class="destaque">${form.saida}</span>,
              para ${form.tipo === "saude" ? "atendimento no" : "participação no"} <span class="destaque">${descricaoServico}</span>.
            </div>

            <div class="info">
              <strong>Emitido em:</strong> ${hoje} às ${horaEmissao}
            </div>

            <div class="assinatura">
              <div class="linha"></div>
              <div class="assinatura-nome">${form.assinanteNome}</div>
              <div class="assinatura-funcao">${form.assinanteFuncao}</div>
            </div>

            <div class="footer">
              <strong>Instituto Jovens Periféricos</strong> &bull; CNPJ 43.248.302/0001-96<br>
              Documento emitido eletronicamente pelo sistema do Instituto Jovens Periféricos<br>
              em ${hoje} às ${horaEmissao} &bull; Código de autenticação: <strong>${codigoAutenticacao}</strong>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const sInput = { width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8, marginBottom: 12 };

  return (
    <div>
      <h2>Gerar Atestado</h2>

      {/* Aluno com busca */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>Buscar aluno (nome ou matrícula):</label>
        <input
          type="text"
          placeholder="🔍 Digite pelo menos 2 caracteres..."
          value={buscaAluno}
          onChange={e => { setBuscaAluno(e.target.value); setAlunoSelecionado(null); }}
          style={sInput}
        />
        {buscaAluno.trim().length >= 2 && !alunoSelecionado && (
          <div style={{ border: "1px solid #e0e4e8", borderRadius: 8, maxHeight: 300, overflowY: "auto" }}>
            {alunosFiltrados.length === 0 && <p style={{ padding: 12, color: "#6b7a8f" }}>Nenhum aluno encontrado.</p>}
            {alunosFiltrados.map(a => (
              <div
                key={a.id}
                onClick={() => { setAlunoSelecionado(a); setBuscaAluno(a.nomeCompleto); }}
                style={{ padding: 12, cursor: "pointer", borderBottom: "1px solid #f0f2f5" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f8f9fa")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <strong>{a.nomeCompleto}</strong> <span style={{ color: "#6b7a8f", fontSize: 13 }}>({a.matricula})</span>
              </div>
            ))}
          </div>
        )}
        {alunoSelecionado && (
          <p style={{ marginTop: 8, color: "#28a745", fontWeight: 600 }}>
            ✓ Selecionado: {alunoSelecionado.nomeCompleto} ({alunoSelecionado.matricula})
          </p>
        )}
      </div>

      {/* Dados do atestado */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <h3 style={{ marginTop: 0 }}>Dados do atestado</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label>Dia:</label>
            <input type="date" value={form.dia} onChange={e => handleChange("dia", e.target.value)} style={sInput} />
          </div>
          <div>
            <label>Chegada:</label>
            <input type="time" value={form.chegada} onChange={e => handleChange("chegada", e.target.value)} style={sInput} />
          </div>
          <div>
            <label>Saída:</label>
            <input type="time" value={form.saida} onChange={e => handleChange("saida", e.target.value)} style={sInput} />
          </div>
        </div>

        <label style={{ fontWeight: 600 }}>Tipo:</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => handleChange("tipo", "saude")}
            style={{ flex: 1, padding: 10, border: form.tipo === "saude" ? "2px solid #0070f3" : "1px solid #ccc", background: form.tipo === "saude" ? "#e6f0ff" : "#fff", borderRadius: 8, cursor: "pointer" }}>
            🏥 Serviço de Saúde
          </button>
          <button onClick={() => handleChange("tipo", "curso")}
            style={{ flex: 1, padding: 10, border: form.tipo === "curso" ? "2px solid #0070f3" : "1px solid #ccc", background: form.tipo === "curso" ? "#e6f0ff" : "#fff", borderRadius: 8, cursor: "pointer" }}>
            📚 Curso
          </button>
        </div>

        {form.tipo === "saude" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label>Serviço:</label>
              <select value={form.servicoId} onChange={e => handleChange("servicoId", e.target.value)} style={sInput}>
                <option value="">Selecione</option>
                {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div>
              <label>Profissional:</label>
              <select value={form.profissionalId} onChange={e => handleChange("profissionalId", e.target.value)} style={sInput}>
                <option value="">Selecione</option>
                {profissionais
                  .filter(p => !form.servicoId || p.especialidade === form.servicoId)
                  .map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          </div>
        )}

        {form.tipo === "curso" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label>Curso:</label>
              <select value={form.cursoId} onChange={e => { handleChange("cursoId", e.target.value); handleChange("turmaId", ""); }} style={sInput}>
                <option value="">Selecione</option>
                {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label>Turma:</label>
              <select value={form.turmaId} onChange={e => handleChange("turmaId", e.target.value)} style={sInput} disabled={!form.cursoId}>
                <option value="">Selecione</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Assinatura */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <h3 style={{ marginTop: 0 }}>Quem assina</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label>Nome:</label>
            <input type="text" value={form.assinanteNome} onChange={e => handleChange("assinanteNome", e.target.value)} style={sInput} placeholder="Nome de quem assina" />
          </div>
          <div>
            <label>Função:</label>
            <input type="text" value={form.assinanteFuncao} onChange={e => handleChange("assinanteFuncao", e.target.value)} style={sInput} placeholder="Ex: Coordenador, Nutricionista" />
          </div>
        </div>
      </div>

      <button
        onClick={gerarAtestado}
        style={{ padding: "14px 32px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 16, fontWeight: 600 }}
      >
        📄 Gerar Atestado
      </button>
    </div>
  );
}