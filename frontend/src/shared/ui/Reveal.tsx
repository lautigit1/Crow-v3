import { forwardRef } from "react";
import { motion, type Variants, type HTMLMotionProps } from "framer-motion";

const variants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: index * 0.09, ease: [0.16, 1, 0.3, 1] },
  }),
};

type RevealProps = Omit<HTMLMotionProps<"div">, "variants" | "initial" | "whileInView" | "viewport" | "custom"> & {
  /** Orden dentro de un grupo — controla el delay del stagger (0, 1, 2…). */
  index?: number;
  /** Fracción del elemento que debe entrar en viewport para disparar la animación. */
  amount?: number;
};

/**
 * Reemplaza el patrón repetido `useInView()` + `style={{opacity, animation}}`
 * que hoy está copiado en Hero, StatsSection, HowItWorks, CategoryGrid y
 * AboutSection. Misma sensación visual (fade + translateY, stagger por índice),
 * pero como un único componente en vez de boilerplate duplicado por widget.
 *
 * `forwardRef` a propósito: `CtaFinal` necesita el nodo DOM real para medir
 * la posición del mouse (spotlight). Una función simple no reenvía `ref`
 * (React la descarta con un warning) — con `forwardRef` sí llega hasta el
 * `motion.div`.
 */
export const Reveal = forwardRef<HTMLDivElement, RevealProps>(function Reveal(
  { index = 0, amount = 0.12, children, ...rest },
  ref
) {
  return (
    <motion.div
      ref={ref}
      variants={variants}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      {...rest}
    >
      {children}
    </motion.div>
  );
});
