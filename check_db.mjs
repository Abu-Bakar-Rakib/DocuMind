import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eyyumqgxnkigvkcocpwt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5eXVtcWd4bmtpZ3ZrY29jcHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNTMzNjMsImV4cCI6MjA5NzYyOTM2M30.QfWKtZpj4taljc0jJKYrxExZiK3UIIZLGUeT1PJvRhw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDB() {
  console.log('Checking documents...');
  const { data: docs, error: err1 } = await supabase.from('documents').select('*');
  console.log('Documents:', docs);

  console.log('Checking chunks...');
  const { data: chunks, error: err2 } = await supabase.from('document_chunks').select('id, document_id, page_number, chunk_index').limit(5);
  console.log('Chunks:', chunks);
  if (err2) console.error('Error fetching chunks:', err2);
  
  if (chunks && chunks.length > 0) {
     console.log('Chunks exist. We will now try a dummy RPC call.');
     // Just pass a dummy 768-dimensional vector
     const dummyVector = new Array(768).fill(0.001);
     const { data: sim, error: err3 } = await supabase.rpc('match_chunks', {
       query_embedding: dummyVector,
       match_count: 4
     });
     console.log('match_chunks result:', sim);
     if (err3) console.error('match_chunks error:', err3);
  } else {
     console.log('NO CHUNKS FOUND! Did the upload succeed?');
  }
}

checkDB();
