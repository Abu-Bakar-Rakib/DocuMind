import { supabase } from './supabase';
import type { TextChunk } from './pdf-processor';

// Read the API key from environment variables
const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;

export interface StoreChunksPayload {
  filename: string;
  chunks: TextChunk[];
}

export interface StoreChunksResponse {
  success: boolean;
  documentId: string;
  pageCount: number;
  chunkCount: number;
}

export interface Source {
  sourceIndex: number;
  documentId: string;
  filename: string;
  pageNumber: number;
  similarity: number;
  content: string;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
}

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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GOOGLE_AI_API_KEY}`,
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

export async function checkOpenAIKey(): Promise<boolean> {
  return !!GOOGLE_AI_API_KEY;
}

export async function getDocumentCount(): Promise<number> {
  const { count, error } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  return count || 0;
}

export async function storeChunks({ filename, chunks }: StoreChunksPayload): Promise<StoreChunksResponse> {
  const pageCount = Math.max(...chunks.map(c => c.page));

  const { data: docData, error: docError } = await supabase
    .from('documents')
    .insert({ filename, page_count: pageCount, chunk_count: chunks.length })
    .select()
    .single();

  if (docError) throw docError;
  const document = docData;

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

  return {
    success: true,
    documentId: document.id,
    pageCount,
    chunkCount: chunks.length,
  };
}

export async function queryDocuments(question: string, topK = 4): Promise<QueryResponse> {
  const questionEmbedding = await getGoogleEmbedding(question);

  // We do local cosine similarity because the ivfflat index on Supabase is returning 0 rows for small datasets
  const { data: allChunks, error: fetchError } = await supabase
    .from('document_chunks')
    .select('id, document_id, content, page_number, chunk_index, embedding');

  if (fetchError) throw fetchError;

  const cosineSimilarity = (vecA: number[], vecB: number[]) => {
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

  const chunksWithSim = (allChunks || []).map(chunk => {
    let embedding = chunk.embedding;
    if (typeof embedding === 'string') {
      try { embedding = JSON.parse(embedding); } catch (e) { }
    }
    const similarity = cosineSimilarity(embedding, questionEmbedding);
    return { ...chunk, similarity };
  });

  chunksWithSim.sort((a, b) => b.similarity - a.similarity);
  const chunks = chunksWithSim.slice(0, topK);

  const documentIds = [...new Set(chunks.map(c => c.document_id))];

  let docMap = new Map();
  if (documentIds.length > 0) {
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, filename')
      .in('id', documentIds);

    if (docsError) throw docsError;
    docMap = new Map(documents?.map(d => [d.id, d.filename]) || []);
  }

  if (chunks.length === 0) {
    return {
      answer: "I couldn't find any relevant information in the uploaded documents to answer your question.",
      sources: [],
    };
  }

  const systemPrompt = "You are a precise research assistant. Answer the user's question using ONLY the provided context excerpts from their PDF documents. If the context does not contain enough information to answer, say so explicitly rather than guessing. When you use a fact from the context, mention which source chunk it came from (e.g. [Source 2]).";

  const contextParts = chunks.map((chunk, i) => {
    const filename = docMap.get(chunk.document_id) || 'Unknown';
    return `[Source ${i + 1} | ${filename} p.${chunk.page_number} | score=${chunk.similarity.toFixed(3)}]\n${chunk.content}`;
  }).join('\n\n');

  const userMessage = `Context excerpts from the document(s):\n\n${contextParts}\n\n---\nQuestion: ${question}\n\nAnswer the question using only the context above. Cite sources like [Source 1] when you use a specific fact.`;

  const answer = await getGeminiChatCompletion(systemPrompt, userMessage);

  const sources = chunks.map((chunk, i) => ({
    sourceIndex: i + 1,
    documentId: chunk.document_id,
    filename: docMap.get(chunk.document_id) || 'Unknown',
    pageNumber: chunk.page_number,
    similarity: chunk.similarity,
    content: chunk.content,
  }));

  return { answer, sources };
}
