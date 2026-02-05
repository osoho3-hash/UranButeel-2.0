// utils/supabaseClient.ts
// ----------------------------------------------------------------------------
// This module exposes a single Supabase client that can be imported
// throughout your Next.js application.  It uses environment variables for
// configuration so that secrets are not hardcoded.  Replace the placeholder
// values with your project's URL and anon key.

import { createClient } from '@supabase/supabase-js'

// IMPORTANT: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in
// your .env.local file.  The `NEXT_PUBLIC_` prefix ensures that these
// variables are available in the browser.  See Supabase docs for details.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
