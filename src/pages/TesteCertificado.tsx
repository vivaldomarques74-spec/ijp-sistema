import { useState } from "react";
import jsPDF from "jspdf";

export default function TesteCertificado() {
  const [quantidadeProfessores, setQuantidadeProfessores] = useState(2);
  const [nomesProfessores, setNomesProfessores] = useState<string[]>(["Jadison dos Santos Palma", ""]);

  const atualizarQuantidade = (qtd: number) => {
    setQuantidadeProfessores(qtd);
    const novosNomes = [];
    for (let i = 0; i < qtd; i++) {
      novosNomes.push(nomesProfessores[i] || "");
    }
    setNomesProfessores(novosNomes);
  };

  const atualizarNomeProfessor = (index: number, valor: string) => {
    const novos = [...nomesProfessores];
    novos[index] = valor;
    setNomesProfessores(novos);
  };

  const gerarCertificado = () => {
    // Validar nomes
    for (let i = 0; i < nomesProfessores.length; i++) {
      if (!nomesProfessores[i].trim()) {
        alert(`Preencha o nome do Professor ${i + 1}`);
        return;
      }
    }

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;

    // --- Fundo com gradiente suave (simulado com retângulos) ---
    pdf.setFillColor(248, 245, 240);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    // --- Borda decorativa externa ---
    pdf.setDrawColor(180, 150, 100);
    pdf.setLineWidth(3);
    pdf.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

    // --- Segunda borda fina interna ---
    pdf.setDrawColor(200, 180, 140);
    pdf.setLineWidth(1);
    pdf.rect(margin + 6, margin + 6, pageWidth - margin * 2 - 12, pageHeight - margin * 2 - 12);

    // --- Moldura decorativa com cantos arredondados (efeito visual) ---
    pdf.setDrawColor(180, 150, 100);
    pdf.setLineWidth(0.5);
    pdf.rect(margin + 10, margin + 10, pageWidth - margin * 2 - 20, pageHeight - margin * 2 - 20);

    // --- Selo (círculo com estrela) ---
    pdf.setDrawColor(180, 150, 100);
    pdf.setLineWidth(2);
    pdf.circle(pageWidth - 35, 35, 18);
    pdf.setFontSize(14);
    pdf.setTextColor(180, 150, 100);
    pdf.text("★", pageWidth - 35, 32, { align: "center" });
    pdf.setFontSize(8);
    pdf.text("INSTITUTO", pageWidth - 35, 43, { align: "center" });
    pdf.text("JOVENS", pageWidth - 35, 48, { align: "center" });

    // --- Logo ---
    try {
      const logoImg = new Image();
      logoImg.src = "/logo-ijp.png";
      pdf.addImage(logoImg, "PNG", pageWidth / 2 - 35, margin + 15, 70, 30);
    } catch (error) {
      pdf.setFontSize(16);
      pdf.text("IJP", pageWidth / 2, margin + 40, { align: "center" });
    }

    // --- Título da instituição ---
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.setTextColor(40, 50, 80);
    pdf.text("INSTITUTO JOVENS PERIFÉRICOS", pageWidth / 2, margin + 65, { align: "center" });

    // --- Título "CERTIFICADO" com linha decorativa ---
    pdf.setFontSize(28);
    pdf.setTextColor(180, 150, 100);
    pdf.text("CERTIFICADO", pageWidth / 2, margin + 95, { align: "center" });

    pdf.setDrawColor(180, 150, 100);
    pdf.setLineWidth(0.8);
    pdf.line(pageWidth / 2 - 70, margin + 102, pageWidth / 2 + 70, margin + 102);

    // --- Texto principal ---
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);

    const nome = "Maria da Silva";
    const curso = "Inglês Básico";
    const carga = "720";
    const cnpj = "43.248.302/0001-96";
    const periodo = "no período de 08 de Junho a 08 de Setembro de 2026";

    const linhas = [
      `Orgulhosamente certificamos que ${nome} concluiu o curso "${curso}",`,
      `com carga horária de ${carga} horas, ministrado pelo Instituto Jovens Periféricos`,
      `(CNPJ: ${cnpj}), ${periodo}.`,
      `Frequência: 92%`,
    ];

    let y = margin + 125;
    for (const linha of linhas) {
      pdf.text(linha, pageWidth / 2, y, { align: "center" });
      y += 9;
    }

    // --- Assinaturas dos professores ---
    const assinaturaY = y + 20;
    const larguraAss = 70;
    const alturaAss = 25;
    const totalAssinaturas = nomesProfessores.length;
    const espacoTotal = pageWidth - margin * 2 - larguraAss * totalAssinaturas;
    const espaco = totalAssinaturas > 1 ? espacoTotal / (totalAssinaturas + 1) : 0;

    // Carregar imagem da assinatura (usamos a mesma para todos, mas pode ser substituída)
    let assinaturaImg: HTMLImageElement | null = null;
    try {
      const img = new Image();
      img.src = "/Assinatura1.png";
      assinaturaImg = img;
    } catch (e) {}

    for (let i = 0; i < totalAssinaturas; i++) {
      const x = totalAssinaturas === 1
        ? (pageWidth - larguraAss) / 2
        : margin + espaco + i * (larguraAss + espaco);

      // Desenhar a imagem da assinatura ou uma linha
      if (assinaturaImg) {
        try {
          pdf.addImage(assinaturaImg, "PNG", x, assinaturaY, larguraAss, alturaAss);
        } catch (e) {
          pdf.line(x + 10, assinaturaY + alturaAss, x + larguraAss - 10, assinaturaY + alturaAss);
        }
      } else {
        pdf.line(x + 10, assinaturaY + alturaAss, x + larguraAss - 10, assinaturaY + alturaAss);
      }

      // Nome do professor
      pdf.setFontSize(10);
      pdf.text(nomesProfessores[i], x + larguraAss / 2, assinaturaY + alturaAss + 6, { align: "center" });

      // Cargo abaixo do nome (apenas para os três primeiros, com cargos definidos)
      if (i === 0 && totalAssinaturas > 1) {
        pdf.setFontSize(8);
        pdf.text("Diretor(a) Geral", x + larguraAss / 2, assinaturaY + alturaAss + 12, { align: "center" });
      } else if (i === 1 && totalAssinaturas > 1) {
        pdf.setFontSize(8);
        pdf.text("Coordenador(a) Pedagógico(a)", x + larguraAss / 2, assinaturaY + alturaAss + 12, { align: "center" });
      } else if (i === 2 && totalAssinaturas > 1) {
        pdf.setFontSize(8);
        pdf.text("Professor(a)", x + larguraAss / 2, assinaturaY + alturaAss + 12, { align: "center" });
      }
    }

    // Data de emissão
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text(`Emitido em: ${new Date().toLocaleDateString()}`, pageWidth - margin, pageHeight - margin, { align: "right" });

    pdf.save("certificado_exemplo.pdf");
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, color: "#1a2a4f" }}>Teste de Certificado</h1>
      <p style={{ color: "#6b7a8f", marginBottom: 16 }}>Visualize o novo modelo com múltiplos professores.</p>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 500 }}>Quantidade de professores: </label>
        <select
          value={quantidadeProfessores}
          onChange={(e) => atualizarQuantidade(Number(e.target.value))}
          style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc", marginLeft: 8 }}
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </div>

      {nomesProfessores.map((nome, idx) => (
        <div key={idx} style={{ marginBottom: 8 }}>
          <label style={{ fontWeight: 500, marginRight: 8 }}>Professor {idx + 1}: </label>
          <input
            type="text"
            placeholder={`Digite o nome do professor ${idx + 1}`}
            value={nome}
            onChange={(e) => atualizarNomeProfessor(idx, e.target.value)}
            style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc", width: 250 }}
          />
        </div>
      ))}

      <button
        onClick={gerarCertificado}
        style={{ padding: "10px 24px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 16, marginTop: 8 }}
      >
        Gerar certificado de exemplo
      </button>
      <p style={{ fontSize: 13, color: "#6b7a8f", marginTop: 12 }}>
        O PDF será baixado automaticamente com o novo layout e as assinaturas dos professores informados.
      </p>
    </div>
  );
}