import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GOOGLE_AI_API_KEY = "AQ.Ab8RN6Kf6cshg-q4-4PmEtHjsPoIHqjbkSJTMAzTRwUTlp6VCw"; // Replace with your actual key

interface DocumentRow {
  id: string;
  filename: string;
  page_count: number;
  chunk_count: number;
}

interface SearchResult {
  id: string;
  document_id: string;
  content: string;
  page_number: number;
  chunk_index: number;
  similarity: number;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function getGoogleEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google embedding error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

async function getGeminiChatCompletion(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.3 },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini chat error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();

    if (action === 'get-document-count') {
      const { count, error } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      return new Response(JSON.stringify({ count }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'check-key') {
      return new Response(JSON.stringify({ hasKey: !!GOOGLE_AI_API_KEY }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'store-chunks') {
      const { filename, chunks } = payload as { filename: string; chunks: { content: string; page: number; chunkIndex: number }[] };

      const pageCount = Math.max(...chunks.map(c => c.page));

      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({ filename, page_count: pageCount, chunk_count: chunks.length })
        .select()
        .single();

      if (docError) throw docError;
      const document = docData as DocumentRow;

      for (const chunk of chunks) {
        const embedding = await getGoogleEmbedding(chunk.content);

        const { error: insertError } = await supabase
          .from('document_chunks')
          .insert({
            document_id: document.id,
            content: chunk.content,
            page_number: chunk.page,
            chunk_index: chunk.chunkIndex,
            embedding,
          });

        if (insertError) throw insertError;
      }

      return new Response(JSON.stringify({
        success: true,
        documentId: document.id,
        pageCount,
        chunkCount: chunks.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'query') {
      const { question, topK = 4 } = payload as { question: string; topK?: number };

      const questionEmbedding = await getGoogleEmbedding(question);

      const { data: similarChunks, error: searchError } = await supabase.rpc('match_chunks', {
        query_embedding: questionEmbedding,
        match_count: topK,
      });

      if (searchError) throw searchError;

      const documentIds = [...new Set((similarChunks as SearchResult[]).map(c => c.document_id))];
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('id, filename')
        .in('id', documentIds);

      if (docsError) throw docsError;

      const docMap = new Map((documents as DocumentRow[]).map(d => [d.id, d.filename]));

      if (!similarChunks || (similarChunks as SearchResult[]).length === 0) {
        return new Response(JSON.stringify({
          answer: "I couldn't find any relevant information in the uploaded documents to answer your question. Please make sure you've uploaded PDFs with relevant content.",
          sources: [],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const systemPrompt = "You are a precise research assistant. Answer the user's question using ONLY the provided context excerpts from their PDF documents. If the context does not contain enough information to answer, say so explicitly rather than guessing. When you use a fact from the context, mention which source chunk it came from (e.g. [Source 2]).";

      const contextParts = (similarChunks as SearchResult[]).map((chunk, i) => {
        const filename = docMap.get(chunk.document_id) || 'Unknown';
        return `[Source ${i + 1} | ${filename} p.${chunk.page_number} | score=${chunk.similarity.toFixed(3)}]\n${chunk.content}`;
      }).join('\n\n');

      const userMessage = `Context excerpts from the document(s):\n\n${contextParts}\n\n---\nQuestion: ${question}\n\nAnswer the question using only the context above. Cite sources like [Source 1] when you use a specific fact.`;

      const answer = await getGeminiChatCompletion(systemPrompt, userMessage);

      const sources = (similarChunks as SearchResult[]).map((chunk, i) => ({
        sourceIndex: i + 1,
        documentId: chunk.document_id,
        filename: docMap.get(chunk.document_id) || 'Unknown',
        pageNumber: chunk.page_number,
        similarity: chunk.similarity,
        content: chunk.content,
      }));

      return new Response(JSON.stringify({ answer, sources }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
