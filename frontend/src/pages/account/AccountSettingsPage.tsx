import type * as React from "react";
import { useState, type FormEvent } from "react";
import { Card, Field, Input, Button } from "@/shared/ui";
import { userApi } from "@/entities/user";
import { apiError } from "@/shared/api/client";
import { color, font } from "@/shared/config/theme";

export function AccountSettingsPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await userApi.changePassword(current, next);
      setStatus({ kind: "ok", msg: "Contraseña actualizada." });
      setCurrent("");
      setNext("");
    } catch (err) {
      setStatus({ kind: "err", msg: apiError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 style={{ fontFamily: font.display, fontSize: 26, fontWeight: 800, color: color.ink900 }}>Configuración</h1>
      <Card>
        <div style={{ fontFamily: font.display, fontSize: 17, fontWeight: 700, color: color.ink900, marginBottom: 16 }}>Cambiar contraseña</div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 440 }}>
          <Field label="Contraseña actual">
            <Input type="password" required value={current} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrent(e.target.value)} />
          </Field>
          <Field label="Nueva contraseña">
            <Input type="password" required minLength={6} value={next} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNext(e.target.value)} />
          </Field>
          {status && <div style={{ fontFamily: font.body, fontSize: 13, color: status.kind === "ok" ? color.success : color.danger }}>{status.msg}</div>}
          <div>
            <Button type="submit" disabled={loading}>{loading ? "Guardando…" : "Actualizar contraseña"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
