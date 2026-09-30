import { useEffect, useState } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function Atestados() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);

  const [buscaAluno, setBuscaAluno] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null);
  const [gerando, setGerando] = useState(false);

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
      return (a.nomeCompleto || "").toLowerCase().includes(b) ||
             (a.matricula || "").toLowerCase().includes(b) ||
             (a.cpf || "").includes(b);
    })
    .slice(0, 8);

  const formatarDataNascimento = (nasc: string) => {
    if (!nasc) return "-";
    const d = new Date(nasc);
    if (isNaN(d.getTime())) return nasc;
    return d.toLocaleDateString("pt-BR");
  };

  const gerarAtestado = async () => {
    if (!alunoSelecionado) return alert("Selecione o aluno");
    if (!form.chegada || !form.saida) return alert("Preencha os horários");
    if (!form.assinanteNome || !form.assinanteFuncao) return alert("Preencha o assinante");

    setGerando(true);
    try {
      const servico = servicos.find(s => s.id === form.servicoId);
      const curso = cursos.find(c => c.id === form.cursoId);
      const turma = turmas.find(t => t.id === form.turmaId);
      const profissional = profissionais.find(p => p.id === form.profissionalId);

      const descricaoServico = form.tipo === "saude"
        ? `Serviço de ${servico?.nome || ""}${profissional ? ` com ${profissional.nome}` : ""}`
        : `Curso "${curso?.nome || ""}"${turma ? ` - Turma ${turma.nome}` : ""}`;

      // Gera código único para validação
      const agora = new Date();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const codigoAutenticacao = `${agora.getFullYear()}${String(agora.getMonth() + 1).padStart(2, "0")}-${random}-${(alunoSelecionado.matricula || "00000").replace(/\D/g, "").slice(-4)}`;

      await addDoc(collection(db, "atestados"), {
        codigo: codigoAutenticacao,
        alunoId: alunoSelecionado.id,
        alunoNome: alunoSelecionado.nomeCompleto,
        alunoCpf: alunoSelecionado.cpf || "",
        alunoNascimento: alunoSelecionado.nascimento || "",
        alunoMatricula: alunoSelecionado.matricula || "",
        dia: form.dia,
        chegada: form.chegada,
        saida: form.saida,
        tipo: form.tipo,
        descricaoServico,
        assinanteNome: form.assinanteNome,
        assinanteFuncao: form.assinanteFuncao,
        emitidoEm: agora,
      });

      const hoje = agora.toLocaleDateString("pt-BR");
      const horaEmissao = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const dataFormatada = new Date(form.dia + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
      const urlValidacao = `${window.location.origin}/validar/${codigoAutenticacao}`;

      const printWindow = window.open("", "_blank");
      if (!printWindow) { setGerando(false); return alert("Permita pop-ups"); }

      printWindow.document.write(`
        <html>
          <head>
            <title>Atestado - ${alunoSelecionado.nomeCompleto}</title>
            <style>
              @page { size: A4 portrait; margin: 0; }
              * { box-sizing: border-box; margin: 0; padding: 0; }
              html, body {
                width: 210mm;
                height: 297mm;
                overflow: hidden;
              }
              body {
                font-family: 'Georgia', 'Times New Roman', serif;
                color: #1a2a4f;
                background: #fff;
              }
              .container {
                width: 210mm;
                height: 297mm;
                padding: 15mm 18mm;
                position: relative;
                background: #fefdfb;
              }
              .frame-outer {
                position: absolute;
                top: 8mm; left: 8mm; right: 8mm; bottom: 8mm;
                border: 2px solid #c9a96e;
                pointer-events: none;
              }
              .frame-inner {
                position: absolute;
                top: 11mm; left: 11mm; right: 11mm; bottom: 11mm;
                border: 1px solid #c9a96e;
                pointer-events: none;
              }
              .content {
                position: relative;
                z-index: 1;
                height: 100%;
                display: flex;
                flex-direction: column;
              }
              .header {
                text-align: center;
                border-bottom: 3px double #c9a96e;
                padding-bottom: 14px;
                margin-bottom: 22px;
              }
              .logo {
                width: 200px;
                height: auto;
                margin-bottom: 10px;
              }
              h1 {
                font-family: 'Georgia', serif;
                font-size: 24px;
                margin: 4px 0 4px;
                letter-spacing: 2px;
                color: #1a2a4f;
                font-weight: 700;
              }
              .cnpj {
                font-family: 'Georgia', serif;
                font-size: 11px;
                color: #666;
                font-style: italic;
              }
              h2 {
                text-align: center;
                font-family: 'Georgia', serif;
                font-size: 36px;
                margin: 22px 0 22px;
                letter-spacing: 6px;
                color: #1a2a4f;
                font-weight: 700;
              }
              .conteudo {
                font-size: 15px;
                line-height: 1.9;
                text-align: justify;
                margin: 15px 0;
                text-indent: 30px;
              }
              .destaque {
                font-weight: 700;
                color: #0a1a3a;
              }
              .dados {
                background: #f8f6f1;
                border-left: 4px solid #c9a96e;
                padding: 12px 16px;
                margin: 15px 0;
                font-size: 13px;
                line-height: 1.8;
              }
              .dados-linha {
                display: flex;
                margin: 3px 0;
              }
              .dados-label {
                font-weight: 700;
                min-width: 140px;
                color: #1a2a4f;
              }
              .info {
                margin: 12px 0;
                font-size: 12px;
                color: #333;
                font-style: italic;
              }
              .assinatura {
                margin-top: auto;
                margin-bottom: 20px;
                text-align: center;
                padding-top: 30px;
              }
              .linha {
                border-top: 2px solid #1a2a4f;
                width: 320px;
                margin: 0 auto 8px;
              }
              .assinatura-nome {
                font-size: 16px;
                font-weight: 700;
                color: #1a2a4f;
                font-family: 'Georgia', serif;
              }
              .assinatura-funcao {
                font-size: 12px;
                color: #555;
                font-style: italic;
                margin-top: 2px;
              }
              .footer {
                text-align: center;
                font-size: 9px;
                color: #999;
                line-height: 1.5;
                border-top: 1px solid #d4c5a0;
                padding-top: 8px;
                margin-top: 15px;
              }
              .footer strong { color: #666; }
              .validacao {
                margin-top: 10px;
                background: #f8f6f1;
                padding: 10px;
                border-radius: 4px;
                font-size: 10px;
                color: #333;
                border: 1px dashed #c9a96e;
              }
              .validacao-titulo {
                font-weight: 700;
                color: #1a2a4f;
                font-size: 11px;
                margin-bottom: 4px;
              }
              .validacao-codigo {
                font-family: 'Courier New', monospace;
                font-size: 13px;
                font-weight: 700;
                color: #0a1a3a;
                letter-spacing: 1px;
                margin: 4px 0;
              }
              .validacao-url {
                font-size: 9px;
                color: #0070f3;
                word-break: break-all;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="frame-outer"></div>
              <div class="frame-inner"></div>
              <div class="content">
                <div class="header">
                  <img src="/logo-ijp.png" class="logo" />
                  <h1>INSTITUTO JOVENS PERIFÉRICOS</h1>
                  <div class="cnpj">CNPJ 43.248.302/0001-96 &bull; Salvador/Bahia</div>
                </div>

                <h2>ATESTADO</h2>

                <div class="conteudo">
                  Atestamos para os devidos fins que <span class="destaque">${alunoSelecionado.nomeCompleto}</span>,
                  portador(a) do CPF <span class="destaque">${alunoSelecionado.cpf || "-"}</span>,
                  nascido(a) em <span class="destaque">${formatarDataNascimento(alunoSelecionado.nascimento)}</span>,
                  matrícula <span class="destaque">${alunoSelecionado.matricula || "-"}</span>,
                  compareceu nesta instituição no dia <span class="destaque">${dataFormatada}</span>,
                  no horário das <span class="destaque">${form.chegada}</span> às <span class="destaque">${form.saida}</span>,
                  para ${form.tipo === "saude" ? "atendimento no" : "participação no"} <span class="destaque">${descricaoServico}</span>.
                </div>

                <div class="dados">
                  <div class="dados-linha">
                    <span class="dados-label">Nome completo:</span>
                    <span>${alunoSelecionado.nomeCompleto}</span>
                  </div>
                  <div class="dados-linha">
                    <span class="dados-label">CPF:</span>
                    <span>${alunoSelecionado.cpf || "-"}</span>
                  </div>
                  <div class="dados-linha">
                    <span class="dados-label">Data de nascimento:</span>
                    <span>${formatarDataNascimento(alunoSelecionado.nascimento)}</span>
                  </div>
                  <div class="dados-linha">
                    <span class="dados-label">Matrícula:</span>
                    <span>${alunoSelecionado.matricula || "-"}</span>
                  </div>
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
                  Documento emitido eletronicamente pelo sistema do Instituto Jovens Periféricos em ${hoje} às ${horaEmissao}
                  <div class="validacao">
                    <div class="validacao-titulo">🔒 VALIDAÇÃO DE AUTENTICIDADE</div>
                    <div class="validacao-codigo">${codigoAutenticacao}</div>
                    <div class="validacao-url">Valide em: ${urlValidacao}</div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 800);
    } catch (e: any) {
      alert(`Erro ao gerar: ${e.message}`);
    } finally {
      setGerando(false);
    }
  };

  const sInput = { width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8, marginBottom: 12 };

  return (
    <div>
      <h2>Gerar Atestado</h2>

      <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>Buscar aluno (nome, matrícula ou CPF):</label>
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
                <strong>{a.nomeCompleto}</strong> <span style={{ color: "#6b7a8f", fontSize: 13 }}>({a.matricula}) - CPF: {a.cpf || "-"}</span>
              </div>
            ))}
          </div>
        )}
        {alunoSelecionado && (
          <div style={{ marginTop: 8, padding: 10, background: "#e8f5e9", borderRadius: 8 }}>
            <p style={{ margin: 0, color: "#2e7d32", fontWeight: 600 }}>
              ✓ {alunoSelecionado.nomeCompleto}
            </p>
            <p style={{ margin: "4px 0 0", color: "#555", fontSize: 13 }}>
              Matrícula: {alunoSelecionado.matricula} • CPF: {alunoSelecionado.cpf || "-"} • Nasc: {formatarDataNascimento(alunoSelecionado.nascimento)}
            </p>
          </div>
        )}
      </div>

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
        disabled={gerando}
        style={{ padding: "14px 32px", background: gerando ? "#999" : "#0070f3", color: "#fff", border: "none", borderRadius: 8, cursor: gerando ? "wait" : "pointer", fontSize: 16, fontWeight: 600 }}
      >
        {gerando ? "Gerando..." : "📄 Gerar Atestado"}
      </button>
    </div>
  );
}