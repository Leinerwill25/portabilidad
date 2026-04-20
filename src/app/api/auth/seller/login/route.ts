import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Buscar al vendedor por email
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('id, first_name, last_name, email, password, created_by, is_active')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (error || !seller) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 })
    }

    // 2. Verificar si el usuario está activo
    if (seller.is_active === false) {
      return NextResponse.json({ error: 'Su acceso ha sido restringido. Por favor, contacte a su supervisor o administrador.' }, { status: 403 })
    }

    // 3. Validar contraseña
    // Nota: Por ahora comparamos directamente (según requerimiento del usuario de asignar DN2026*)
    // En el futuro se recomienda usar bcrypt.
    if (seller.password !== password) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
    }

    // 3. Crear sesión de vendedor (Cookie)
    const sellerData = {
      id: seller.id,
      name: `${seller.first_name} ${seller.last_name}`,
      role: 'seller',
      supervisorId: seller.created_by
    }

    const cookieStore = await cookies()
    cookieStore.set('seller_session', JSON.stringify(sellerData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 semana
      path: '/',
    })

    return NextResponse.json({ 
      success: true, 
      user: sellerData,
      redirect: '/vendedor/dashboard'
    })

  } catch (err) {
    console.error('Error in seller login:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
