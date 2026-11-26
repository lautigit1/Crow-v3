import { LegalDocument, P, UL, H3, A, Tabla, type LegalSection } from "./LegalLayout";
import { legalPath } from "@/shared/config";

/*
 * Todo lo que figura acá está verificado contra el código:
 *  - cookies: backend/app/core/cookies.py (únicas dos que emite el sitio);
 *  - localStorage: app/providers/CartProvider.tsx y shared/lib/notificationSound.ts;
 *  - sessionStorage: app/providers/ErrorBoundary.tsx.
 * El sitio no carga analítica, publicidad ni píxeles de terceros, y las
 * tipografías se sirven desde el propio dominio. Por eso no hay banner de
 * consentimiento: no existe ninguna cookie opcional que aceptar o rechazar.
 * Si algún día se agrega una, este documento y un mecanismo de consentimiento
 * previo tienen que llegar en el mismo cambio.
 */

const Codigo = ({ children }: { children: string }) => (
  <code className="whitespace-nowrap rounded-sm bg-surface px-1.5 py-0.5 font-mono text-[13px] text-ink800">{children}</code>
);

export function CookiesPage() {
  const sections: LegalSection[] = [
    {
      id: "que-son",
      title: "Qué son las cookies",
      content: (
        <P>
          Una cookie es un archivo pequeño que un sitio guarda en tu navegador para reconocerlo en las
          visitas siguientes. Los navegadores también ofrecen otros espacios de almacenamiento local
          (localStorage y sessionStorage) que cumplen funciones parecidas pero no se envían al
          servidor. Esta política cubre ambos.
        </P>
      ),
    },
    {
      id: "resumen",
      title: "Qué usa este sitio",
      content: (
        <>
          <P>
            Crow Repuestos usa únicamente cookies <strong className="font-medium text-ink900">estrictamente necesarias</strong>,
            propias y solo cuando iniciás sesión, más algunos datos en el almacenamiento local de tu
            navegador para recordar tu carrito y una preferencia.
          </P>
          <P>
            No usa cookies analíticas, publicitarias ni de seguimiento, ni de terceros. Por eso el sitio
            no muestra un aviso para aceptar cookies: no hay ninguna opcional sobre la que decidir.
          </P>
        </>
      ),
    },
    {
      id: "tipos",
      title: "Tipos de cookies y cuáles aplican",
      content: (
        <Tabla
          head={["Tipo", "Para qué sirve", "¿Las usa el sitio?"]}
          rows={[
            ["Estrictamente necesarias", "Hacen posible una función que pediste, como mantener la sesión iniciada.", "Sí, dos (detalle abajo)."],
            ["Funcionales", "Recuerdan preferencias para no tener que volver a elegirlas.", "No como cookies. Hay preferencias en almacenamiento local (detalle abajo)."],
            ["Analíticas", "Miden cómo se usa el sitio.", "No."],
            ["Publicitarias", "Muestran anuncios o siguen la navegación entre sitios.", "No."],
          ]}
        />
      ),
    },
    {
      id: "cookies-necesarias",
      title: "Cookies estrictamente necesarias",
      content: (
        <>
          <P>
            Se crean solo al iniciar sesión y se eliminan al cerrarla. Son propias (las emite el
            dominio del sitio), van marcadas como HttpOnly, por lo que ningún código que corra en la
            página puede leerlas, y se envían solo por conexión segura.
          </P>
          <Tabla
            head={["Nombre", "Finalidad", "Duración"]}
            rows={[
              [<Codigo>access_token</Codigo>, "Identifica tu sesión en cada pedido al servidor.", "30 minutos"],
              [<Codigo>refresh_token</Codigo>, "Renueva la sesión sin volver a pedirte la contraseña. Cada renovación la reemplaza por una nueva.", "7 días"],
            ]}
          />
        </>
      ),
    },
    {
      id: "almacenamiento-local",
      title: "Almacenamiento local del navegador",
      content: (
        <>
          <P>
            Estos datos quedan en tu dispositivo y no se envían a ningún servidor ni a terceros:
          </P>
          <Tabla
            head={["Clave", "Finalidad", "Duración"]}
            rows={[
              [<Codigo>crow_cart_guest_v1</Codigo>, "El carrito de un visitante sin sesión.", "Hasta que lo vacíes, inicies sesión o borres los datos del sitio."],
              [<Codigo>crow_cart_user_[id]_v1</Codigo>, "El carrito de tu cuenta en este navegador, para recuperarlo al volver a ingresar.", "Hasta que lo vacíes o borres los datos del sitio."],
              [<Codigo>crow:noti-sonido</Codigo>, "Si activaste o desactivaste el sonido de las notificaciones.", "Hasta que la cambies o borres los datos del sitio."],
              [<Codigo>crow:chunk-reloaded</Codigo>, "Evita recargas en bucle si una actualización del sitio llega mientras lo estás usando (sessionStorage).", "Se borra al cerrar la pestaña."],
            ]}
          />
        </>
      ),
    },
    {
      id: "administrar",
      title: "Cómo administrarlas o eliminarlas",
      content: (
        <>
          <H3>Desde el sitio</H3>
          <UL>
            <li>Cerrar sesión elimina las dos cookies.</li>
            <li>Vaciar el carrito borra su contenido guardado.</li>
            <li>El sonido de las notificaciones se activa o desactiva desde la campana de notificaciones.</li>
          </UL>
          <H3>Desde el navegador</H3>
          <P>
            Chrome, Firefox, Safari y Edge permiten ver, bloquear y borrar las cookies y los datos
            guardados por cada sitio desde la sección de privacidad de su configuración. Borrar los
            «datos del sitio» de crowrepuestos.com.ar elimina a la vez las cookies y el almacenamiento
            local descriptos acá. Como los menús cambian entre versiones, lo más seguro es buscar
            «cookies» en la ayuda de tu navegador.
          </P>
        </>
      ),
    },
    {
      id: "consecuencias",
      title: "Qué pasa si las bloqueás",
      content: (
        <P>
          Podés navegar el catálogo y pedir cotizaciones sin ninguna cookie. Si bloqueás las cookies
          del sitio no vas a poder iniciar sesión ni usar las funciones de cuenta (pedidos, favoritos,
          seguimiento de cotizaciones). Si bloqueás el almacenamiento local, el carrito funciona igual
          pero se pierde al cerrar o recargar la página.
        </P>
      ),
    },
    {
      id: "actualizaciones",
      title: "Actualizaciones de esta política",
      content: (
        <P>
          Si el sitio incorpora una cookie o un dato almacenado nuevo, esta política se actualiza antes
          de que entre en uso. Si se tratara de una cookie no necesaria, el sitio te pedirá
          consentimiento previo y te permitirá revocarlo. El tratamiento de datos personales asociado a
          tu cuenta se explica en la <A href={legalPath("privacidad")}>política de privacidad</A>.
        </P>
      ),
    },
  ];

  return (
    <LegalDocument
      doc="cookies"
      intro={
        <p>
          El sitio de Crow Repuestos solo usa las cookies necesarias para mantener tu sesión iniciada.
          No hay cookies de analítica, publicidad ni seguimiento. Acá está el detalle completo.
        </p>
      }
      sections={sections}
    />
  );
}
