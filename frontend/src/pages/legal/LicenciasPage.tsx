import { LegalLayout, H2, P, UL, InfoBox, Divider } from "./LegalLayout";
import { color, font, radius } from "@/shared/config/theme";

type Lib = { name: string; version: string; license: string; url: string; desc: string };

const LIBS: Lib[] = [
  { name: "React",             version: "19",      license: "MIT", url: "https://github.com/facebook/react",              desc: "Librería principal de UI." },
  { name: "React Router",      version: "7",       license: "MIT", url: "https://github.com/remix-run/react-router",      desc: "Enrutamiento del lado del cliente." },
  { name: "Axios",             version: "1.x",     license: "MIT", url: "https://github.com/axios/axios",                 desc: "Cliente HTTP para llamadas a la API." },
  { name: "Vite",              version: "6",       license: "MIT", url: "https://github.com/vitejs/vite",                 desc: "Bundler y servidor de desarrollo." },
  { name: "TypeScript",        version: "5.x",     license: "Apache 2.0", url: "https://github.com/microsoft/TypeScript", desc: "Superset tipado de JavaScript." },
  { name: "FastAPI",           version: "0.115",   license: "MIT", url: "https://github.com/fastapi/fastapi",             desc: "Framework web del backend." },
  { name: "SQLAlchemy",        version: "2.0",     license: "MIT", url: "https://github.com/sqlalchemy/sqlalchemy",       desc: "ORM para acceso a la base de datos." },
  { name: "Pydantic",          version: "v2",      license: "MIT", url: "https://github.com/pydantic/pydantic",           desc: "Validación de datos y schemas." },
  { name: "Alembic",           version: "1.x",     license: "MIT", url: "https://github.com/sqlalchemy/alembic",          desc: "Migraciones de base de datos." },
  { name: "Python-Jose",       version: "3.x",     license: "MIT", url: "https://github.com/mpdavis/python-jose",         desc: "Generación y validación de tokens JWT." },
  { name: "PostgreSQL",        version: "16",      license: "PostgreSQL License", url: "https://www.postgresql.org",      desc: "Base de datos relacional." },
  { name: "Nginx",             version: "1.27",    license: "BSD 2-Clause", url: "https://nginx.org",                    desc: "Servidor web para el frontend en producción." },
  { name: "Archivo (fuente)",  version: "—",       license: "OFL 1.1", url: "https://fonts.google.com/specimen/Archivo", desc: "Tipografía display del sitio." },
  { name: "Inter (fuente)",    version: "—",       license: "OFL 1.1", url: "https://rsms.me/inter",                     desc: "Tipografía de cuerpo del sitio." },
  { name: "IBM Plex Mono",     version: "—",       license: "OFL 1.1", url: "https://github.com/IBM/plex",               desc: "Tipografía monoespaciada." },
];

const LICENSE_COLOR: Record<string, string> = {
  "MIT":                color.success,
  "Apache 2.0":         "#7C3AED",
  "PostgreSQL License": "#0891B2",
  "BSD 2-Clause":       "#D97706",
  "OFL 1.1":            "#475569",
};

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

      <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 32 }}>
        {LIBS.map((lib) => (
          <div key={lib.name} style={{
            display: "grid", gridTemplateColumns: "1fr auto",
            alignItems: "start", gap: 16,
            padding: "14px 18px",
            background: "#fff",
            border: `1px solid ${color.border}`,
            borderRadius: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = color.surface)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                <a href={lib.url} target="_blank" rel="noreferrer" style={{ fontFamily: font.body, fontSize: 14, fontWeight: 600, color: color.ink800, textDecoration: "none" }}>
                  {lib.name}
                </a>
                <span style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint }}>{lib.version}</span>
              </div>
              <div style={{ fontFamily: font.body, fontSize: 13, color: color.textMuted }}>{lib.desc}</div>
            </div>
            <span style={{
              fontFamily: font.mono, fontSize: 11, fontWeight: 600,
              padding: "3px 10px", borderRadius: radius.pill, whiteSpace: "nowrap",
              background: `${LICENSE_COLOR[lib.license] ?? color.textMuted}15`,
              color: LICENSE_COLOR[lib.license] ?? color.textMuted,
              border: `1px solid ${LICENSE_COLOR[lib.license] ?? color.textMuted}30`,
            }}>
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
