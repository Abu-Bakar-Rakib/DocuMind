import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eyyumqgxnkigvkcocpwt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5eXVtcWd4bmtpZ3ZrY29jcHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNTMzNjMsImV4cCI6MjA5NzYyOTM2M30.QfWKtZpj4taljc0jJKYrxExZiK3UIIZLGUeT1PJvRhw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSim() {
  const { data: allChunks, error: fetchError } = await supabase
    .from('document_chunks')
    .select('id, document_id, content, page_number, chunk_index, embedding')
    .limit(10);
    
  if (fetchError) {
    console.error(fetchError);
    return;
  }
  
  const questionEmbedding = new Array(768).fill(0.001);

  const cosineSimilarity = (vecA, vecB) => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  };

  const chunksWithSim = allChunks.map(chunk => {
    let embedding = chunk.embedding;
    if (typeof embedding === 'string') {
      try { embedding = JSON.parse(embedding); } catch(e) {}
    }
    const similarity = cosineSimilarity(embedding, questionEmbedding);
    return { id: chunk.id, similarity };
  });

  chunksWithSim.sort((a, b) => b.similarity - a.similarity);
  console.log('Top chunks:', chunksWithSim.slice(0, 4));
}

testSim();
