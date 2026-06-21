-- Drop existing index and function that depend on the column
DROP INDEX IF EXISTS document_chunks_embedding_idx;
DROP FUNCTION IF EXISTS match_chunks(vector, int);

-- Recreate the column with 768 dimensions (Google text-embedding-004)
ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding;
ALTER TABLE document_chunks ADD COLUMN embedding vector(768);

-- Recreate index
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Recreate match function for 768-dim vectors
CREATE OR REPLACE FUNCTION match_chunks(query_embedding vector(768), match_count int)
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
