import { toBlob } from 'html-to-image'
import { toast } from 'sonner'

/**
 * Captures a DOM element as an image and copies it to the clipboard.
 * @param elementId The ID of the element to capture.
 * @param fileName Optional filename for logging or future use.
 */
export async function copyElementToClipboard(elementId: string) {
  const element = document.getElementById(elementId)
  
  if (!element) {
    toast.error('No se pudo encontrar la tabla para capturar.')
    return
  }

  try {
    toast.loading('Generando captura...', { id: 'screenshot-loading' })
    
    // Config for better quality
    const blob = await toBlob(element, {
      backgroundColor: '#ffffff',
      cacheBust: true,
      pixelRatio: 2, // Higher resolution
    })

    if (!blob) throw new Error('Blob generation failed')

    const item = new ClipboardItem({ 'image/png': blob })
    await navigator.clipboard.write([item])
    
    toast.dismiss('screenshot-loading')
    toast.success('¡Captura copiada al portapapeles! Ya puedes pegarla (Ctrl+V).')
  } catch (error) {
    console.error('Error capturing element:', error)
    toast.dismiss('screenshot-loading')
    toast.error('Error al generar la captura. Intenta de nuevo.')
  }
}
