/**
 * Diccionario de sinónimos para mapear etiquetas del bloc de notas a columnas del Excel.
 * La clave es el término normalizado que esperamos encontrar en el Excel (o una aproximación).
 */
const SYNONYMS: Record<string, string[]> = {
  'VENDEDOR': ['ejecutivo', 'vendedor', 'asesor', 'atendio'],
  'TELEFONO': ['numero', 'dn', 'telefono', 'movil', 'celular', 'linea', 'número'],
  'NIP': ['nip', 'codigo'],
  'FECHA VENTA': ['f.v', 'fecha de venta', 'fecha venta'],
  'CURP': ['curp', 'identificacion'],
  'NOMBRE': ['nombres', 'nombre', 'cliente'],
  'APELLIDO PATERNO': ['primer apellido', 'apellido paterno', 'apellido1'],
  'APELLIDO MATERNO': ['segundo apellido', 'apellido materno', 'apellido2'],
  'MODELO': ['modelo', 'equipo', 'terminal', 'equipo:'], // Añadimos : para ser más específicos
  'COLOR': ['color', 'tono'],
  'CANTIDAD': ['cuotas', 'pagos', 'meses'],
  'PRECIO': ['pago x mes', 'monto', 'costo', 'pago mensual'],
  'CAC': ['cac', 'punto de venta', 'tienda'],
  'DIRECCIÓN': ['calle', 'direccion'],
  'COLONIA': ['colonia'],
  'CP': ['c.p', 'cp', 'codigo postal'],
  'CIUDAD': ['ciudad', 'municipio'],
  'ESTADO': ['estado', 'entidad'],
  'COMENTARIOS': ['lunes a viernes', 'horarios', 'observaciones', 'para el martes', 'para el jueves'],
  'FECHA DE PRIMER PAGO DEL EQUIPO': ['fecha primer pago', 'fecha pago', 'primer pago del equipo']
}

/**
 * Lista de términos que el sistema debe ignorar explícitamente y no mapear a ningún campo.
 */
const IGNORE_LIST = [
  'folio',
  'vigencia del nip',
  'fecha de nacimiento',
  'nacionalidad',
  'entidad de nacimiento',
  'lunes a viernes',
  'sábados',
  'para el',
  'horario',
  '(numero)',
  '(dn)'
]

/**
 * Normaliza un string para comparaciones (minúsculas, sin acentos, sin espacios extras)
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Analiza un bloque de texto y extrae datos basados en un conjunto de cabeceras.
 */
export function parseNotepadText(text: string, headers: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  if (!text) return result

  // 1. Dividir el texto en líneas y limpiar
  const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '')

  // 2. Normalizar las cabeceras disponibles para facilitar la búsqueda
  const normalizedHeaders = headers.map(h => ({
    original: h,
    norm: normalize(h)
  }))

  // 3. Procesar cada línea buscando pares Clave: Valor
  lines.forEach(line => {
    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) return // Solo procesar líneas con ":" para mayor precisión

    const rawKey = line.substring(0, separatorIndex)
    const keyPart = normalize(rawKey)
    const valuePart = line.substring(separatorIndex + 1).trim()

    if (!valuePart || !keyPart) return

    // 0. Verificar si está en la lista de ignorados
    if (IGNORE_LIST.some(ignore => keyPart.includes(normalize(ignore)))) return

    // 4. Buscar coincidencia exacta o por sinónimos
    let matchedHeader: string | null = null

    // A. Primero intentar coincidencia por Sinónimos (Alta confianza)
    for (const [headerKey, synonyms] of Object.entries(SYNONYMS)) {
      if (keyPart === normalize(headerKey) || synonyms.some(s => keyPart === normalize(s))) {
        // Encontrar cuál de las cabeceras reales del Excel se parece más a este headerKey
        const match = normalizedHeaders.find(nh => nh.norm.includes(normalize(headerKey)) || normalize(headerKey).includes(nh.norm))
        if (match) {
          matchedHeader = match.original
          break
        }
      }
    }

    // B. Si no hubo coincidencia por sinónimo, intentar coincidencia directa con las cabeceras del Excel
    if (!matchedHeader) {
      const directMatch = normalizedHeaders.find(nh => nh.norm === keyPart)
      if (directMatch) {
        matchedHeader = directMatch.original
      }
    }

    // 5. Aplicar el valor si encontramos un destino
    if (matchedHeader) {
      let finalValue = valuePart
      const normHeader = normalize(matchedHeader)

      // Limpiezas específicas
      if (normHeader.includes('tel') || normHeader.includes('num') || normHeader.includes('dn')) {
        finalValue = valuePart.replace(/\D/g, '').substring(0, 10)
      }

      result[matchedHeader] = finalValue
    }
  })

  return result
}
