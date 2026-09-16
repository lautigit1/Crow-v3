// La lógica real vive en `entities/session` (ver context.tsx ahí) -- este
// archivo es un re-export de compatibilidad para que `main.tsx` pueda armar
// el árbol de providers en un solo lugar reconocible (`app/providers`), sin
// que ninguna capa inferior (pages/widgets/features) necesite importar
// "hacia arriba" desde `app` para usar `useAuth`, que se importa siempre
// desde `@/entities/session`.
export { AuthProvider } from "@/entities/session";
