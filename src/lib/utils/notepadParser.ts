/**
 * Diccionario de sinónimos para mapear etiquetas del bloc de notas a columnas del Excel.
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
  'FECHA DE PRIMER PAGO DEL EQUIPO': ['fecha primer pago', 'fecha pago', 'primer pago del equipo', 'primer pago'],
  'FUNDA': ['funda', 'case'],
  'PROTECTOR DE PANTALLA': ['mica', 'protector', 'templado'],
  'COLOR AUDIFONOS': ['audifonos', 'auriculares', 'audifono'],
  'ESTATUS DE FINANCIAMIENTO': ['financiamiento', 'tipo de credito', 'estatus financiamiento']
}

/**
 * Campos que NUNCA deben ser sobreescritos por el bloc de notas (Campos calculados o protegidos)
 */
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

function isKnownLabel(text: string): boolean {
  const norm = normalize(text)
  for (const synonyms of Object.values(SYNONYMS)) {
    if (synonyms.some(s => norm === normalize(s) || norm.startsWith(normalize(s) + ':'))) return true
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

    if (!valuePart && i + 1 < lines.length) {
      const nextLine = lines[i + 1]
      if (!isKnownLabel(nextLine)) {
        valuePart = nextLine
        i++
      }
    }

    if (!valuePart) continue

    for (const [headerKey, synonyms] of Object.entries(SYNONYMS)) {
      const headerKeyNorm = normalize(headerKey)
      
      // Protección contra colisiones
      if (headerKey === 'MODELO' && (keyPart.includes('fecha') || keyPart.includes('pago'))) continue
      if (headerKey === 'PRECIO' && keyPart.includes('fecha')) continue

      const isMatch = synonyms.some(s => {
        const sn = normalize(s)
        return keyPart === sn || keyPart.includes(sn) || sn.includes(keyPart)
      })

      if (isMatch) {
         // Encontrar la cabecera real
         const match = normalizedHeaders.find(nh => {
           const nhn = nh.norm
           // Si el nombre del Excel es exactamente igual al sinónimo o a la clave
           if (nhn === headerKeyNorm) return true
           // Si el sinónimo está contenido de forma prominente
           return synonyms.some(s => nhn === normalize(s) || nhn.includes(normalize(s)))
         })

         if (match && !PROTECTED_FIELDS.map(f => normalize(f)).includes(match.norm)) {
           if (!result[match.original]) {
             let finalValue = valuePart
             
             if (headerKey === 'TELEFONO') {
               const digits = valuePart.replace(/\D/g, '')
               finalValue = digits.substring(0, 10)
             }

             result[match.original] = finalValue
             break
           }
         }
      }
    }
  }

  return result
}
