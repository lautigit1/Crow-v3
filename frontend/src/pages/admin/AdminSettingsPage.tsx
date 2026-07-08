import type * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import clsx from "clsx";
import { Card, Field, Input, Button, CenteredSpinner } from "@/shared/ui";
import { AdminHeader } from "./ui/AdminHeader";
import { settingsApi, type SiteSettings } from "@/entities/settings";
import { apiError } from "@/shared/api/client";

export function AdminSettingsPage() {
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    settingsApi.get().then(setForm).catch(() => setStatus({ kind: "err", msg: "No se pudo cargar la configuración." }));
  }, []);

  const set = (key: keyof SiteSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => (f ? { ...f, [key]: e.target.value } : f));
    setStatus(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setStatus(null);
    try {
      const updated = await settingsApi.update(form);
      setForm(updated);
      setStatus({ kind: "ok", msg: "Configuración guardada." });
    } catch (err) {
      setStatus({ kind: "err", msg: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminHeader title="Configuración" icon="settings" subtitle="Datos de contacto y redes del sitio (se aplican en todo el sitio)." />
      {!form ? (
        <CenteredSpinner label="Cargando configuración…" />
      ) : (
        <Card style={{ maxWidth: 640 }}>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Nombre de la empresa"><Input value={form.company_name} onChange={set("company_name")} /></Field>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Teléfono (visible)"><Input value={form.phone_display} onChange={set("phone_display")} /></Field>
              <Field label="WhatsApp (solo números)"><Input value={form.whatsapp_number} onChange={set("whatsapp_number")} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} /></Field>
              <Field label="Horario"><Input value={form.hours} onChange={set("hours")} /></Field>
            </div>
            <Field label="Dirección / ubicación"><Input value={form.address} onChange={set("address")} /></Field>
            <div className="grid grid-cols-3 gap-3.5">
              <Field label="Instagram"><Input value={form.instagram} onChange={set("instagram")} /></Field>
              <Field label="Facebook"><Input value={form.facebook} onChange={set("facebook")} /></Field>
              <Field label="TikTok"><Input value={form.tiktok} onChange={set("tiktok")} /></Field>
            </div>
            {status && <div className={clsx("font-body text-[13px]", status.kind === "ok" ? "text-success" : "text-danger")}>{status.msg}</div>}
            <div>
              <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar configuración"}</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
