import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { scriptUrl, spreadsheetId, data } = await request.json()

    if (!scriptUrl) {
      return NextResponse.json({ error: 'URL de sincronización no configurada' }, { status: 400 })
    }

    // Enviar datos al Google Apps Script Web App
    // Note: Apps Script requiere POST y los datos en el cuerpo
    const response = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({
        spreadsheetId,
        ...data
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
       const errorText = await response.text()
       console.error('Error from Google Apps Script:', errorText)
       return NextResponse.json({ error: 'El Excel rechazó la conexión. Verifica el script.' }, { status: 502 })
    }

    const result = await response.json()

    if (result.result === 'success') {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: result.message || 'Error en el script de Google' }, { status: 500 })
    }

  } catch (err) {
    console.error('Error synchronizing with Google Sheets:', err)
    return NextResponse.json({ error: 'No se pudo conectar con el Excel. Asegúrate de haber publicado el script como Web App.' }, { status: 500 })
  }
}
