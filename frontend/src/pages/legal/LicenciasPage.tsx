import { LegalDocument, P, A, Tabla, type LegalSection } from "./LegalLayout";
import { legalPath } from "@/shared/config";

type Lib = { name: string; license: string; url: string; uso: string };

// Versiones sacadas: la lista anterior declaraba React 19, Vite 6 y
// python-jose, y el proyecto usa React 18, Vite 7 y PyJWT. Una versión fija
// en una página que nadie actualiza termina siendo falsa; las versiones
// exactas están en frontend/package.json y backend/requirements.txt.
const FRONTEND: Lib[] = [
  { name: "React", license: "MIT", url: "https://github.com/facebook/react", uso: "Interfaz de usuario" },
  { name: "React Router", license: "MIT", url: "https://github.com/remix-run/react-router", uso: "Navegación entre páginas" },
  { name: "TanStack Query", license: "MIT", url: "https://github.com/TanStack/query", uso: "Carga de datos" },
  { name: "Axios", license: "MIT", url: "https://github.com/axios/axios", uso: "Comunicación con el servidor" },
  { name: "Framer Motion", license: "MIT", url: "https://github.com/motiondivision/motion", uso: "Transiciones" },
  { name: "Lenis", license: "MIT", url: "https://github.com/darkroomengineering/lenis", uso: "Desplazamiento suave" },
  { name: "Recharts", license: "MIT", url: "https://github.com/recharts/recharts", uso: "Gráficos del panel" },
  { name: "Tailwind CSS", license: "MIT", url: "https://github.com/tailwindlabs/tailwindcss", uso: "Estilos" },
  { name: "Sentry SDK para React", license: "MIT", url: "https://github.com/getsentry/sentry-javascript", uso: "Reporte de errores" },
  { name: "Vite", license: "MIT", url: "https://github.com/vitejs/vite", uso: "Compilación" },
  { name: "TypeScript", license: "Apache 2.0", url: "https://github.com/microsoft/TypeScript", uso: "Lenguaje" },
];

const BACKEND: Lib[] = [
  { name: "FastAPI", license: "MIT", url: "https://github.com/fastapi/fastapi", uso: "Servidor de aplicación" },
  { name: "Uvicorn", license: "BSD 3-Clause", url: "https://github.com/encode/uvicorn", uso: "Servidor HTTP" },
  { name: "SQLAlchemy", license: "MIT", url: "https://github.com/sqlalchemy/sqlalchemy", uso: "Acceso a la base de datos" },
  { name: "Alembic", license: "MIT", url: "https://github.com/sqlalchemy/alembic", uso: "Migraciones de la base de datos" },
  { name: "Pydantic", license: "MIT", url: "https://github.com/pydantic/pydantic", uso: "Validación de datos" },
  { name: "PyJWT", license: "MIT", url: "https://github.com/jpadilla/pyjwt", uso: "Tokens de sesión" },
  { name: "bcrypt", license: "Apache 2.0", url: "https://github.com/pyca/bcrypt", uso: "Cifrado de contraseñas" },
  { name: "psycopg2", license: "LGPL 3.0", url: "https://github.com/psycopg/psycopg2", uso: "Conector de PostgreSQL" },
  { name: "Jinja2", license: "BSD 3-Clause", url: "https://github.com/pallets/jinja", uso: "Plantillas de email" },
  { name: "openpyxl", license: "MIT", url: "https://foss.heptapod.net/openpyxl/openpyxl", uso: "Importación de planillas" },
  { name: "pdfplumber", license: "MIT", url: "https://github.com/jsvine/pdfplumber", uso: "Importación de listas en PDF" },
  { name: "redis-py", license: "MIT", url: "https://github.com/redis/redis-py", uso: "Conector de Redis" },
  { name: "Sentry SDK para Python", license: "MIT", url: "https://github.com/getsentry/sentry-python", uso: "Reporte de errores" },
];

const INFRA: Lib[] = [
  { name: "PostgreSQL", license: "PostgreSQL License", url: "https://www.postgresql.org", uso: "Base de datos" },
  { name: "PgBouncer", license: "ISC", url: "https://github.com/pgbouncer/pgbouncer", uso: "Conexiones a la base de datos" },
  { name: "Redis", license: "Según versión desplegada", url: "https://redis.io/legal/licenses/", uso: "Caché y límites de intentos" },
  { name: "Nginx", license: "BSD 2-Clause", url: "https://nginx.org/LICENSE", uso: "Servidor del sitio" },
  { name: "Caddy", license: "Apache 2.0", url: "https://github.com/caddyserver/caddy", uso: "HTTPS y proxy" },
];

const FUENTES: Lib[] = [
  { name: "Unbounded", license: "SIL OFL 1.1", url: "https://fonts.google.com/specimen/Unbounded", uso: "Títulos" },
  { name: "DM Sans", license: "SIL OFL 1.1", url: "https://fonts.google.com/specimen/DM+Sans", uso: "Texto" },
  { name: "Fira Mono", license: "SIL OFL 1.1", url: "https://fonts.google.com/specimen/Fira+Mono", uso: "Códigos y SKU" },
];

const filas = (libs: Lib[]) => libs.map((l) => [<A href={l.url}>{l.name}</A>, l.uso, l.license]);

export function LicenciasPage() {
  const sections: LegalSection[] = [
    { id: "sitio", title: "Interfaz del sitio", content: <Tabla head={["Componente", "Uso", "Licencia"]} rows={filas(FRONTEND)} /> },
    { id: "servidor", title: "Servidor", content: <Tabla head={["Componente", "Uso", "Licencia"]} rows={filas(BACKEND)} /> },
    {
      id: "infraestructura",
      title: "Infraestructura",
      content: (
        <>
          <Tabla head={["Componente", "Uso", "Licencia"]} rows={filas(INFRA)} />
          <P>
            Redis se distribuye bajo BSD 3-Clause hasta la versión 7.2 y bajo licencias propias de Redis
            desde la 7.4; la que aplica depende de la versión instalada en el servidor.
          </P>
        </>
      ),
    },
    {
      id: "tipografias",
      title: "Tipografías",
      content: (
        <>
          <Tabla head={["Familia", "Uso", "Licencia"]} rows={filas(FUENTES)} />
          <P>Las tres se sirven desde el propio sitio, sin conexión a Google Fonts.</P>
        </>
      ),
    },
    {
      id: "iconos",
      title: "Íconos y fotografías",
      content: (
        <>
          <P>
            Los íconos están dibujados en SVG dentro del código del sitio, siguiendo el estilo de trazo de
            Feather Icons. Las imágenes de producto y las marcas de terceros se tratan en la{" "}
            <A href={legalPath("propiedad-intelectual")}>política de propiedad intelectual</A>.
          </P>
          <P>La fotografía institucional de la página de inicio se usa bajo la Licencia Unsplash:</P>
          <Tabla
            head={["Fotografía", "Autor", "Licencia"]}
            rows={[
              [
                <A href="https://unsplash.com/es/fotos/surtido-de-convertidores-cataliticos-y-piezas-del-sistema-de-escape-REXWw_IW0wo">Piezas de escape</A>,
                "engin akyurt",
                <A href="https://unsplash.com/license">Licencia Unsplash</A>,
              ],
            ]}
          />
        </>
      ),
    },
    {
      id: "codigo-propio",
      title: "Código propio",
      content: (
        <P>
          El código propio de la plataforma no se distribuye bajo una licencia abierta. Los textos
          completos de cada licencia de terceros están en los repositorios enlazados.
        </P>
      ),
    },
  ];

  return (
    <LegalDocument
      doc="licencias"
      intro={<p>El sitio está construido sobre software de código abierto. Este es el listado de componentes de terceros y sus licencias.</p>}
      sections={sections}
    />
  );
}
