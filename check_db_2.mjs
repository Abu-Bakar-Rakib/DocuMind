import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eyyumqgxnkigvkcocpwt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5eXVtcWd4bmtpZ3ZrY29jcHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNTMzNjMsImV4cCI6MjA5NzYyOTM2M30.QfWKtZpj4taljc0jJKYrxExZiK3UIIZLGUeT1PJvRhw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('document_chunks')
    .select('embedding')
    .limit(1);
    
  console.log('Sample embedding:', data ? data[0]?.embedding?.substring(0, 100) : 'none');

  // Let's also test an RPC call with 1536 dimensions
  const dummyVector1536 = new Array(1536).fill(0.001);
  const { data: sim1536, error: err1536 } = await supabase.rpc('match_chunks', {
    query_embedding: dummyVector1536,
    match_count: 4
  });
  console.log('match_chunks 1536 result length:', sim1536?.length, 'error:', err1536?.message);

  // Let's test an RPC call with 768 dimensions
  const dummyVector768 = new Array(768).fill(0.001);
  const { data: sim768, error: err768 } = await supabase.rpc('match_chunks', {
    query_embedding: dummyVector768,
    match_count: 4
  });
  console.log('match_chunks 768 result length:', sim768?.length, 'error:', err768?.message);
}

checkSchema();
