-- Create documents table to track uploaded PDFs
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  page_count INTEGER NOT NULL,
  chunk_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create document_chunks table with embeddings
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(1536), -- text-embedding-3-small produces 1536 dimensions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster similarity search
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for documents (public access for this demo app)
CREATE POLICY "select_documents" ON documents FOR SELECT USING (true);
CREATE POLICY "insert_documents" ON documents FOR INSERT WITH CHECK (true);
CREATE POLICY "update_documents" ON documents FOR UPDATE USING (true);
CREATE POLICY "delete_documents" ON documents FOR DELETE USING (true);

-- RLS policies for document_chunks (public access for this demo app)
CREATE POLICY "select_chunks" ON document_chunks FOR SELECT USING (true);
CREATE POLICY "insert_chunks" ON document_chunks FOR INSERT WITH CHECK (true);
CREATE POLICY "update_chunks" ON document_chunks FOR UPDATE USING (true);
CREATE POLICY "delete_chunks" ON document_chunks FOR DELETE USING (true);

-- Create a function to compute cosine similarity
CREATE OR REPLACE FUNCTION match_chunks(query_embedding vector, match_count int)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  page_number INTEGER,
  chunk_index INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.document_id,
    dc.content,
    dc.page_number,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;