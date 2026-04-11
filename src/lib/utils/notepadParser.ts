/**
 * Diccionario de sinónimos para mapear etiquetas del bloc de notas a columnas del Excel.
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
  'MODELO': ['modelo', 'equipo', 'terminal'],
  'COLOR': ['color', 'tono'],
  'CANTIDAD': ['cuotas', 'pagos', 'meses'],
  'PRECIO': ['pago x mes', 'monto', 'costo', 'precio'],
  'CAC': ['cac', 'punto de venta', 'tienda'],
  'DIRECCIÓN': ['calle', 'direccion'],
  'COLONIA': ['colonia'],
  'CP': ['c.p', 'cp', 'codigo postal'],
  'CIUDAD': ['ciudad', 'municipio'],
  'ESTADO': ['estado', 'entidad'],
  'COMENTARIOS': ['lunes a viernes', 'horarios', 'observaciones', 'para el martes', 'para el jueves'],
  'FECHA DE PRIMER PAGO DEL EQUIPO': ['fecha primer pago', 'fecha pago', 'primer pago del equipo']
}

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

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Verifica si una línea es una etiqueta conocida (para evitar que el lookahead consuma otra etiqueta)
 */
function isKnownLabel(text: string): boolean {
  const norm = normalize(text)
  for (const synonyms of Object.values(SYNONYMS)) {
    if (synonyms.some(s => norm.includes(normalize(s)))) return true
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

    const separatorIndex = line.indexOf(':')
    if (separatorIndex !== -1) {
      keyPart = normalize(line.substring(0, separatorIndex))
      valuePart = line.substring(separatorIndex + 1).trim()
    } else {
      keyPart = normalize(line)
    }

    if (!keyPart) continue
    if (IGNORE_LIST.some(ignore => keyPart.includes(normalize(ignore)))) continue

    // Lógica Multilínea: Si no hay valor y la siguiente línea NO es una etiqueta, consumirla como valor
    if (!valuePart && i + 1 < lines.length) {
      const nextLine = lines[i + 1]
      if (!isKnownLabel(nextLine)) {
        valuePart = nextLine
        i++ // Saltamos la siguiente línea ya que la consumimos
      }
    }

    if (!valuePart) continue

    // Buscar coincidencia en diccionario de sinónimos
    for (const [headerKey, synonyms] of Object.entries(SYNONYMS)) {
      const headerNorm = normalize(headerKey)
      
      // Protección especial: "Equipo" no debe capturar "Fecha de pago del equipo"
      if (headerKey === 'MODELO' && keyPart.includes('fecha')) continue
      if (headerKey === 'PRECIO' && keyPart.includes('fecha')) continue

      const isMatch = synonyms.some(s => {
        const sn = normalize(s)
        // Coincidencia inteligente: si la etiqueta del bloc de notas CONTIENE el sinónimo
        // o viceversa, pero con un mínimo de relevancia.
        return keyPart.includes(sn) || sn.includes(keyPart)
      })

      if (isMatch) {
        // Encontrar la cabecera real del Excel que corresponde
        const match = normalizedHeaders.find(nh => 
          nh.norm.includes(headerNorm) || headerNorm.includes(nh.norm) || 
          synonyms.some(s => nh.norm.includes(normalize(s)))
        )

        if (match && !result[match.original]) {
          let finalValue = valuePart
          
          // Limpiezas específicas
          if (headerKey === 'TELEFONO') {
            // Extraer solo los primeros 10 dígitos (ignora folios o texto extra)
            const digits = valuePart.replace(/\D/g, '')
            finalValue = digits.substring(0, 10)
          }

          result[match.original] = finalValue
          break 
        }
      }
    }
  }

  return result
}
