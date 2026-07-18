import { useState } from "react";
import jsPDF from "jspdf";

export default function TesteCertificado() {
  const [quantidadeProfessores, setQuantidadeProfessores] = useState(2);
  const [nomesProfessores, setNomesProfessores] = useState<string[]>(["Jadison dos Santos Palma", "Maria Silva"]);

  const atualizarQuantidade = (qtd: number) => {
    setQuantidadeProfessores(qtd);
    const novos = [];
    for (let i = 0; i < qtd; i++) {
      novos.push(nomesProfessores[i] || "");
    }
    setNomesProfessores(novos);
  };

  const atualizarNomeProfessor = (index: number, valor: string) => {
    const novos = [...nomesProfessores];
    novos[index] = valor;
    setNomesProfessores(novos);
  };

  const gerarPDF = () => {
    for (let i = 0; i < nomesProfessores.length; i++) {
      if (!nomesProfessores[i].trim()) {
        alert(`Preencha o nome do Professor ${i + 1}`);
        return;
      }
    }

    // Dados fictícios
    const nomeAluno = "Maria da Silva";
    const cursoNome = "Inglês Básico";
    const cargaHoraria = 720;
    const dataInicio = "08 de Junho";
    const dataFim = "08 de Setembro de 2026";
    const frequencia = 92;

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 25;

    // Marca d'água
    try {
      const logoImg = new Image();
      logoImg.src = "/logo-ijp.png";
      const gState = new (pdf as any).GState({ opacity: 0.05 });
      pdf.setGState(gState);
      pdf.addImage(logoImg, "PNG", pageWidth / 2 - 40, pageHeight / 2 - 30, 80, 60);
      pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
    } catch (e) {}

    // Linha dourada superior
    pdf.setDrawColor(201, 169, 110);
    pdf.setLineWidth(0.5);
    pdf.line(margin, margin + 10, pageWidth - margin, margin + 10);

    // Logo
    try {
      const logoImg = new Image();
      logoImg.src = "/logo-ijp.png";
      pdf.addImage(logoImg, "PNG", pageWidth / 2 - 25, margin + 15, 50, 35);
    } catch (e) {}

    // Título
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(26, 42, 79);
    pdf.text("INSTITUTO JOVENS PERIFÉRICOS", pageWidth / 2, margin + 60, { align: "center" });

    pdf.setDrawColor(201, 169, 110);
    pdf.setLineWidth(0.3);
    pdf.line(pageWidth / 2 - 40, margin + 64, pageWidth / 2 + 40, margin + 64);

    pdf.setFont("times", "italic");
    pdf.setFontSize(26);
    pdf.setTextColor(26, 42, 79);
    pdf.text("CERTIFICADO", pageWidth / 2, margin + 90, { align: "center" });

    // Corpo
    pdf.setFont("times", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);

    const texto1 = `Certificamos que ${nomeAluno} concluiu com êxito o curso "${cursoNome}",`;
    const texto2 = `com carga horária de ${cargaHoraria} horas, promovido pelo Instituto Jovens Periféricos.`;
    const texto3 = `Período: ${dataInicio} a ${dataFim}`;
    const texto4 = `Frequência: ${frequencia}%`;

    let y = margin + 115;
    pdf.text(texto1, pageWidth / 2, y, { align: "center" });
    y += 10;
    pdf.text(texto2, pageWidth / 2, y, { align: "center" });
    y += 14;
    pdf.text(texto3, pageWidth / 2, y, { align: "center" });
    y += 8;
    pdf.text(texto4, pageWidth / 2, y, { align: "center" });

    // Assinatura Presidente
    const assinaturaY = y + 20;
    const assW = 70;
    const assH = 25;
    const presX = pageWidth / 2 - 35;

    try {
      const assImg = new Image();
      assImg.src = "/assinatura.png";
      if (assImg.complete && assImg.naturalWidth > 0) {
        pdf.addImage(assImg, "PNG", presX, assinaturaY, assW, assH);
      } else {
        pdf.line(presX + 10, assinaturaY + assH, presX + assW - 10, assinaturaY + assH);
      }
    } catch (e) {
      pdf.line(presX + 10, assinaturaY + assH, presX + assW - 10, assinaturaY + assH);
    }
    pdf.setFont("times", "bold");
    pdf.setFontSize(10);
    pdf.text("Jadison dos Santos Palma", presX + assW / 2, assinaturaY + assH + 6, { align: "center" });
    pdf.setFont("times", "normal");
    pdf.setFontSize(9);
    pdf.text("Presidente", presX + assW / 2, assinaturaY + assH + 12, { align: "center" });
    pdf.text("Instituto Jovens Periféricos", presX + assW / 2, assinaturaY + assH + 17, { align: "center" });

    // Professores
    const profYStart = assinaturaY + 30;
    const totalProf = nomesProfessores.length;
    const profSpacing = 40;
    const startXProf = (pageWidth - (totalProf - 1) * profSpacing - 60) / 2;

    for (let i = 0; i < totalProf; i++) {
      const x = startXProf + i * profSpacing;
      const yProf = profYStart + 10;

      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      pdf.line(x, yProf + 15, x + 60, yProf + 15);

      pdf.setFont("times", "normal");
      pdf.setFontSize(10);
      pdf.text(nomesProfessores[i], x + 30, yProf + 22, { align: "center" });
      pdf.setFontSize(9);
      pdf.text("Professor(a)", x + 30, yProf + 28, { align: "center" });
    }

    // Rodapé
    const rodapeY = pageHeight - margin + 5;
    pdf.setDrawColor(201, 169, 110);
    pdf.setLineWidth(0.3);
    pdf.line(margin, rodapeY - 3, pageWidth - margin, rodapeY - 3);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text("Instituto Jovens Periféricos", pageWidth / 2, rodapeY + 3, { align: "center" });
    pdf.text("CNPJ: 43.248.302/0001-96", pageWidth / 2, rodapeY + 8, { align: "center" });
    pdf.text("Salvador - BA | 2026", pageWidth / 2, rodapeY + 13, { align: "center" });

    pdf.save("certificado_exemplo.pdf");
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, color: "#1a2a4f" }}>Teste de Certificado</h1>
      <p style={{ color: "#6b7a8f", marginBottom: 16 }}>Visualize o novo modelo institucional.</p>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 500 }}>Quantidade de professores: </label>
        <select
          value={quantidadeProfessores}
          onChange={e => atualizarQuantidade(Number(e.target.value))}
          style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc", marginLeft: 8 }}
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </div>

      {nomesProfessores.map((nome, idx) => (
        <div key={idx} style={{ marginBottom: 8 }}>
          <label style={{ marginRight: 8 }}>Professor {idx + 1}: </label>
          <input
            type="text"
            placeholder={`Nome do professor ${idx + 1}`}
            value={nome}
            onChange={e => atualizarNomeProfessor(idx, e.target.value)}
            style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc", width: 250 }}
          />
        </div>
      ))}

      <button
        onClick={gerarPDF}
        style={{ padding: "10px 24px", background: "#0070f3", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 16, marginTop: 8 }}
      >
        Gerar certificado de exemplo
      </button>
      <p style={{ fontSize: 13, color: "#6b7a8f", marginTop: 12 }}>
        O PDF será baixado com o novo design institucional (A4 paisagem, alta resolução).
      </p>
    </div>
  );
}