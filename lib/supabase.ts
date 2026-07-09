import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isPlaceholder = 
  supabaseUrl.includes('your-project') || 
  supabaseAnonKey.includes('your-anon-key') ||
  !supabaseUrl || 
  !supabaseAnonKey;

if (isPlaceholder && typeof window !== 'undefined') {
  console.warn(
    'Supabase integration warning: Credentials are not configured in .env.local. ' +
    'The app will fall back to localStorage database operations for testing.'
  );
}

// Export the Supabase client
export const supabase = createClient(
  isPlaceholder ? 'https://placeholder.supabase.co' : supabaseUrl,
  isPlaceholder ? 'placeholder' : supabaseAnonKey
);

export const isSupabaseConfigured = !isPlaceholder;
