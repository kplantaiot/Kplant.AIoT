# Kittypau App - Guia de Instalacion

**Fecha:** 2026-02-08
**Stack:** Next.js 14 + Supabase + TailwindCSS + Vercel
**Directorio:** `c:\Kittypau\kittypau-app\`

Si la instalacion se interrumpe, busca el ultimo checkpoint completado y retoma desde ahi.

---

## Prerequisitos

- Node.js 18+ instalado
- npm o npx disponible
- Cuenta Supabase con proyecto activo
- Credenciales Supabase (URL + anon key)

---

## FASE 1: Scaffold + Auth

### Paso 1.1: Crear proyecto Next.js

```bash
cd c:\Kittypau
npx create-next-app@latest kittypau-app --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

**Checkpoint:** `c:\Kittypau\kittypau-app\package.json` existe y contiene `"next"`.

### Paso 1.2: Instalar dependencias

```bash
cd c:\Kittypau\kittypau-app
npm install @supabase/supabase-js @supabase/ssr
npm install recharts react-hook-form @hookform/resolvers zod lucide-react
npm install class-variance-authority clsx tailwind-merge
```

**Checkpoint:** `node_modules/@supabase/supabase-js` existe.

### Paso 1.3: Inicializar shadcn/ui

```bash
cd c:\Kittypau\kittypau-app
npx shadcn@latest init
```

Opciones:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Luego agregar componentes base:
```bash
npx shadcn@latest add button card input label form dialog toast
```

**Checkpoint:** `components/ui/button.tsx` existe.

### Paso 1.4: Crear .env.local

Crear archivo `c:\Kittypau\kittypau-app\.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://koxraplgxifdmssfkilx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtveHJhcGxneGlmZG1zc2ZraWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzM5MDUsImV4cCI6MjA4NTc0OTkwNX0.9Ztnvnoj0JTjp2JE21R0kjZkXFO0broaMIfJTNHFxuI
```

**Checkpoint:** `.env.local` existe con las dos variables.

### Paso 1.5: Configurar Supabase clients

Crear `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Crear `lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* Server Component */ }
        },
      },
    }
  )
}
```

Crear `lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Checkpoint:** `lib/supabase/client.ts` y `lib/supabase/server.ts` existen.

### Paso 1.6: Middleware de auth

Crear `middleware.ts` en la raiz:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Rutas publicas
  const publicPaths = ['/login', '/register']
  const isPublic = publicPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/today'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

**Checkpoint:** `middleware.ts` existe en la raiz del proyecto.

### Paso 1.7: Configurar Tailwind con tokens Kittypau

Actualizar `app/globals.css` con los tokens de la paleta oficial:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 30 38% 97%;
    --foreground: 20 12% 18%;
    --card: 0 0% 100%;
    --card-foreground: 20 12% 18%;
    --popover: 0 0% 100%;
    --popover-foreground: 20 12% 18%;
    --primary: 348 45% 33%;
    --primary-foreground: 0 0% 100%;
    --secondary: 15 30% 80%;
    --secondary-foreground: 20 12% 18%;
    --muted: 24 20% 92%;
    --muted-foreground: 20 9% 40%;
    --accent: 15 40% 82%;
    --accent-foreground: 20 12% 18%;
    --destructive: 350 45% 42%;
    --destructive-foreground: 0 0% 100%;
    --border: 24 18% 85%;
    --input: 24 18% 85%;
    --ring: 348 45% 33%;
    --radius: 1.125rem;
  }
}
```

**Checkpoint:** `app/globals.css` contiene `--primary: 348 45% 33%`.

### Paso 1.8: Paginas Login y Register

Crear `app/login/page.tsx` y `app/register/page.tsx` con formularios que usen Supabase Auth:
- `supabase.auth.signInWithPassword({ email, password })`
- `supabase.auth.signUp({ email, password })`
- Redirect a `/today` despues de login exitoso

**Checkpoint:** `npm run dev` → abrir http://localhost:3000/login → formulario visible.

### Paso 1.9: Ejecutar SQL trigger en Supabase

Ir a Supabase Dashboard → SQL Editor → ejecutar:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, auth_provider, user_name, care_rating)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    5
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Checkpoint:** Registrar un usuario de prueba → verificar que aparece en la tabla `profiles`.

### VERIFICACION FASE 1
- [ ] `npm run dev` funciona sin errores
- [ ] http://localhost:3000 redirige a /login
- [ ] Formulario de registro crea usuario en Supabase Auth + profiles
- [ ] Login redirige a /today
- [ ] Acceder a /today sin login redirige a /login

---

## FASE 2: Layout + Dashboard

### Paso 2.1: Layout protegido

Crear `app/(app)/layout.tsx` con Header y MobileNav (bottom tabs).
Navegacion: Today, Pet, Bowl, Settings.

### Paso 2.2: Pagina /today

Crear `app/(app)/today/page.tsx`:
- Leer `sensor_readings` de Supabase (ultimas lecturas por dispositivo)
- Mostrar cards con peso, temperatura, humedad, luz
- Suscripcion Supabase Realtime para actualizaciones en vivo

### Paso 2.3: Componentes base

- `DeviceStatusCard` - estado del dispositivo
- `StatWidget` - tarjeta de estadistica individual
- `Header` - barra superior con logo y avatar
- `MobileNav` - tabs inferiores para movil

### VERIFICACION FASE 2
- [ ] /today muestra datos reales de sensor_readings
- [ ] Navegacion entre paginas funciona
- [ ] Layout responsive (mobile y desktop)
- [ ] Datos se actualizan en vivo (Supabase Realtime)

---

## FASE 3: Onboarding (despues de Fase 2)

Flujo modal en 3 pasos: Usuario → Mascota → Dispositivo.
Detalle en Mauro_Context/NOTAS_IMPLEMENTACION.md y FLUJO_REGISTRO_DISPOSITIVO.md.

---

## FASE 4: CRUD + Paginas restantes (despues de Fase 3)

/pet, /bowl, /story, /settings.

---

## FASE 5: Deploy Vercel (despues de Fase 4)

1. `git init && git add . && git commit -m "Initial commit"`
2. Crear repo en GitHub (privado)
3. `git remote add origin <url> && git push -u origin main`
4. Conectar repo a Vercel
5. Agregar env vars en Vercel dashboard
6. Deploy automatico

---

## Referencia rapida

| Recurso | Ubicacion |
|---|---|
| Schema SQL actual | `c:\Kittypau\6 _KPCL0036_1b\SQL_UNIFICADO.sql` |
| Migracion V2 | `c:\Kittypau\6 _KPCL0036_1b\SQL_MIGRACION_V2.sql` |
| Specs de diseño | `c:\Kittypau\6 _KPCL0036_1b\Mauro_Context\estilos y diseños.md` |
| Specs de vistas | `c:\Kittypau\6 _KPCL0036_1b\Mauro_Context\VISTAS_APP.md` |
| Reglas IoT | `c:\Kittypau\6 _KPCL0036_1b\Mauro_Context\REGLAS_INTERPRETACION_IOT.md` |
| Hitos del proyecto | `c:\Kittypau\6 _KPCL0036_1b\Hitos-Pendientes.md` |
| Bridge (no tocar) | RPi: `/home/kittypau/kittypau-bridge/bridge.js` |
| Supabase URL | `https://koxraplgxifdmssfkilx.supabase.co` |
