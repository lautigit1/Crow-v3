import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Icon } from "@/shared/ui";
import { useServerEvent } from "@/shared/lib/serverEvents";
import { activarSonido, reproducirAviso, sonidoActivado } from "@/shared/lib/notificationSound";
import { useAuth } from "@/entities/session";
import { useQueryClient } from "@tanstack/react-query";
import {
  haceCuanto,
  NOTIFICATION_COLOR,
  NOTIFICATION_ICON,
  type Notification,
} from "@/entities/notification";
import {
  notificationKeys,
  useMarkAllReadMutation,
  useMarkReadMutation,
  useNotificationsQuery,
  useUnreadCountQuery,
} from "@/entities/notification/queries";

/**
 * Campana de notificaciones del navbar.
 *
 * El contador se pide siempre; la lista **solo cuando se abre el panel**. Traer
 * la lista en cada carga de página para un panel que puede no abrirse nunca
 * sería trabajo de más en la request más frecuente del sitio.
 */
export function NotificationBell() {
  const [abierto, setAbierto] = useState(false);
  const [conSonido, setConSonido] = useState(sonidoActivado);
  const contenedor = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: noLeidas = 0 } = useUnreadCountQuery(!!user);
  const { data, isPending } = useNotificationsQuery(
    { limit: 12 },
    { enabled: abierto && !!user },
  );
  const marcarLeida = useMarkReadMutation();
  const marcarTodas = useMarkAllReadMutation();

  // El evento del servidor invalida el contador y la lista. Es lo que hace que
  // aparezca sin recargar y sin sondeo.
  useServerEvent((evento) => {
    if (evento.type === "notification.created") {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      reproducirAviso();
    }
  });

  // Cerrar al hacer clic afuera y con Escape. Un panel que se queda abierto
  // tapando la navegación es de las cosas que más molestan de un menú así.
  useEffect(() => {
    if (!abierto) return;
    const alClickear = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", alClickear);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alClickear);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  const abrir = (n: Notification) => {
    if (!n.read_at) marcarLeida.mutate(n.id);
    setAbierto(false);
    if (n.link) navigate(n.link);
  };

  // Un invitado no tiene notificaciones y el endpoint le daría 401. Se sale
  // después de los hooks, que en React no pueden ir condicionados.
  if (!user) return null;

  const items = data?.items ?? [];

  return (
    <div ref={contenedor} className="relative">
      {/* Estilado para el fondo OSCURO de la navbar, igual que el botón de
          búsqueda y el del carrito que están al lado. Un botón claro acá se
          vería como un parche pegado encima. */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={noLeidas > 0 ? `Notificaciones (${noLeidas} sin leer)` : "Notificaciones"}
        aria-expanded={abierto}
        className={clsx(
          "relative flex h-9 w-9 items-center justify-center rounded-full outline-none [transition:background-color_.14s,color_.14s] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7FB0FF]",
          abierto
            ? "bg-[rgba(255,255,255,.14)] text-white"
            : "bg-transparent text-[rgba(255,255,255,.7)] hover:bg-[rgba(255,255,255,.08)] hover:text-white",
        )}
      >
        <Icon name="bell" size={16} />

        {noLeidas > 0 && (
          <>
            {/* El anillo late una vez por cada aviso nuevo y después queda
                quieto: un badge que parpadea sin parar se vuelve invisible. */}
            <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[17px] w-[17px] items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
            </span>
            <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold tabular-nums leading-none text-white ring-2 ring-ink900">
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          </>
        )}
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="absolute right-0 top-[calc(100%+10px)] z-[120] w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_#E2E8F0,0_20px_50px_-18px_rgba(13,23,40,.35)]"
        >
          {/* Encabezado oscuro a sangre, mismo lenguaje que el Drawer del panel */}
          <div className="relative overflow-hidden bg-ink900 px-5 py-4">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(127,176,255,.55)_40%,transparent)]" />
            <div className="relative flex items-center justify-between gap-3">
              <span className="font-display text-[14px] font-extrabold tracking-[-.01em] text-white">
                Notificaciones
              </span>
              <div className="flex items-center gap-3">
                {noLeidas > 0 && (
                  <button
                    type="button"
                    onClick={() => marcarTodas.mutate()}
                    disabled={marcarTodas.isPending}
                    className="font-body text-[12.5px] font-semibold text-[#7FB0FF] transition-opacity hover:opacity-75 disabled:opacity-50"
                  >
                    Marcar todas
                  </button>
                )}
                {/* El interruptor vive acá, dentro del panel, y no enterrado en
                    Configuración: quien quiere silenciarlo lo quiere silenciar
                    en el momento en que le molestó. */}
                <button
                  type="button"
                  onClick={() => {
                    const nuevo = !conSonido;
                    setConSonido(nuevo);
                    activarSonido(nuevo);
                    // Al encenderlo suena una vez: confirma que funciona y
                    // además le da al navegador la interacción que necesita
                    // para permitir audio más adelante.
                    if (nuevo) reproducirAviso();
                  }}
                  // Sin la palabra "Notificaciones" a propósito: el botón de la
                  // campana ya se llama así, y dos etiquetas que se contienen
                  // una a la otra hacen ambigua cualquier búsqueda por nombre
                  // accesible -- para un lector de pantalla y para los tests.
                  aria-label={conSonido ? "Silenciar avisos" : "Activar sonido de avisos"}
                  title={conSonido ? "Silenciar" : "Activar sonido"}
                  // Sin fondo en NINGÚN estado: el ícono va directo sobre el
                  // azul del encabezado. Antes el estado silenciado tenía un
                  // fondo claro que, a este tamaño, se veía como un círculo
                  // blanco tapando el ícono en vez de acompañarlo.
                  //
                  // Lo único que cambia entre estados es el ícono y la
                  // intensidad del color, que es suficiente: la tachadura ya
                  // dice todo lo que hay que decir.
                  className={clsx(
                    "bg-transparent transition-colors duration-150 hover:text-white",
                    conSonido ? "text-[rgba(255,255,255,.55)]" : "text-[rgba(255,255,255,.35)]",
                  )}
                >
                  <Icon name={conSonido ? "volumeOn" : "volumeOff"} size={17} strokeWidth={1.6} />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {isPending ? (
              <div className="px-5 py-10 text-center font-body text-[13px] text-textFaint">
                Cargando…
              </div>
            ) : items.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-textFaint">
                  <Icon name="bell" size={18} />
                </span>
                <p className="m-0 font-body text-[13.5px] text-textMuted">
                  No tenés notificaciones todavía.
                </p>
              </div>
            ) : (
              items.map((n) => {
                const color = NOTIFICATION_COLOR[n.type] ?? "#0057D9";
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => abrir(n)}
                    className={clsx(
                      "flex w-full items-start gap-3 border-b border-border px-4 py-3.5 text-left transition-colors duration-150 last:border-b-0",
                      n.read_at ? "bg-white hover:bg-surface" : "bg-primarySoft/40 hover:bg-primarySoft",
                    )}
                  >
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${color}1a`, color }}
                    >
                      <Icon name={NOTIFICATION_ICON[n.type] ?? "bell"} size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span
                          className={clsx(
                            "font-body text-[13.5px] leading-snug",
                            n.read_at ? "font-semibold text-ink800" : "font-bold text-ink900",
                          )}
                        >
                          {n.title}
                        </span>
                        {/* El punto solo en las no leídas: es la única señal
                            que hace falta y no compite con el texto. */}
                        {!n.read_at && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </span>
                      {n.body && (
                        <span className="mt-0.5 block font-body text-[12.5px] leading-snug text-textMuted">
                          {n.body}
                        </span>
                      )}
                      <span className="mt-1 block font-mono text-[10.5px] text-textFaint">
                        {haceCuanto(n.created_at)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
