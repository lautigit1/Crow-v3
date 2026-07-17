#!/usr/bin/env bash
#
# Backup automatizado de Postgres para el stack de producción de Crow
# Repuestos. Hallazgo crítico de la auditoría técnica del 2026-07-13: la
# única "estrategia de backup" documentada era un comando manual en
# DEPLOY.md (`docker exec crow_db pg_dump ...`) que nadie corría de forma
# automática -- sin backups reales, cualquier incidente de disco/corrupción
# de datos era pérdida total e irreversible.
#
# Qué hace:
#   1. pg_dump dentro del contenedor crow_db (no necesita psql en el host).
#   2. Comprime con gzip y nombra el archivo con fecha+hora UTC.
#   3. Guarda en $BACKUP_DIR (default: ./backups, relativo a este script).
#   4. Borra backups más viejos que $RETENTION_DAYS (default: 14).
#
# Uso manual:
#   ./backup-postgres.sh
#
# Uso automatizado (cron, corriendo como el usuario que puede hablar con
# Docker) -- ejemplo: todos los días a las 3am:
#   0 3 * * * /ruta/al/repo/deploy/backup-postgres.sh >> /var/log/crow-backup.log 2>&1
#
# IMPORTANTE -- esto NO reemplaza un backup offsite. Un backup que vive en
# el mismo disco/servidor que la base de datos no protege contra la pérdida
# del servidor completo (falla de disco, hackeo, error humano con `rm -rf`).
# Complementar con una copia periódica a almacenamiento externo, por ejemplo
# con `rclone` o `aws s3 cp` corriendo después de este script.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
CONTAINER="${POSTGRES_CONTAINER:-crow_db}"
POSTGRES_USER="${POSTGRES_USER:-crow}"
POSTGRES_DB="${POSTGRES_DB:-crow_repuestos}"

mkdir -p "$BACKUP_DIR"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    echo "ERROR: el contenedor '$CONTAINER' no está corriendo (¿stack levantado?)." >&2
    exit 1
fi

timestamp="$(date -u +%Y%m%d-%H%M%S)"
out_file="$BACKUP_DIR/crow-repuestos-${timestamp}.sql.gz"
tmp_file="${out_file}.partial"

echo "[$(date -u +%FT%TZ)] Iniciando backup de ${POSTGRES_DB} -> ${out_file}"

# Volcado a un archivo temporal primero -- si pg_dump falla a mitad de
# camino, no queremos un .sql.gz corrupto ocupando el nombre final ni
# contando para la retención.
if docker exec "$CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$tmp_file"; then
    mv "$tmp_file" "$out_file"
    size="$(du -h "$out_file" | cut -f1)"
    echo "[$(date -u +%FT%TZ)] Backup OK (${size}): ${out_file}"
else
    echo "ERROR: pg_dump falló -- revisá 'docker logs ${CONTAINER}'." >&2
    rm -f "$tmp_file"
    exit 1
fi

# Retención -- borra backups más viejos que RETENTION_DAYS.
deleted=0
while IFS= read -r -d '' old_file; do
    rm -f "$old_file"
    deleted=$((deleted + 1))
done < <(find "$BACKUP_DIR" -maxdepth 1 -name 'crow-repuestos-*.sql.gz' -mtime "+${RETENTION_DAYS}" -print0)

if [ "$deleted" -gt 0 ]; then
    echo "[$(date -u +%FT%TZ)] Retención: borrados ${deleted} backup(s) de más de ${RETENTION_DAYS} días."
fi

echo "[$(date -u +%FT%TZ)] Listo."
