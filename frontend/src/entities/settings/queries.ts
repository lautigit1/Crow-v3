import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, type SiteSettings } from "./index";

export const settingsKeys = {
  all: ["settings"] as const,
};

/**
 * Configuración pública del sitio (nombre, contacto, redes, horario).
 *
 * Los dos overrides de abajo existen por un caso concreto: editar los datos
 * en el panel admin y no verlos reflejados en el footer del sitio público.
 *
 * El footer (`widgets/footer/Footer.tsx`) vive en `PublicLayout`, o sea que
 * está montado de forma permanente mientras navegás el sitio -- nunca se
 * desmonta, así que nunca hay un "mount" que dispare un refetch. Combinado
 * con el `staleTime` de 5 min y el `refetchOnWindowFocus: false` global
 * (`app/providers/queryClient.ts`), una pestaña del sitio público que ya
 * tenía los settings en cache se quedaba mostrando los viejos: guardabas en
 * la pestaña del admin (donde la mutation sí actualiza la cache de ESA
 * pestaña) y la del sitio no se enteraba de nada hasta un F5.
 */
export function useSettingsQuery() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => settingsApi.get(),
    // 60s en vez de 5 min: sigue evitando el refetch en cada navegación,
    // pero acota cuánto puede quedar desactualizado un dato que el dueño
    // edita a mano y espera ver aplicado enseguida.
    staleTime: 60_000,
    // Override del default global (false): al volver a la pestaña del sitio
    // después de guardar en la del admin, revalida y el footer se actualiza
    // solo. Es una request chica a un endpoint público, no molesta.
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

/** Usado por AdminSettingsPage al guardar -- refresca la cache para que todo
 * el resto del sitio (footer, navbar, checkout, etc.) refleje el cambio sin
 * esperar a que venza el staleTime. */
export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SiteSettings>) => settingsApi.update(data),
    onSuccess: (updated) => {
      // La respuesta del PUT ya trae la config completa: se escribe directo
      // para que el cambio se vea instantáneo, sin esperar un round-trip.
      queryClient.setQueryData(settingsKeys.all, updated);
      // Y además se marca como stale, para que la próxima vez que alguien
      // la observe se revalide contra el server. Confirma que lo que quedó
      // en la UI es lo que realmente se persistió, en vez de confiar en el
      // eco del PUT.
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}
