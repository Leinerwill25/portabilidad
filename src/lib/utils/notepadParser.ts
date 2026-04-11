/**
 * DICCIONARIO DE SINÓNIMOS INTEGRADO
 */
const SYNONYMS: Record<string, string[]> = {
  'VENDEDOR': ['ejecutivo', 'vendedor', 'asesor', 'atendio'],
  'TELEFONO': ['numero', 'dn', 'telefono', 'movil', 'celular', 'linea', 'número'],
  'NIP': ['nip', 'codigo'],
  'FECHA VENTA': ['f.v', 'fecha de venta', 'fecha venta'],
  'CURP': ['curp', 'identificacion'],
  'NOMBRE': ['nombres', 'nombre', 'cliente', 'nombre(s)'],
  'APELLIDO PATERNO': ['primer apellido', 'apellido paterno', 'apellido1'],
  'APELLIDO MATERNO': ['segundo apellido', 'apellido materno', 'apellido2'],
  'MODELO': ['modelo', 'equipo', 'terminal', 'modelo:'],
  'COLOR': ['color', 'tono'],
  'CANTIDAD': ['cuotas', 'pagos', 'meses', 'cuotas:'],
  'PRECIO': ['pago x mes', 'monto', 'costo', 'precio', 'pago mensual'],
  'CAC': ['cac', 'punto de venta', 'tienda'],
  'DIRECCIÓN': ['calle', 'direccion'],
  'COLONIA': ['colonia'],
  'CP': ['c.p', 'cp', 'codigo postal'],
  'CIUDAD': ['ciudad', 'municipio'],
  'ESTADO': ['estado', 'entidad'],
  'COMENTARIOS': ['lunes a viernes', 'horarios', 'observaciones', 'para el martes', 'para el jueves'],
  'FECHA DE PRIMER PAGO DEL EQUIPO': ['fecha primer pago', 'fecha pago', 'primer pago del equipo', 'primer pago', 'fecha de primer pago'],
  'FUNDA': ['funda', 'case'],
  'PROTECTOR DE PANTALLA': ['mica', 'protector', 'templado', 'protector de pantalla'],
  'COLOR AUDIFONOS': ['audifonos', 'auriculares', 'audifono'],
  'ESTATUS DE FINANCIAMIENTO': ['financiamiento', 'tipo de credito', 'estatus financiamiento', 'credito'],
  'TIPO DE CREDITO': ['financiamiento', 'tipo de credito', 'estatus financiamiento', 'credito']
}

const PROTECTED_FIELDS = [
  'MES',
  'SEMANA',
  'DIA DE LA VENTA',
  'FECHA',
  'DIA FVC',
  'SEMANA FVC',
  'FECHA ALTA',
  'SEMANA ALTA'
]

const IGNORE_LIST = ['folio', 'vigencia', 'nacimiento', 'nacionalidad', 'entidad']

function normalize(str: string): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Verifica si una línea es una etiqueta conocida
 */
function isKnownLabel(text: string): boolean {
  const norm = normalize(text.split(':')[0])
  for (const synonyms of Object.values(SYNONYMS)) {
    if (synonyms.some(s => {
      const sn = normalize(s)
      return norm === sn || norm.includes(sn)
    })) return true
  }
  return false
}

export function parseNotepadText(text: string, headers: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  if (!text) return result

  const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '')
  const normalizedHeaders = headers.map(h => ({
    original: h,
    norm: normalize(h)
  }))

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let keyPart = ''
    let valuePart = ''

    const colonIdx = line.indexOf(':')
    if (colonIdx !== -1) {
      keyPart = normalize(line.substring(0, colonIdx))
      valuePart = line.substring(colonIdx + 1).trim()
    } else {
      keyPart = normalize(line)
    }

    if (!keyPart) continue
    if (IGNORE_LIST.some(ignore => keyPart.includes(normalize(ignore)))) continue

    // Lookahead para campos multilínea
    if (!valuePart && i + 1 < lines.length) {
      const nextLine = lines[i + 1]
      if (!isKnownLabel(nextLine) && nextLine.length > 0) {
        valuePart = nextLine
        i++
      }
    }

    if (!valuePart) continue

    // ASIGNACIÓN PRIORIZADA
    let matchedHeader: string | null = null

    // 1. Intentar match directo con etiquetas del Excel (Máxima prioridad)
    const directMatch = normalizedHeaders.find(nh => nh.norm === keyPart || keyPart.includes(nh.norm))
    if (directMatch && !PROTECTED_FIELDS.map(f => normalize(f)).includes(directMatch.norm)) {
      matchedHeader = directMatch.original
    }

    // 2. Intentar match por sinónimos
    if (!matchedHeader) {
      for (const [canonKey, synonyms] of Object.entries(SYNONYMS)) {
        // Protección contra colisiones
        if (canonKey === 'MODELO' && (keyPart.includes('fecha') || keyPart.includes('pago'))) continue
        
        if (synonyms.some(s => keyPart === normalize(s) || keyPart.includes(normalize(s)))) {
          // Si el sinónimo matchea, buscar la cabecera del Excel que se relacione con canonKey
          const headerMatch = normalizedHeaders.find(nh => {
             const nhn = nh.norm
             return nhn === normalize(canonKey) || synonyms.some(s => nhn === normalize(s) || nhn.includes(normalize(s)))
          })

          if (headerMatch && !PROTECTED_FIELDS.map(f => normalize(f)).includes(headerMatch.norm)) {
            matchedHeader = headerMatch.original
            break
          }
        }
      }
    }

    if (matchedHeader && !result[matchedHeader]) {
       let finalValue = valuePart
       if (normalize(matchedHeader).includes('telefono') || normalize(matchedHeader).includes('dn')) {
         finalValue = valuePart.replace(/\D/g, '').substring(0, 10)
       }
       result[matchedHeader] = finalValue
    }
  }

  return result
}
