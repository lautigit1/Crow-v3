import { Container } from "@/shared/ui";

// Diferenciales que el sitio ya respalda en otras páginas (preguntas
// frecuentes, términos): no se agregó ninguno nuevo. Los plazos de respuesta y
// de entrega se sacaron: el comercio hoy atiende consultas y no los garantiza.
const DIFERENCIALES = [
  {
    titulo: "Te atiende una persona",
    detalle: "Cada consulta la responde alguien que sabe de repuestos, no un sistema automático.",
  },
  {
    titulo: "Te ayudamos a encontrar la pieza",
    detalle: "Con marca, modelo y año alcanza. Si hay una alternativa más económica, te la ofrecemos.",
  },
  {
    titulo: "Particulares, talleres y flotas",
    detalle: "Condiciones especiales para talleres con compras frecuentes y precios por volumen para flotas.",
  },
  {
    titulo: "Garantía",
    detalle: "La garantía legal de cada producto y, cuando corresponde, la del fabricante.",
  },
];

/**
 * Quiénes somos.
 *
 * La foto (una pared de piezas de escape y catalizadores) es la única imagen
 * institucional de la página después del hero, y está acá porque cuenta lo
 * que el texto no puede: volumen y variedad de stock. Va en vertical, al
 * costado, para que la sección no repita la composición horizontal del hero.
 *
 * Foto: engin akyurt, Unsplash (licencia Unsplash). Ver /legal/licencias.
 */
export function AboutSection() {
  return (
    <section className="bg-white py-16 md:py-24">
      <Container>
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14 lg:gap-24">
          <picture className="block">
            <source media="(min-width: 768px)" srcSet="/img/piezas-escape-1200.webp" />
            <img
              src="/img/piezas-escape-700.webp"
              alt="Pared de un depósito con caños de escape y catalizadores colgados, ordenados por modelo"
              width={1200}
              height={1600}
              loading="lazy"
              decoding="async"
              className="block aspect-[4/3] h-auto w-full rounded-lg object-cover md:aspect-[4/5]"
            />
          </picture>

          <div className="md:pt-4">
            <h2 className="m-0 font-display text-display-md font-medium text-ink900 md:text-display-lg">
              Un comercio de repuestos de Mendoza
            </h2>
            <div className="mt-6 flex max-w-[540px] flex-col gap-4">
              <p className="m-0 font-body text-body text-textMuted">
                Crow Repuestos nació en Mendoza para cubrir una necesidad concreta: conseguir
                repuestos de calidad sin perder el día entero. Atendemos tanto a quien arregla su
                propio auto como a talleres y empresas con flota.
              </p>
              <p className="m-0 font-body text-body text-textMuted">
                No somos una cadena ni un sitio automatizado. Cuando nos escribís, te responde
                alguien que va a buscar la opción correcta para tu vehículo.
              </p>
            </div>

            <dl className="m-0 mt-10 grid max-w-[620px] grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2">
              {DIFERENCIALES.map((d) => (
                <div key={d.titulo} className="border-t border-ink900 pt-4">
                  <dt className="font-body text-body font-medium text-ink900">{d.titulo}</dt>
                  <dd className="m-0 mt-2 font-body text-body-sm text-textMuted">{d.detalle}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}
