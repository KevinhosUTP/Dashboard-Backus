-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: usuarios
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Si la tabla YA EXISTE, usa el bloque ALTER al final para migrarla.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Crear tabla nueva (si no existe) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usuarios (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  pin        TEXT NOT NULL,        -- contraseña guardada como md5(texto)
  rol        TEXT NOT NULL CHECK (rol IN ('admin', 'cliente')),
  nombre     TEXT,
  activo     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Si la tabla YA EXISTÍA con columna "username", renómbrala ────────────────
-- (Ejecuta solo si ya tenías la tabla creada antes)
-- ALTER TABLE public.usuarios RENAME COLUMN username TO email;

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon puede leer usuarios activos" ON public.usuarios;
CREATE POLICY "anon puede leer usuarios activos"
  ON public.usuarios FOR SELECT
  USING (activo = TRUE);

-- ── Limpiar usuarios anteriores e insertar solo los 2 oficiales ──────────────
TRUNCATE public.usuarios RESTART IDENTITY;

INSERT INTO public.usuarios (email, pin, rol, nombre) VALUES
  ('admin@backus.com',   md5('admin123'),   'admin',   'Administrador Backus'),
  ('cliente@backus.com', md5('cliente123'), 'cliente', 'Cliente Backus');

-- ── Verificar ─────────────────────────────────────────────────────────────────
SELECT id, email, rol, nombre, activo FROM public.usuarios;
