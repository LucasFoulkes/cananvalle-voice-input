import { createClient } from '@supabase/supabase-js'

// Use fixed defaults for Supabase client
const DEFAULT_URL = 'https://qetmbprouonlipxwvigt.supabase.co'
const DEFAULT_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFldG1icHJvdW9ubGlweHd2aWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0OTI4NzAsImV4cCI6MjA3MjA2ODg3MH0.mf2ZhMvYRkjpAD_DrC-BifvjJ9xCg_8sXrDOLkIGPl8'

export const supabase = createClient(DEFAULT_URL, DEFAULT_ANON_KEY)
