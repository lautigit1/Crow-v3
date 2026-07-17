import { useEffect, useState } from "react";

/**
 * Asume un horario fijo (lun-sáb, 8 a 18hs, hora local del navegador) en vez
 * de parsear el campo "Horario" de Configuración (`useSiteSettings().hours`,
 * texto libre tipo "Lun–Sáb · 8:00–18:00") -- parsear texto libre de forma
 * confiable no vale la pena para un indicador puramente informativo. Crow
 * Repuestos es un negocio de un solo local en Mendoza, así que asumir que
 * quien visita el sitio está en ese huso horario (o uno cercano) es una
 * simplificación razonable -- no vale la pena traer una librería de
 * timezones para esto.
 *
 * Si el horario real del negocio cambia de forma que ya no sea "lun-sáb
 * 8-18", actualizar también esta función (el texto de Configuración es
 * independiente y no la alimenta).
 */
export function useIsOpenNow(): boolean {
  const [open, setOpen] = useState(() => computeOpen());

  useEffect(() => {
    const id = window.setInterval(() => setOpen(computeOpen()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return open;
}

function computeOpen(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 = domingo
  const hour = now.getHours();
  return day >= 1 && day <= 6 && hour >= 8 && hour < 18;
}
