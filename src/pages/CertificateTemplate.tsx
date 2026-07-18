import React from "react";
import "./CertificateTemplate.css";

interface CertificateTemplateProps {
  alunoNome: string;
  cursoNome: string;
  cargaHoraria: number;
  dataInicio: string;
  dataFim: string;
  frequencia: number;
  professores: string[];
  logoUrl?: string;
  assinaturaUrl?: string;
}

// Subcomponente Presidente
const Presidente: React.FC<{ assinaturaUrl: string }> = ({ assinaturaUrl }) => (
  <div className="signature-block signature-block-president">
    {assinaturaUrl && (
      <img src={assinaturaUrl} alt="" className="signature-image" loading="eager" />
    )}
    <div className="signature-name">Jadison dos Santos Palma</div>
    <div className="signature-role">Presidente</div>
    <div className="signature-org">Instituto Jovens Periféricos</div>
  </div>
);

// Subcomponente Professor
const Professor: React.FC<{ nome: string }> = ({ nome }) => (
  <div className="signature-block">
    <div className="signature-line" />
    <div className="signature-name">{nome}</div>
    <div className="signature-role">Professor</div>
  </div>
);

const CertificateTemplate: React.FC<CertificateTemplateProps> = ({
  alunoNome,
  cursoNome,
  cargaHoraria,
  dataInicio,
  dataFim,
  frequencia,
  professores,
  logoUrl = "/logo-ijp.png",
  assinaturaUrl = "/assinatura.png",
}) => {
  const profs = professores.length > 0 ? professores : ["_______________________"];
  const qtdProf = profs.length;

  // Tamanho da fonte do nome (dinâmico)
  const nomeFontSize = (() => {
    const l = alunoNome.length;
    if (l <= 28) return 48;
    if (l <= 36) return 44;
    if (l <= 44) return 40;
    if (l <= 55) return 36;
    return 32;
  })();

  // Tamanho da fonte do curso (dinâmico)
  const cursoFontSize = (() => {
    const l = cursoNome.length;
    if (l <= 30) return 24;
    if (l <= 45) return 20;
    if (l <= 60) return 17;
    return 14;
  })();

  const hoje = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  let signatureClass = "certificate-signatures";
  if (qtdProf === 1) signatureClass += " signatures-1";
  else if (qtdProf === 2) signatureClass += " signatures-2";
  else if (qtdProf === 3) signatureClass += " signatures-3";

  const professorBlocks = profs.map((nome, idx) => <Professor key={idx} nome={nome} />);

  let signaturesLayout = null;
  if (qtdProf === 1) {
    signaturesLayout = (
      <>
        <Presidente assinaturaUrl={assinaturaUrl} />
        {professorBlocks}
      </>
    );
  } else if (qtdProf === 2) {
    signaturesLayout = (
      <>
        {professorBlocks[0]}
        <Presidente assinaturaUrl={assinaturaUrl} />
        {professorBlocks[1]}
      </>
    );
  } else if (qtdProf === 3) {
    signaturesLayout = (
      <>
        {professorBlocks}
        <div className="signature-president-bottom">
          <Presidente assinaturaUrl={assinaturaUrl} />
        </div>
      </>
    );
  }

  return (
    <div className="certificate-wrapper">
      {/* Molduras */}
      <div className="certificate-frame">
        <div className="certificate-frame-top" />
        <div className="certificate-frame-bottom" />
        <div className="certificate-frame-left" />
        <div className="certificate-frame-right" />
      </div>

      {/* Ornamentos */}
      <div className="certificate-corner certificate-corner-tl" />
      <div className="certificate-corner certificate-corner-tr" />
      <div className="certificate-corner certificate-corner-bl" />
      <div className="certificate-corner certificate-corner-br" />

      {/* Selo seco */}
      <img src={logoUrl} alt="" className="certificate-seal" loading="eager" />

      {/* Marca d'água */}
      <img src={logoUrl} alt="" className="certificate-watermark" loading="eager" />

      <div className="certificate-content">
        <div className="certificate-header">
          <img src={logoUrl} alt="" className="certificate-logo" loading="eager" />
          <h1 className="certificate-institution">INSTITUTO JOVENS PERIFÉRICOS</h1>
          <div className="certificate-divider" />
          <h2 className="certificate-title">CERTIFICADO</h2>
        </div>

        <div className="certificate-body">
          <p className="certificate-body-text">O Instituto Jovens Periféricos certifica que</p>
          <div className="certificate-student-name" style={{ fontSize: `${nomeFontSize}pt` }}>
            {alunoNome}
          </div>
          <p className="certificate-body-text">concluiu com êxito o curso</p>
          <div className="certificate-course-name" style={{ fontSize: `${cursoFontSize}pt` }}>
            “{cursoNome}”
          </div>
          <p className="certificate-body-text">
            com carga horária de <strong>{cargaHoraria}</strong> horas, promovido pelo Instituto Jovens Periféricos.
          </p>
          <div className="certificate-details">
            <span>Período: <strong>{dataInicio} a {dataFim}</strong></span>
            <span>Frequência: <strong>{frequencia}%</strong></span>
          </div>
          <div className="certificate-issue-date">Emitido em {hoje}</div>
        </div>

        <div className={signatureClass}>{signaturesLayout}</div>

        <div className="certificate-footer">
          <span>Instituto Jovens Periféricos</span>
          <span>CNPJ 43.248.302/0001-96</span>
          <span>Salvador • Bahia</span>
          <span>2026</span>
        </div>
      </div>
    </div>
  );
};

export default CertificateTemplate;