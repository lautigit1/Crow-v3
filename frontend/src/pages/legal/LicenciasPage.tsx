import { LegalLayout, H2, P, UL, InfoBox, Divider } from "./LegalLayout";

type Lib = { name: string; version: string; license: string; url: string; desc: string };

const LIBS: Lib[] = [
  { name: "React", version: "19", license: "MIT", url: "https://github.com/facebook/react", desc: "Librería principal de UI." },
  { name: "React Router", version: "7", license: "MIT", url: "https://github.com/remix-run/react-router", desc: "Enrutamiento del lado del cliente." },
  { name: "Axios", version: "1.x", license: "MIT", url: "https://github.com/axios/axios", desc: "Cliente HTTP para llamadas a la API." },
  { name: "Vite", version: "6", license: "MIT", url: "https://github.com/vitejs/vite", desc: "Bundler y servidor de desarrollo." },
  { name: "TypeScript", version: "5.x", license: "Apache 2.0", url: "https://github.com/microsoft/TypeScript", desc: "Superset tipado de JavaScript." },
  { name: "FastAPI", version: "0.115", license: "MIT", url: "https://github.com/fastapi/fastapi", desc: "Framework web del backend." },
  { name: "SQLAlchemy", version: "2.0", license: "MIT", url: "https://github.com/sqlalchemy/sqlalchemy", desc: "ORM para acceso a la base de datos." },
  { name: "Pydantic", version: "v2", license: "MIT", url: "https://github.com/pydantic/pydantic", desc: "Validación de datos y schemas." },
  { name: "Alembic", version: "1.x", license: "MIT", url: "https://github.com/sqlalchemy/alembic", desc: "Migraciones de base de datos." },
  { name: "Python-Jose", version: "3.x", license: "MIT", url: "https://github.com/mpdavis/python-jose", desc: "Generación y validación de tokens JWT." },
  { name: "PostgreSQL", version: "16", license: "PostgreSQL License", url: "https://www.postgresql.org", desc: "Base de datos relacional." },
  { name: "Nginx", version: "1.27", license: "BSD 2-Clause", url: "https://nginx.org", desc: "Servidor web para el frontend en producción." },
  // Las tres estaban mal: la página declaraba Archivo, Inter e IBM Plex Mono,
  // y ninguna de esas se usa ni se distribuye. Es una página de licencias --
  // atribuir la fuente equivocada es justo lo que no puede pasar acá.
  { name: "Unbounded (fuente)", version: "—", license: "OFL 1.1", url: "https://fonts.google.com/specimen/Unbounded", desc: "Tipografía display del sitio." },
  { name: "DM Sans (fuente)", version: "—", license: "OFL 1.1", url: "https://fonts.google.com/specimen/DM+Sans", desc: "Tipografía de cuerpo del sitio." },
  { name: "Fira Mono (fuente)", version: "—", license: "OFL 1.1", url: "https://fonts.google.com/specimen/Fira+Mono", desc: "Tipografía monoespaciada." },
];

// Fixed 5-key set -> precomputed literal badge classes (bg/text/border with
// baked-in alpha), same pattern as CookiesPage's `TONE_BADGE`.
const LICENSE_BADGE: Record<string, string> = {
  "MIT": "bg-[#15803D15] text-success border-[#15803D30]",
  "Apache 2.0": "bg-[#7C3AED15] text-[#7C3AED] border-[#7C3AED30]",
  "PostgreSQL License": "bg-[#0891B215] text-[#0891B2] border-[#0891B230]",
  "BSD 2-Clause": "bg-[#D9770615] text-[#D97706] border-[#D9770630]",
  "OFL 1.1": "bg-[#47556915] text-textMuted border-[#47556930]",
};
const DEFAULT_BADGE = "bg-[#47556915] text-textMuted border-[#47556930]";

export function LicenciasPage() {
  return (
    <LegalLayout title="Licencias" updated="1 de junio de 2026">
      <InfoBox>
        Crow Repuestos fue construido sobre software de código abierto. A continuación listamos las librerías y recursos de terceros utilizados, junto con sus licencias correspondientes.
      </InfoBox>

      <H2>Software de código abierto</H2>
      <P>
        Agradecemos a las comunidades open source cuyo trabajo hace posible este proyecto. Todos los componentes de terceros se utilizan de acuerdo con sus respectivas licencias.
      </P>

      <div className="flex flex-col gap-px mb-8">
        {LIBS.map((lib) => (
          <div
            key={lib.name}
            className="grid grid-cols-[1fr_auto] items-start gap-4 py-3.5 px-[18px] bg-white border border-border rounded-none hover:bg-surface"
          >
            <div>
              <div className="flex items-center gap-2.5 mb-[3px]">
                <a href={lib.url} target="_blank" rel="noreferrer" className="font-body text-sm font-semibold text-ink800 no-underline">
                  {lib.name}
                </a>
                <span className="font-mono text-[11px] text-textFaint">{lib.version}</span>
              </div>
              <div className="font-body text-[13px] text-textMuted">{lib.desc}</div>
            </div>
            <span className={`font-mono text-[11px] font-semibold py-[3px] px-2.5 rounded-full whitespace-nowrap border ${LICENSE_BADGE[lib.license] ?? DEFAULT_BADGE}`}>
              {lib.license}
            </span>
          </div>
        ))}
      </div>

      <Divider />

      <H2>Licencia del sitio</H2>
      <P>
        El código fuente propietario de Crow Repuestos (diseño, lógica de negocio, marca) no está disponible bajo ninguna licencia de código abierto. Todos los derechos reservados © {new Date().getFullYear()} Crow Repuestos.
      </P>

      <H2>Texto completo de licencias</H2>
      <P>
        El texto completo de las licencias MIT, Apache 2.0, OFL 1.1, PostgreSQL License y BSD 2-Clause está disponible en los repositorios oficiales de cada proyecto enlazados arriba.
      </P>

      <H2>Imágenes y recursos gráficos</H2>
      <UL>
        <li>Iconografía: íconos originales en estilo Feather, implementados como SVG inline.</li>
        <li>Imágenes de productos: generadas proceduralmente o provistas por los propios fabricantes con autorización de uso comercial.</li>
        <li>Logotipo Crow Repuestos: diseño original, todos los derechos reservados.</li>
      </UL>
    </LegalLayout>
  );
}
