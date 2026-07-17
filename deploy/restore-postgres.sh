#!/usr/bin/env bash
#
# Restaura un backup generado por backup-postgres.sh. Script separado (en
# vez de solo documentar el comando en DEPLOY.md) a propósito: en un
# incidente real, escribir a mano un pipe de `gunzip | psql` bajo presión
# es exactamente el tipo de situación donde un typo hace más daño.
#
# Uso:
#   ./restore-postgres.sh backups/crow-repuestos-20260713-030000.sql.gz
#
# ADVERTENCIA: esto sobreescribe la base de datos actual. Pide confirmación
# explícita antes de ejecutar nada.
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-crow_db}"
POSTGRES_USER="${POSTGRES_USER:-crow}"
POSTGRES_DB="${POSTGRES_DB:-crow_repuestos}"

if [ $# -ne 1 ]; then
    echo "Uso: $0 <archivo-backup.sql.gz>" >&2
    exit 1
fi

backup_file="$1"

if [ ! -f "$backup_file" ]; then
    echo "ERROR: no existe el archivo '$backup_file'." >&2
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    echo "ERROR: el contenedor '$CONTAINER' no está corriendo." >&2
    exit 1
fi

echo "Esto va a SOBREESCRIBIR la base '${POSTGRES_DB}' en el contenedor '${CONTAINER}'"
echo "con el contenido de: ${backup_file}"
read -r -p "Escribí 'restaurar' para confirmar: " confirm
if [ "$confirm" != "restaurar" ]; then
    echo "Cancelado."
    exit 1
fi

echo "[$(date -u +%FT%TZ)] Restaurando..."
gunzip -c "$backup_file" | docker exec -i "$CONTAINER" psql -U "$POSTGRES_USER" "$POSTGRES_DB"
echo "[$(date -u +%FT%TZ)] Restauración completa."
