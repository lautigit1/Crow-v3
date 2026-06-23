import type * as React from "react";
import { useState, type FormEvent } from "react";
import { Card, Field, Input, Button } from "@/shared/ui";
import { useAuth } from "@/app/providers/AuthProvider";
import { userApi } from "@/entities/user";
import { apiError } from "@/shared/api/client";
import { color, font } from "@/shared/config/theme";
import { formatDate } from "@/shared/lib/format";

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const updated = await userApi.updateProfile({ full_name: fullName, phone: phone || null });
      setUser(updated);
      setStatus({ kind: "ok", msg: "Perfil actualizado." });
    } catch (err) {
      setStatus({ kind: "err", msg: apiError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 style={{ fontFamily: font.display, fontSize: 26, fontWeight: 800, color: color.ink900 }}>Mi perfil</h1>

      <Card>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 440 }}>
          <Field label="Nombre completo">
            <Input value={fullName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={user?.email ?? ""} disabled style={{ background: color.surface, color: color.textFaint }} />
          </Field>
          <Field label="Teléfono">
            <Input value={phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)} placeholder="+57 300 000 0000" />
          </Field>
          {status && <div style={{ fontFamily: font.body, fontSize: 13, color: status.kind === "ok" ? color.success : color.danger }}>{status.msg}</div>}
          <div>
            <Button type="submit" disabled={loading}>{loading ? "Guardando…" : "Guardar cambios"}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <div style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint, marginBottom: 6 }}>MIEMBRO DESDE</div>
        <div style={{ fontFamily: font.body, fontSize: 15, color: color.ink900 }}>{user ? formatDate(user.created_at) : "—"}</div>
      </Card>
    </div>
  );
}
