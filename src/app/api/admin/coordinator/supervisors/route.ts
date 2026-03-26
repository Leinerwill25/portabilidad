import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('coordinator_supervisors')
    .select('supervisor_id')
    .eq('coordinator_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Error al obtener asignaciones' }, { status: 500 })
  }

  return NextResponse.json(data.map((d: { supervisor_id: string }) => d.supervisor_id))
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { supervisorIds } = await request.json()

  if (!Array.isArray(supervisorIds)) {
    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
  }

  // 1. Eliminar asignaciones actuales
  await supabase
    .from('coordinator_supervisors')
    .delete()
    .eq('coordinator_id', user.id)

  // 2. Insertar nuevas asignaciones
  if (supervisorIds.length > 0) {
    const toInsert = supervisorIds.map(sid => ({
      coordinator_id: user.id,
      supervisor_id: sid
    }))

    const { error: insertError } = await supabase
      .from('coordinator_supervisors')
      .insert(toInsert)

    if (insertError) {
      return NextResponse.json({ error: 'Error al guardar asignaciones' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
