import { createClient } from '@supabase/supabase-js';
import { createRecoverySession } from './recoverySession';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const recoverySession = createRecoverySession(supabase.auth);