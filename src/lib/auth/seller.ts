import { cookies } from 'next/headers'

export async function getSellerSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('seller_session')
  
  if (!session) return null
  
  try {
    return JSON.parse(session.value)
  } catch {
    return null
  }
}

export async function clearSellerSession() {
  const cookieStore = await cookies()
  cookieStore.delete('seller_session')
}
