import { useEffect, useState } from "react";

/**
 * Lee `contact.hours` ("Lun–Sáb · 8:00–18:00") de forma simple: abierto de
 * lunes a sábado, 8 a 18hs, hora local del navegador. Crow Repuestos es un
 * negocio de un solo local en Mendoza, así que asumir que quien visita el
 * sitio está en ese huso horario (o uno cercano) es una simplificación
 * razonable -- no vale la pena traer una librería de timezones para esto.
 * Si el horario cambia, actualizar también `shared/config/contact.ts`.
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
