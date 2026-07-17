// La lógica real vive en `entities/session` (ver context.tsx ahí) -- este
// archivo es un re-export de compatibilidad para que `main.tsx` pueda armar
// el árbol de providers en un solo lugar reconocible (`app/providers`), sin
// que ninguna capa inferior (pages/widgets/features) necesite importar
// "hacia arriba" desde `app` para usar `useAuth`. Los consumidores nuevos
// deben importar directo desde `@/entities/session`.
export { AuthProvider, useAuth } from "@/entities/session";
