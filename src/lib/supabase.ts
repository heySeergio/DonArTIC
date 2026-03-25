import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const canCreateAdmin = !!supabaseUrl && !!supabaseServiceRoleKey;
const canCreatePublic = !!supabaseUrl && !!supabaseAnonKey;

// Solo se usa desde el servidor (API routes). Service role ignora RLS.
export const supabaseAdmin = canCreateAdmin
  ? createClient(supabaseUrl as string, supabaseServiceRoleKey as string, {
      auth: { persistSession: false },
    })
  : null;

// Export “public” (anon) por si más adelante quieres hacer lecturas directas.
export const supabasePublic = canCreatePublic
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: { persistSession: false },
    })
  : null;

