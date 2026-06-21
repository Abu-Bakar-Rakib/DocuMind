import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eyyumqgxnkigvkcocpwt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5eXVtcWd4bmtpZ3ZrY29jcHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNTMzNjMsImV4cCI6MjA5NzYyOTM2M30.QfWKtZpj4taljc0jJKYrxExZiK3UIIZLGUeT1PJvRhw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProc() {
  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: new Array(768).fill(0.001),
    match_count: 4
  });
  console.log('Test rpc:', data, error);
}

checkProc();
