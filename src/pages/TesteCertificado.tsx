import jsPDF from "jspdf";

export default function TesteCertificado() {
  const gerarCertificadoExemplo = () => {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = pdf.internal.pageSize.getWidth(); // 297 mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 210 mm
    const marginX = 20;
    let y = 25; // posição vertical inicial

    // --- LOGO (maior) ---
    try {
      const logoImg = new Image();
      logoImg.src = "/logo-ijp.png";
      pdf.addImage(logoImg, "PNG", pageWidth / 2 - 40, y, 80, 35);
    } catch (error) {
      console.warn("Logo não encontrada em /logo-ijp.png");
    }
    y += 45;

    // --- TÍTULOS (maiores) ---
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.setTextColor(0, 0, 0);
    pdf.text("INSTITUTO JOVENS PERIFÉRICOS", pageWidth / 2, y, { align: "center" });
    y += 15;

    pdf.setFontSize(28);
    pdf.setTextColor(80, 80, 80);
    pdf.text("CERTIFICADO", pageWidth / 2, y, { align: "center" });
    y += 25;

    // --- TEXTO DO CERTIFICADO (fonte maior, espaçamento reduzido) ---
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    
    const nome = "Maria da Silva";
    const curso = "Inglês Básico";
    const carga = "720";
    const cnpj = "43.248.302/0001-96";
    const inicio = "08 de Junho";
    const fim = "08 de Setembro de 2026";

    const linhas = [
      `Orgulhosamente certificamos que ${nome} concluiu o curso "${curso}",`,
      `com carga horária de ${carga} horas, ministrado pelo Instituto Jovens Periféricos`,
      `(CNPJ: ${cnpj}), no período de ${inicio} a ${fim}.`,
      `Frequência: 92%`,
    ];

    for (const linha of linhas) {
      pdf.text(linha, pageWidth / 2, y, { align: "center" });
      y += 9; // espaço menor entre linhas
    }

    // --- ASSINATURAS (imagens + nomes abaixo, sem cargos) ---
    y += 20; // espaço antes das assinaturas
    const larguraAss = 70;
    const alturaAss = 25;
    const espaco = 35;
    const esquerdaX = pageWidth / 2 - espaco - larguraAss;
    const direitaX = pageWidth / 2 + espaco;

    // Assinatura 1 (esquerda)
    try {
      const ass1 = new Image();
      ass1.src = "/Assinatura1.png";
      pdf.addImage(ass1, "PNG", esquerdaX, y, larguraAss, alturaAss);
    } catch (e) {
      pdf.line(esquerdaX + 10, y + alturaAss, esquerdaX + larguraAss - 10, y + alturaAss);
    }
    pdf.setFontSize(12);
    pdf.text("Jadison dos Santos Palma", esquerdaX + larguraAss / 2, y + alturaAss + 6, { align: "center" });

    // Assinatura 2 (direita)
    try {
      const ass2 = new Image();
      ass2.src = "/assinatura2.png";
      pdf.addImage(ass2, "PNG", direitaX, y, larguraAss, alturaAss);
    } catch (e) {
      pdf.line(direitaX + 10, y + alturaAss, direitaX + larguraAss - 10, y + alturaAss);
    }
    pdf.text("Helton Gabriel S. Santos", direitaX + larguraAss / 2, y + alturaAss + 6, { align: "center" });

    // --- DATA DE EMISSÃO (rodapé) ---
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(`Emitido em: ${new Date().toLocaleDateString()}`, pageWidth - marginX, pageHeight - 15, { align: "right" });

    pdf.save("certificado_exemplo.pdf");
  };

  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <h1>Teste de Certificado</h1>
      <button onClick={gerarCertificadoExemplo} style={{ padding: 10, fontSize: 16 }}>
        Gerar certificado de exemplo
      </button>
      <p>O PDF será baixado automaticamente. Verifique se o layout está como desejado.</p>
      <p>Certifique-se de que a logo foi copiada para <code>public/logo-ijp.png</code> e que as imagens <code>/Assinatura1.png</code> e <code>/assinatura2.png</code> existem na pasta <code>public</code>.</p>
    </div>
  );
}