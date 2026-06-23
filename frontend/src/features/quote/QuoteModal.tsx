import type * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import { Modal, Field, Input, Textarea, Button } from "@/shared/ui";
import { useAuth } from "@/app/providers/AuthProvider";
import { quoteApi } from "@/entities/quote";
import { apiError } from "@/shared/api/client";
import { waLink } from "@/shared/config/contact";
import { color, font } from "@/shared/config/theme";

type QuoteModalProps = {
  open: boolean;
  onClose: () => void;
  /** Pre-fill the message (e.g. a specific product). */
  initialMessage?: string;
  productId?: number | null;
};

export function QuoteModal({ open, onClose, initialMessage = "", productId = null }: QuoteModalProps) {
  const { user } = useAuth();
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
        vehicle: vehicle || null,
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
    <Modal open={open} onClose={onClose} eyebrow="SOLICITAR COTIZACIÓN" title="Cuéntanos qué necesitas">
      {done ? (
        <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
          <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 800, color: color.ink900, marginBottom: 8 }}>
            ¡Cotización enviada!
          </div>
          <p style={{ fontFamily: font.body, fontSize: 14.5, lineHeight: 1.6, color: color.textMuted, marginBottom: 20 }}>
            Un asesor revisará tu solicitud y te responderá a la brevedad. También puedes acelerar la respuesta por WhatsApp.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Button as="a" href={waLink(whatsappText)} target="_blank" rel="noreferrer" variant="whatsapp">
              Continuar por WhatsApp
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Nombre">
            <Input required value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Tu nombre" />
          </Field>
          <Field label="Email (opcional)">
            <Input type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          </Field>
          <Field label="Vehículo (marca · modelo · año)">
            <Input value={vehicle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVehicle(e.target.value)} placeholder="Ej. Toyota Hilux 2019" />
          </Field>
          <Field label="Qué necesitas">
            <Textarea required rows={3} value={message} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)} placeholder="Repuesto, producto o referencia que buscas" />
          </Field>
          {error && <div style={{ fontFamily: font.body, fontSize: 13, color: color.danger }}>{error}</div>}
          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? "Enviando…" : "Enviar cotización"}
          </Button>
        </form>
      )}
    </Modal>
  );
}
