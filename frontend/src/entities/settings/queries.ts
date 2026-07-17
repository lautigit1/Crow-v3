import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, type SiteSettings } from "./index";

export const settingsKeys = {
  all: ["settings"] as const,
};

/** Configuración pública del sitio (nombre, contacto, redes, horario). */
export function useSettingsQuery() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => settingsApi.get(),
    staleTime: 5 * 60_000, // dato público de muy bajo cambio -- mismo criterio que brand/category
  });
}

/** Usado por AdminSettingsPage al guardar -- invalida la cache para que todo
 * el resto del sitio (footer, navbar, checkout, etc.) refleje el cambio sin
 * esperar a que venza el staleTime. */
export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SiteSettings>) => settingsApi.update(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(settingsKeys.all, updated);
    },
  });
}
