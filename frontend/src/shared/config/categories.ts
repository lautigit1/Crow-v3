import type { IconName } from "@/shared/ui";

export const CATEGORIES: {
  label: string;
  desc: string;
  icon: IconName;
  waMsg: string;
}[] = [
  {
    label: "Autos",
    desc: "Frenos, motor, suspensión y eléctricos.",
    icon: "wrench",
    waMsg: "Hola Crow! Necesito un repuesto para mi auto. ¿Me podés ayudar con disponibilidad y precio?",
  },
  {
    label: "Camiones",
    desc: "Carga pesada y transporte.",
    icon: "truck",
    waMsg: "Hola Crow! Necesito un repuesto para camión. ¿Tienen?",
  },
  {
    label: "Motos",
    desc: "Transmisión, frenos y mantenimiento.",
    icon: "settings",
    waMsg: "Hola Crow! Necesito un repuesto para moto (transmisión/frenos/mantenimiento). ¿Me asesorás?",
  },
  {
    label: "Lubricantes",
    desc: "Aceites sintéticos y minerales.",
    icon: "box",
    waMsg: "Hola Crow! Quiero consultar sobre aceites y lubricantes para mi vehículo. ¿Qué me recomendás?",
  },
  {
    label: "Baterías",
    desc: "Energía confiable para todo arranque.",
    icon: "trendingUp",
    waMsg: "Hola Crow! Necesito una batería nueva. ¿Me podés asesorar sobre cuál me conviene según mi vehículo?",
  },
  {
    label: "Filtros",
    desc: "Aceite, aire, combustible y cabina.",
    icon: "inventory",
    waMsg: "Hola Crow! Busco filtros (aceite / aire / combustible / cabina). ¿Tienen para mi vehículo?",
  },
  {
    label: "Detailing",
    desc: "Lavado y cuidado profesional.",
    icon: "star",
    waMsg: "Hola Crow! Quiero productos de detailing para cuidar mi auto. ¿Qué tienen disponible?",
  },
  {
    label: "Accesorios",
    desc: "Confort, seguridad y equipamiento.",
    icon: "products",
    waMsg: "Hola Crow! Estoy buscando accesorios para mi vehículo. ¿Me muestran qué tienen?",
  },
];

export const VEHICLE_TYPES = ["Todos", "Autos", "Camiones", "Motos", "Universal"] as const;
