import { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import CertificateTemplate from "./CertificateTemplate";

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

  const gerarPDF = async () => {
    for (let i = 0; i < nomesProfessores.length; i++) {
      if (!nomesProfessores[i].trim()) {
        alert(`Preencha o nome do Professor ${i + 1}`);
        return;
      }
    }

    let container: HTMLDivElement | null = null;
    let reactRoot: any = null;

    try {
      container = document.createElement("div");
      container.style.position = "fixed";
      container.style.top = "-9999px";
      container.style.left = "-9999px";
      container.style.width = "297mm";
      container.style.height = "210mm";
      container.style.background = "#fcfbf8";
      document.body.appendChild(container);

      const root = document.createElement("div");
      root.style.width = "297mm";
      root.style.height = "210mm";
      container.appendChild(root);

      const ReactDOM = await import("react-dom/client");
      reactRoot = ReactDOM.createRoot(root);
      reactRoot.render(
        <CertificateTemplate
          alunoNome="Maria da Silva"
          cursoNome="Inglês Básico"
          cargaHoraria={720}
          dataInicio="08 de Junho"
          dataFim="08 de Setembro de 2026"
          frequencia={92}
          professores={nomesProfessores}
          logoUrl="/logo-ijp.png"
          assinaturaUrl="/assinatura.png"
        />
      );

      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 50));

      const images = root.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            if (img.complete && img.naturalWidth > 0) resolve();
          });
        })
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(root, {
        scale: 5,
        useCORS: true,
        logging: false,
        backgroundColor: "#fcfbf8",
        windowWidth: root.scrollWidth,
        windowHeight: root.scrollHeight,
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, 297, 210);
      pdf.save("certificado_exemplo.pdf");

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar certificado. Tente novamente.");
    } finally {
      if (reactRoot) {
        try { reactRoot.unmount(); } catch (_) {}
      }
      if (container && container.parentNode) {
        try { document.body.removeChild(container); } catch (_) {}
      }
    }
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