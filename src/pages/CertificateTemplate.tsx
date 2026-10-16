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

  const nomeFontSize = (() => {
    const l = alunoNome.length;
    if (l <= 24) return 34;
    if (l <= 32) return 30;
    if (l <= 40) return 26;
    if (l <= 48) return 23;
    return 20;
  })();

  const cursoFontSize = (() => {
    const l = cursoNome.length;
    if (l <= 30) return 22;
    if (l <= 45) return 19;
    if (l <= 60) return 16;
    return 14;
  })();

  const hoje = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="certificate-wrapper">
      <div className="certificate-outer-border" />
      <div className="certificate-inner-border" />

      <div className="certificate-content">
        {/* ============ CABEÇALHO ============ */}
        <div className="certificate-header">
          <img
            src={logoUrl}
            alt="Instituto Jovens Periféricos"
            className="certificate-logo"
            loading="eager"
          />
          <h1 className="certificate-institution">
            INSTITUTO JOVENS PERIFÉRICOS
          </h1>
          <p className="certificate-cnpj">CNPJ 43.248.302/0001-96</p>
          <div className="certificate-divider" />
          <h2 className="certificate-title">CERTIFICADO</h2>
        </div>

        {/* ============ CORPO ============ */}
        <div className="certificate-body">
          <p className="certificate-text">
            O Instituto Jovens Periféricos certifica que
          </p>

          <div
            className="certificate-student-name"
            style={{ fontSize: `${nomeFontSize}pt` }}
          >
            {alunoNome}
          </div>

          {alunoCpf && <div className="certificate-cpf">CPF: {alunoCpf}</div>}

          <p className="certificate-text">concluiu com êxito o curso</p>

          <div
            className="certificate-course-name"
            style={{ fontSize: `${cursoFontSize}pt` }}
          >
            “{cursoNome}”
          </div>

          <p className="certificate-text">
            com carga horária de <strong>{cargaHoraria} horas</strong>,
            promovido pelo Instituto Jovens Periféricos.
          </p>

          <div className="certificate-details">
            <span>
              <strong>Período:</strong> {dataInicio} a {dataFim}
            </span>
            <span className="certificate-details-sep">•</span>
            <span>
              <strong>Frequência:</strong> {frequencia}%
            </span>
          </div>

          <div className="certificate-issue-date">Emitido em {hoje}</div>
        </div>

        {/* ============ ASSINATURAS ============ */}
        <div className="certificate-signatures-section">
          {/* Corpo Docente (professores) */}
          {profs.length > 0 && (
            <div className="signatures-teachers-row">
              {profs.map((p, idx) => {
                const registro = p.numeroRegistro
                  ? `${p.tipoRegistro ? p.tipoRegistro + " " : ""}${
                      p.numeroRegistro
                    }`
                  : "";
                return (
                  <div key={idx} className="teacher-signature">
                    <div className="teacher-signature-name">{p.nome}</div>
                    <div className="teacher-signature-line" />
                    <div className="teacher-signature-fullname">
                      {p.nome}
                    </div>
                    {(p.profissao || registro) && (
                      <div className="teacher-signature-info">
                        {p.profissao}
                        {p.profissao && registro && " • "}
                        {registro}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Presidente (com imagem de assinatura) */}
          <div className="signature-president-block">
            <div className="signature-president-image-wrap">
              {assinaturaUrl && (
                <img
                  src={assinaturaUrl}
                  alt=""
                  className="signature-president-image"
                  loading="eager"
                />
              )}
            </div>
            <div className="signature-president-line" />
            <div className="signature-president-name">
              Jadison dos Santos Palma
            </div>
            <div className="signature-president-role">Presidente</div>
            <div className="signature-president-org">
              Instituto Jovens Periféricos
            </div>
          </div>
        </div>

        {/* ============ VALIDAÇÃO ============ */}
        {codigoValidacao && (
          <div className="certificate-validation">
            <div className="validation-icon">🔐</div>
            <div className="validation-body">
              <div className="validation-title">Autenticidade verificável</div>
              <div className="validation-code-line">
                <span className="validation-label">Código:</span>{" "}
                <span className="validation-code">{codigoValidacao}</span>
              </div>
              {linkValidacao && (
                <div className="validation-link-line">
                  <span className="validation-label">Valide em:</span>{" "}
                  <span className="validation-link">{linkValidacao}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificateTemplate;