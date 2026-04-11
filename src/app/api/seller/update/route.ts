import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { scriptUrl, dn, status } = await req.json()

    if (!scriptUrl || !dn || !status) {
      return NextResponse.json({ success: false, error: 'Faltan parámetros requeridos' }, { status: 400 })
    }

    // Enviar petición al Google Apps Script con acción de update
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'update',
        dn: dn,
        status: status
      })
    })

    const text = await response.text()
    let result
    try {
      result = JSON.parse(text)
    } catch (e) {
      // Google Apps Script a veces devuelve texto plano si hay éxito o error
      if (text.toLowerCase().includes('success')) {
        result = { success: true }
      } else {
        result = { success: false, error: text }
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error en API Seller Update:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
