// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 진짜 데이터베이스와 연결된 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseKey);