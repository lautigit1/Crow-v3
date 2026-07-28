"""Extracción de líneas desde facturas en PDF, sin IA.

`pdfplumber` reconstruye las tablas de un PDF a partir de sus líneas de
dibujo y la posición del texto. Es determinístico: no cuesta plata, no
necesita clave de API, y el archivo **no sale del servidor**.

Alcance real, dicho sin vueltas:

  - Funciona con PDF **digitales** (los que tienen texto seleccionable) y una
    tabla con estructura reconocible. Es el caso más común de una factura
    emitida por un sistema.
  - **No funciona con escaneados ni fotos**: no hay texto que extraer. Esos
    siguen por la carga manual con el documento al lado, que es la decisión
    tomada en design.md (montar OCR no compensa al volumen de este negocio).
  - Puede fallar con maquetas raras. Cuando pasa, devuelve una lista vacía y
    el lote queda para cargar a mano: nunca un error duro.

En los tres casos el resultado pasa por la misma pantalla de revisión y el
mismo control cruzado contra el total de la factura. La extracción automática
no relaja ninguna verificación -- solo ahorra tipeo.
"""

from io import BytesIO

from app.core.excel_import import FilaCruda, detectar_encabezados, mapear_filas, sugerir_mapeo


def tiene_capa_de_texto(contenido: bytes) -> bool:
    """¿Es un PDF digital o un escaneo?

    Un escaneo es una imagen adentro de un PDF: se ve texto pero no lo hay.
    Distinguirlo de entrada evita prometerle al usuario una extracción que no
    va a poder hacerse.
    """
    try:
        import pdfplumber
    except ImportError:  # pragma: no cover - la dependencia está en requirements
        return False

    try:
        with pdfplumber.open(BytesIO(contenido)) as pdf:
            for pagina in pdf.pages[:3]:
                if (pagina.extract_text() or "").strip():
                    return True
    except Exception:
        return False
    return False


def extraer_filas(contenido: bytes) -> list[FilaCruda]:
    """Devuelve las líneas de la factura, o una lista vacía si no se pudo.

    Nunca lanza: cualquier problema se traduce en "no se extrajo nada" y el
    lote se carga a mano. Un PDF con una maqueta inesperada es un caso
    esperable, no una falla del sistema.
    """
    try:
        import pdfplumber
    except ImportError:  # pragma: no cover
        return []

    try:
        with pdfplumber.open(BytesIO(contenido)) as pdf:
            tablas: list[list[list[str | None]]] = []
            for pagina in pdf.pages:
                tablas.extend(pagina.extract_tables() or [])
    except Exception:
        return []

    if not tablas:
        return []

    # Las facturas de más de una página repiten el encabezado en cada tabla.
    # Se toma el de la primera que tenga uno reconocible y después se
    # concatenan todas las filas de datos: si se procesara cada tabla por
    # separado, las páginas 2 en adelante se perderían cuando el encabezado
    # no se repite.
    encabezados: list[str] | None = None
    mapeo: dict[str, str] = {}
    filas: list[list[str | None]] = []

    for tabla in tablas:
        limpia = [[(c or "").strip() for c in fila] for fila in tabla if fila]
        if not limpia:
            continue

        if encabezados is None:
            try:
                indice, encontrados = detectar_encabezados(limpia)
            except Exception:
                continue
            sugerido = sugerir_mapeo(encontrados)
            # Sin al menos código, descripción y cantidad no hay nada que
            # hacer con estas filas: se sigue buscando en las otras tablas.
            if not all(k in sugerido for k in ("sku", "name", "quantity")):
                continue
            encabezados, mapeo = encontrados, sugerido
            filas.extend(limpia[indice + 1:])
        else:
            # Tabla siguiente: si su primera fila es otro encabezado repetido,
            # se saltea; si no, son datos.
            try:
                indice, _ = detectar_encabezados(limpia)
                filas.extend(limpia[indice + 1:])
            except Exception:
                filas.extend(limpia)

    if encabezados is None or not filas:
        return []

    try:
        # `offset=0`: en un PDF no hay número de fila de planilla al que
        # referirse, así que los correlativos que salen de acá son solo un
        # orden interno.
        return mapear_filas(encabezados, filas, 0, mapeo)
    except Exception:
        return []
