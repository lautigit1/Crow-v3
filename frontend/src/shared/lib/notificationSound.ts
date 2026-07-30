/**
 * Sonido de aviso, generado con la Web Audio API.
 *
 * **Sin archivo de audio.** Un mp3 sería una request más, un asset que versionar
 * y un formato que no todos los navegadores tocan igual. Dos osciladores y una
 * envolvente dan un "din-don" corto, pesan cero y suenan idéntico en todas
 * partes.
 *
 * Tres cosas que hacen la diferencia entre un aviso y una molestia:
 *
 *   1. **Se puede apagar**, y la preferencia queda guardada. Un sonido que no se
 *      puede silenciar es hostil, sobre todo en una pantalla que alguien va a
 *      tener abierta todo el día.
 *   2. **No suena dos veces seguidas.** Un cambio de pedido puede generar dos
 *      notificaciones a la vez (entrega y cobro); dos campanitas pisadas suenan
 *      a error del sistema.
 *   3. **Falla en silencio.** Los navegadores bloquean el audio hasta que la
 *      persona interactuó con la página, así que la primera vez `play()` puede
 *      ser rechazado. Eso no es un problema que haya que reportar: es el
 *      comportamiento normal y no debe ensuciar la consola ni tirar nada.
 */

const CLAVE_PREFERENCIA = "crow:noti-sonido";

/** Mínimo entre dos sonidos, en ms. */
const ANTIREBOTE = 1500;

let ultimoSonido = 0;
let contexto: AudioContext | null = null;

export function sonidoActivado(): boolean {
  try {
    // Activado por defecto: la preferencia se guarda solo cuando alguien la
    // cambia, así que la ausencia de valor significa "no lo tocó".
    return localStorage.getItem(CLAVE_PREFERENCIA) !== "off";
  } catch {
    // Safari en modo privado tira al leer localStorage.
    return true;
  }
}

export function activarSonido(activado: boolean): void {
  try {
    localStorage.setItem(CLAVE_PREFERENCIA, activado ? "on" : "off");
  } catch {
    // Sin persistencia el toggle igual funciona en la sesión actual.
  }
}

/**
 * Un "din-don" de dos notas: La5 y Fa#5, con la segunda apenas después.
 *
 * Dos notas descendentes en vez de un beep porque un tono solo se confunde con
 * un error del sistema; un intervalo se lee como "llegó algo".
 */
export function reproducirAviso(): void {
  if (!sonidoActivado()) return;

  const ahora = Date.now();
  if (ahora - ultimoSonido < ANTIREBOTE) return;
  ultimoSonido = ahora;

  try {
    // El AudioContext se crea una sola vez y se reusa: crear uno por sonido
    // agota el límite del navegador después de un rato.
    contexto ??= new AudioContext();
    if (contexto.state === "suspended") void contexto.resume();

    const notas = [
      { hz: 880, comienzo: 0, duracion: 0.13 },
      { hz: 740, comienzo: 0.11, duracion: 0.22 },
    ];

    for (const nota of notas) {
      const osc = contexto.createOscillator();
      const ganancia = contexto.createGain();
      // Onda triangular: más suave que la cuadrada, con más cuerpo que la seno.
      osc.type = "triangle";
      osc.frequency.value = nota.hz;

      const t0 = contexto.currentTime + nota.comienzo;
      // Ataque muy corto y caída exponencial. Sin la rampa se escucha un clic
      // al principio y al final, que es lo que hace que un tono generado suene
      // barato.
      ganancia.gain.setValueAtTime(0, t0);
      ganancia.gain.linearRampToValueAtTime(0.09, t0 + 0.012);
      ganancia.gain.exponentialRampToValueAtTime(0.0001, t0 + nota.duracion);

      osc.connect(ganancia).connect(contexto.destination);
      osc.start(t0);
      osc.stop(t0 + nota.duracion + 0.02);
    }
  } catch {
    // Autoplay bloqueado, AudioContext no disponible, pestaña en segundo plano
    // con restricciones. Nada de esto amerita romper nada.
  }
}
