import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verificar si es coordinador
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Solo coordinadores pueden ver todos los perfiles' }, { status: 403 })
  }

  // Obtener todos los perfiles (excepto el actual)
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .neq('id', user.id)
    .order('full_name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Error al obtener perfiles' }, { status: 500 })
  }

  return NextResponse.json(profiles)
}
