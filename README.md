# 🧠 DocuMind AI

<p align="center">
  <img src="https://img.shields.io/badge/Built%20with-React-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/AI-Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Styling-TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

<p align="center">
  <strong>Your personal AI-powered knowledge engine. Upload PDFs and extract deep insights through natural conversation.</strong>
</p>

<p align="center">
  Built by <a href="https://github.com/abubakarrakib"><strong>Abu Bakar Rakib</strong></a>
</p>

---

## ✨ Features

- 📄 **PDF Upload & Indexing** — Drag and drop any PDF; the app automatically extracts text, creates semantic chunks, and indexes them.
- 🔍 **Vector Similarity Search** — Uses cosine similarity on 768-dimensional embeddings to find the most relevant passages for any question.
- 🤖 **AI-Powered Q&A** — Powered by Google Gemini (`gemini-flash-latest`) to answer questions with cited context from your documents.
- 💬 **Natural Chat Interface** — Clean chat UI with markdown rendering, animated typing indicators, and collapsible source citations.
- 🗄️ **Supabase Vector Database** — Stores all document chunks and embeddings in a Postgres database with `pgvector`.
- 🎨 **Premium Dark UI** — Glassmorphism, animated gradients, ambient glow effects, and smooth micro-animations.
- ⚡ **Client-Side Processing** — Embeddings and similarity search run directly in the browser — no server required for querying.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, custom CSS animations |
| **AI / LLM** | Google Gemini (`gemini-flash-latest`) |
| **Embeddings** | Google Gemini Embedding (`gemini-embedding-001`, 768-dim) |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **PDF Parsing** | `pdfjs-dist` |
| **Markdown** | `react-markdown` + `@tailwindcss/typography` |
| **Icons** | `lucide-react` |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account and project
- A [Google AI Studio](https://aistudio.google.com) API key

### 1. Clone the repository

```bash
git clone https://github.com/abubakarrakib/documind-ai.git
cd documind-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

In your Supabase project SQL editor, run the following migrations in order:

**Enable pgvector:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Create tables:**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  page_count INTEGER NOT NULL,
  chunk_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Create RLS policies (public access for demo):**
```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_documents" ON documents FOR SELECT USING (true);
CREATE POLICY "insert_documents" ON documents FOR INSERT WITH CHECK (true);
CREATE POLICY "select_chunks" ON document_chunks FOR SELECT USING (true);
CREATE POLICY "insert_chunks" ON document_chunks FOR INSERT WITH CHECK (true);
```

### 4. Configure API keys

Open `src/lib/api.ts` and paste your Google AI API key:

```typescript
const GOOGLE_AI_API_KEY = "your-google-ai-api-key-here";
```

Open `src/lib/supabase.ts` and add your Supabase project URL and anon key:

```typescript
const supabaseUrl = "https://your-project.supabase.co";
const supabaseAnonKey = "your-anon-key";
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📖 How It Works

```
┌─────────────┐    ┌──────────────────┐    ┌────────────────┐
│  Upload PDF │───▶│ Extract & Chunk  │───▶│ Embed (Gemini) │
└─────────────┘    └──────────────────┘    └────────┬───────┘
                                                     │
                                                     ▼
                                           ┌─────────────────┐
                                           │ Store in Supabase│
                                           │  (pgvector)      │
                                           └─────────────────┘

┌────────────────┐    ┌──────────────────┐    ┌────────────────┐
│  User Question │───▶│ Embed Question   │───▶│ Cosine Sim     │
└────────────────┘    │ (Gemini)         │    │ Search Chunks  │
                      └──────────────────┘    └────────┬───────┘
                                                       │
                                                       ▼
                                           ┌─────────────────────┐
                                           │ Gemini LLM generates│
                                           │ answer with context │
                                           └─────────────────────┘
```

1. **Upload** — PDF is parsed page by page using `pdfjs-dist`
2. **Chunk** — Text is split into overlapping semantic chunks (~500 tokens each)
3. **Embed** — Each chunk is embedded using `gemini-embedding-001` (768 dimensions)
4. **Store** — Chunks + embeddings are stored in Supabase's pgvector table
5. **Query** — User question is embedded, then cosine similarity finds top-k chunks
6. **Answer** — Top chunks are sent as context to Gemini which answers the question

---

## 📁 Project Structure

```
src/
├── components/
│   ├── ChatInterface.tsx   # Chat UI with markdown rendering & sources
│   └── PdfUpload.tsx       # PDF drag-and-drop upload with progress bar
├── lib/
│   ├── api.ts              # Google Gemini API calls + Supabase queries
│   ├── pdf-processor.ts    # PDF text extraction and chunking
│   └── supabase.ts         # Supabase client setup
├── App.tsx                 # Main layout and state management
└── index.css               # Global styles, animations, custom scrollbar

supabase/
├── functions/pdf-qa/       # (Legacy) Supabase Edge Function
└── migrations/             # SQL migration files
```

---

## 📸 Screenshots

> Upload documents on the left, ask questions on the right.

| Feature | Description |
|---|---|
| 🌑 Dark glassmorphism UI | Premium dark theme with animated gradient blobs |
| 📤 Smart upload zone | Drag & drop with real-time progress bar |
| 💬 Chat with sources | Answers with collapsible source citations |
| 🧠 AI typing animation | Staggered bouncing dots while AI thinks |

---

## ⚠️ Known Limitations

- **Free tier API keys** may have low rate limits on embedding and generation calls
- **Large PDFs** (100+ pages) may take longer to index due to sequential embedding calls
- The app currently uses **anon/public RLS policies** — suitable for demos only

---

## 🔮 Future Improvements

- [ ] Multi-file search across all uploaded documents simultaneously
- [ ] Streaming responses for a faster feel
- [ ] User authentication and private document vaults
- [ ] Support for DOCX, TXT, and web URL ingestion
- [ ] Conversation history persistence

---

## 📄 License

MIT License © 2024 [Abu Bakar Rakib](https://github.com/abubakarrakib)

---

<p align="center">
  Made with ❤️ and ☕ by <strong>Abu Bakar Rakib</strong>
</p>
