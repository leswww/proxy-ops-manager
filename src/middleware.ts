import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const publicPaths = ['/login', '/api/auth/login']
const DEMO_SECRET = 'proxy-ops-demo-secret-key-32chars!'

function getSecret() {
  if (process.env.USE_MOCK_DATA === 'true') {
    return new TextEncoder().encode(DEMO_SECRET)
  }
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname === '/') {
    return NextResponse.next()
  }

  const token = request.cookies.get('proxy-ops-session')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, getSecret())
    return NextResponse.next()
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('proxy-ops-session')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
