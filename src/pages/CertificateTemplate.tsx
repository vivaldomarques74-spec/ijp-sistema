import React from "react";
import "./CertificateTemplate.css";
import type { ProfessorCertificado } from "../services/certificados";

interface CertificateTemplateProps {
  alunoNome: string;
  alunoCpf?: string;
  cursoNome: string;
  cargaHoraria: number;
  dataInicio: string;
  dataFim: string;
  frequencia: number;
  professores: (string | ProfessorCertificado)[];
  codigoValidacao?: string;
  linkValidacao?: string;
  logoUrl?: string;
  assinaturaUrl?: string;
}

const normalizarProfs = (
  profs: (string | ProfessorCertificado)[]
): ProfessorCertificado[] => {
  if (!profs || profs.length === 0) return [];
  if (typeof profs[0] === "string") {
    return (profs as string[]).map((nome) => ({ nome }));
  }
  return profs as ProfessorCertificado[];
};

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

const Professor: React.FC<{ prof: ProfessorCertificado }> = ({ prof }) => {
  const registro = prof.numeroRegistro
    ? `${prof.tipoRegistro ? prof.tipoRegistro + " " : ""}${prof.numeroRegistro}`
    : "";

  return (
    <div className="signature-block">
      <div className="signature-line" />
      <div className="signature-name">{prof.nome}</div>
      {prof.profissao && <div className="signature-role">{prof.profissao}</div>}
      {registro && <div className="signature-registro">{registro}</div>}
    </div>
  );
};

const CertificateTemplate: React.FC<CertificateTemplateProps> = ({
  alunoNome,
  alunoCpf,
  cursoNome,
  cargaHoraria,
  dataInicio,
  dataFim,
  frequencia,
  professores,
  codigoValidacao,
  linkValidacao,
  logoUrl = "/logo-ijp.png",
  assinaturaUrl = "/assinatura.png",
}) => {
  const profs = normalizarProfs(professores);
  const qtdProf = profs.length;

  const nomeFontSize = (() => {
    const l = alunoNome.length;
    if (l <= 28) return 48;
    if (l <= 36) return 44;
    if (l <= 44) return 40;
    if (l <= 55) return 36;
    return 32;
  })();

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

  const professorBlocks = profs.map((p, idx) => (
    <Professor key={idx} prof={p} />
  ));

  let signaturesLayout: React.ReactNode = null;

  if (qtdProf === 0) {
    signaturesLayout = <Presidente assinaturaUrl={assinaturaUrl} />;
  } else if (qtdProf === 1) {
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
  } else {
    signaturesLayout = (
      <>
        <div className="signatures-multi">{professorBlocks}</div>
        <div className="signature-president-bottom">
          <Presidente assinaturaUrl={assinaturaUrl} />
        </div>
      </>
    );
  }

  return (
    <div className="certificate-wrapper">
      <div className="certificate-frame">
        <div className="certificate-frame-top" />
        <div className="certificate-frame-bottom" />
        <div className="certificate-frame-left" />
        <div className="certificate-frame-right" />
      </div>

      <div className="certificate-corner certificate-corner-tl" />
      <div className="certificate-corner certificate-corner-tr" />
      <div className="certificate-corner certificate-corner-bl" />
      <div className="certificate-corner certificate-corner-br" />

      <img src={logoUrl} alt="" className="certificate-seal" loading="eager" />
      <img src={logoUrl} alt="" className="certificate-watermark" loading="eager" />

      <div className="certificate-content">
        <div className="certificate-header">
          <img src={logoUrl} alt="" className="certificate-logo" loading="eager" />
          <h1 className="certificate-institution">INSTITUTO JOVENS PERIFÉRICOS</h1>
          <p className="certificate-cnpj">CNPJ 43.248.302/0001-96</p>
          <div className="certificate-divider" />
          <h2 className="certificate-title">CERTIFICADO</h2>
        </div>

        <div className="certificate-body">
          <p className="certificate-body-text">
            O Instituto Jovens Periféricos certifica que
          </p>

          <div
            className="certificate-student-name"
            style={{ fontSize: `${nomeFontSize}pt` }}
          >
            {alunoNome}
          </div>

          {alunoCpf && <div className="certificate-cpf">CPF: {alunoCpf}</div>}

          <p className="certificate-body-text">concluiu com êxito o curso</p>

          <div
            className="certificate-course-name"
            style={{ fontSize: `${cursoFontSize}pt` }}
          >
            “{cursoNome}”
          </div>

          <p className="certificate-body-text">
            com carga horária de <strong>{cargaHoraria}</strong> horas, promovido
            pelo Instituto Jovens Periféricos.
          </p>

          <div className="certificate-details">
            <span>
              Período:{" "}
              <strong>
                {dataInicio} a {dataFim}
              </strong>
            </span>
            <span>
              Frequência: <strong>{frequencia}%</strong>
            </span>
          </div>

          <div className="certificate-issue-date">Emitido em {hoje}</div>
        </div>

        <div className={signatureClass}>{signaturesLayout}</div>

        {codigoValidacao && (
          <div className="certificate-validation">
            <div className="certificate-validation-text">
              <div className="certificate-validation-label">
                Código de validação
              </div>
              <div className="certificate-validation-code">
                {codigoValidacao}
              </div>
              {linkValidacao && (
                <div className="certificate-validation-link">
                  Valide este certificado em: <strong>{linkValidacao}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="certificate-footer">
          <span>Instituto Jovens Periféricos</span>
          <span>Salvador • Bahia</span>
          <span>2026</span>
        </div>
      </div>
    </div>
  );
};

export default CertificateTemplate;