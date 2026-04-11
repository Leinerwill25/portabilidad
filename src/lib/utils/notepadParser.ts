/**
 * Diccionario de sinónimos para mapear etiquetas del bloc de notas a columnas del Excel.
 * La clave es el término normalizado del Excel, el valor es una lista de términos que pueden aparecer en el bloc de notas.
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
  'PRECIO': ['pago x mes', 'monto', 'costo'],
  'CAC': ['cac', 'punto de venta', 'tienda'],
  'DIRECCIÓN': ['calle', 'direccion'],
  'COLONIA': ['colonia'],
  'CP': ['c.p', 'cp', 'codigo postal'],
  'CIUDAD': ['ciudad', 'municipio'],
  'ESTADO': ['estado', 'entidad'],
  'COMENTARIOS': ['lunes a viernes', 'horarios', 'observaciones', 'para el martes', 'para el jueves'],
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

  // 3. Procesar cada línea buscando pares Clave: Valor o palabras clave
  lines.forEach(line => {
    // Intentar dividir por ":" o simplemente buscar palabras clave
    const separatorIndex = line.indexOf(':')
    let keyPart = ''
    let valuePart = ''

    if (separatorIndex !== -1) {
      keyPart = normalize(line.substring(0, separatorIndex))
      valuePart = line.substring(separatorIndex + 1).trim()
    } else {
      keyPart = normalize(line)
    }

    if (!valuePart && !keyPart) return

    // 0. Verificar si está en la lista de ignorados
    const shouldIgnore = IGNORE_LIST.some(ignore => keyPart.includes(normalize(ignore)))
    if (shouldIgnore) return

    // 4. Buscar coincidencia en el diccionario de sinónimos
    for (const [headerNorm, synonyms] of Object.entries(SYNONYMS)) {
      const isMatch = keyPart === headerNorm || synonyms.some(s => keyPart.includes(normalize(s)))
      
      if (isMatch) {
         // Encontrar la cabecera original que corresponde a esta norma
         const match = normalizedHeaders.find(nh => nh.norm.includes(headerNorm) || headerNorm.includes(nh.norm) || synonyms.some(s => nh.norm.includes(normalize(s))))
         if (match && valuePart) {
           let finalValue = valuePart
           
           // Limpieza especial para TELEFONO
           if (headerNorm === 'TELEFONO') {
             finalValue = valuePart.replace(/\D/g, '').substring(0, 10)
           }
           
           result[match.original] = finalValue
         }
      }
    }

    // 5. Búsqueda directa si no hay sinónimos (Fuzzy match simple)
    normalizedHeaders.forEach(nh => {
      if (keyPart.includes(nh.norm) || nh.norm.includes(keyPart)) {
        if (valuePart && !result[nh.original]) {
          let finalValue = valuePart
          if (nh.norm.includes('tel') || nh.norm.includes('num') || nh.norm.includes('dn')) {
            finalValue = valuePart.replace(/\D/g, '').substring(0, 10)
          }
          result[nh.original] = finalValue
        }
      }
    })
  })

  return result
}
