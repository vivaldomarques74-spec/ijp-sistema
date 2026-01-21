import logoIJP from "../assets/logo-ijp.png";

export default function Dashboard() {
  return (
    <div
      style={{
        minHeight: "80vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        alignItems: "center",
        gap: 40,
        padding: 40,
      }}
    >
      {/* LOGO */}
      <div style={{ textAlign: "center" }}>
        <img
          src={logoIJP}
          alt="Instituto Jovens Periféricos"
          style={{
            width: "100%",
            maxWidth: 420,
          }}
        />
      </div>

      {/* TEXTO */}
      <div>
        <h1>Instituto Jovens Periféricos</h1>
        <h2>Bem-vindo, equipe de excelência</h2>

        <p style={{ fontStyle: "italic", marginTop: 20 }}>
          “Tudo o que fizerem, façam de todo o coração, como para o Senhor.”
        </p>

        <strong>Colossenses 3:23</strong>
      </div>
    </div>
  );
}
