import type * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import { Modal, Field, Input, Textarea, Button } from "@/shared/ui";
import { useAuth } from "@/entities/session";
import { quoteApi } from "@/entities/quote";
import { apiError } from "@/shared/api";
import { useWaLink } from "@/entities/settings/useSiteSettings";

type QuoteModalProps = {
  open: boolean;
  onClose: () => void;
  /** Pre-fill the message (e.g. a specific product). */
  initialMessage?: string;
  productId?: number | null;
};

export function QuoteModal({ open, onClose, initialMessage = "", productId = null }: QuoteModalProps) {
  const { user } = useAuth();
  const waLink = useWaLink();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setName(user?.full_name ?? "");
      setEmail(user?.email ?? "");
      setVehicle("");
      setMessage(initialMessage);
      setError("");
      setDone(false);
    }
  }, [open, initialMessage, user]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        customer_name: name,
        customer_email: email || null,
        // Ya no puede viajar en null: el backend lo rechaza con un 422.
        vehicle: vehicle.trim(),
        message,
        product_id: productId,
      };
      if (user) await quoteApi.createMine(payload);
      else await quoteApi.create(payload);
      setDone(true);
    } catch (err) {
      setError(apiError(err, "No pudimos registrar tu cotización."));
    } finally {
      setLoading(false);
    }
  };

  const whatsappText = `Hola Crow Repuestos, soy ${name || "un cliente"}. Vehículo: ${vehicle || "—"}. Necesito: ${message}`;

  return (
    // El resto del sitio le habla de "vos" al cliente; este formulario era el
    // único que había quedado en "tú". Mezclar los dos tratamientos en una
    // misma sesión se nota, y en Argentina el "tú" suena a traducción.
    <Modal open={open} onClose={onClose} eyebrow="SOLICITAR COTIZACIÓN" title="Contanos qué necesitás">
      {done ? (
        <div className="text-center pt-2.5 px-0 pb-1.5">
          <div className="font-display text-[20px] font-extrabold text-ink900 mb-2">¡Cotización enviada!</div>
          <p className="font-body text-[14.5px] leading-[1.6] text-textMuted mb-5">
            Revisamos tu solicitud y te respondemos a la brevedad. También podés acelerar la respuesta por WhatsApp.
          </p>
          <div className="flex gap-2.5 justify-center">
            <Button as="a" href={waLink(whatsappText)} target="_blank" rel="noreferrer" variant="whatsapp">
              Continuar por WhatsApp
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Nombre">
            <Input required value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Tu nombre" />
          </Field>
          <Field label="Email (opcional)">
            <Input type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          </Field>
          {/* Obligatorio: un repuesto no existe en abstracto, existe para un
              auto. Sin este dato la respuesta arranca con un ida y vuelta por
              WhatsApp preguntando lo que el formulario podía haber pedido. */}
          <Field label="Vehículo (marca · modelo · año) *" hint="Nos sirve para buscar el repuesto exacto.">
            <Input required value={vehicle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVehicle(e.target.value)} placeholder="Ej. Toyota Hilux 2019" />
          </Field>
          <Field label="Qué necesitás">
            <Textarea required rows={3} value={message} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)} placeholder="Repuesto, producto o referencia que buscás" />
          </Field>
          {error && <div className="font-body text-[13px] text-danger">{error}</div>}
          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? "Enviando…" : "Enviar cotización"}
          </Button>
        </form>
      )}
    </Modal>
  );
}
