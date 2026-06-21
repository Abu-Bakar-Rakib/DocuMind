import { useState, useEffect, useCallback } from 'react';
import { FileQuestion, AlertTriangle, CheckCircle, RefreshCw, Brain, Sparkles } from 'lucide-react';
import { PdfUpload } from './components/PdfUpload';
import { ChatInterface } from './components/ChatInterface';
import { checkOpenAIKey, getDocumentCount } from './lib/api';

interface UploadResult {
  filename: string;
  pageCount: number;
  chunkCount: number;
}

function App() {
  const [hasOpenAIKey, setHasOpenAIKey] = useState<boolean | null>(null);
  const [documentCount, setDocumentCount] = useState<number>(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  const loadData = useCallback(async () => {
    setIsInitializing(true);
    try {
      const [keyExists, count] = await Promise.all([
        checkOpenAIKey(),
        getDocumentCount(),
      ]);
      setHasOpenAIKey(keyExists);
      setDocumentCount(count);
    } catch (error) {
      console.error('Failed to initialize:', error);
      setHasOpenAIKey(false);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUploadSuccess = useCallback((filename: string, pageCount: number, chunkCount: number) => {
    setUploadResults(prev => [...prev, { filename, pageCount, chunkCount }]);
    setDocumentCount(prev => prev + 1);
  }, []);

  const hasDocuments = documentCount > 0;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center flex flex-col items-center gap-6">
          {/* Animated logo */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-violet-600/30 blur-2xl animate-pulse-glow" />
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center glow-violet">
              <Brain className="w-10 h-10 text-white animate-float" />
            </div>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-200">DocuMind AI</p>
            <p className="text-slate-500 text-sm mt-1 font-medium">Initializing your knowledge engine...</p>
          </div>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-500 dot-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-fuchsia-500 dot-bounce" style={{ animationDelay: '200ms' }} />
            <div className="w-2 h-2 rounded-full bg-cyan-500 dot-bounce" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-slate-200 overflow-x-hidden">

      {/* Animated ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[180px] animate-pulse-glow" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[55%] h-[55%] rounded-full bg-fuchsia-600/10 blur-[180px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[35%] right-[25%] w-[25%] h-[25%] rounded-full bg-cyan-600/8 blur-[120px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)',
            backgroundSize: '64px 64px'
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16">

        {/* ── HEADER ── */}
        <header className="text-center mb-12 lg:mb-20 animate-fade-up">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-8">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-bold text-violet-300 tracking-widest uppercase">AI-Powered Document Intelligence</span>
          </div>

          {/* Logo + Title */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative group cursor-default">
              <div className="absolute inset-0 rounded-[28px] bg-gradient-to-tr from-violet-600/60 to-fuchsia-600/60 blur-2xl scale-110 group-hover:scale-125 transition-transform duration-700 animate-pulse-glow" />
              <div className="relative w-24 h-24 rounded-[28px] bg-gradient-to-tr from-violet-600 via-purple-600 to-fuchsia-500 flex items-center justify-center shadow-2xl glow-violet ring-1 ring-white/10">
                <Brain className="w-12 h-12 text-white animate-float" />
              </div>
            </div>

            <div>
              <h1 className="text-6xl lg:text-7xl font-black tracking-tight mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-200 to-cyan-300 animate-gradient">
                  DocuMind
                </span>
                {/* <span className="text-white"> AI</span> */}
              </h1>
              <p className="text-lg lg:text-xl text-slate-200 max-w-xl mx-auto leading-relaxed font-medium">
                Your personal knowledge engine. Upload documents,<br className="hidden sm:block" />
                unlock deep insights with AI-powered search.
              </p>
            </div>
          </div>



        </header>

        {/* ── KEY WARNING ── */}
        {hasOpenAIKey === false && (
          <div className="max-w-3xl mx-auto mb-10 animate-fade-up">
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-950/30 p-5 flex items-start gap-4">
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
              </div>
              <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="font-black text-amber-400 text-xs tracking-widest uppercase mb-1">Configuration Required</p>
                <p className="text-amber-200/70 leading-relaxed text-sm">
                  The API key needs to be configured for PDF processing and AI-powered Q&A to function correctly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── MAIN GRID ── */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* LEFT: Knowledge Base */}
          <div className="lg:col-span-5 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="relative glass-card rounded-[2rem] overflow-hidden">
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-transparent" />

              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                    <FileQuestion className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-100">Knowledge Base</h2>
                    <p className="text-xs text-slate-500 font-medium">Upload & index your documents</p>
                  </div>
                </div>

                <PdfUpload
                  onUploadSuccess={handleUploadSuccess}
                  disabled={hasOpenAIKey === false}
                />

                {uploadResults.length > 0 && (
                  <div className="mt-8">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px flex-1 bg-slate-800" />
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                        Indexed ({uploadResults.length})
                      </p>
                      <div className="h-px flex-1 bg-slate-800" />
                    </div>
                    <div className="space-y-3">
                      {uploadResults.map((result, index) => (
                        <div
                          key={index}
                          className="group relative flex items-center gap-4 p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/60 hover:border-violet-500/30 transition-all duration-300 overflow-hidden"
                        >
                          {/* shimmer on hover */}
                          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-violet-500/5 to-transparent" />
                          <div className="relative w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                            <CheckCircle className="w-5 h-5 text-violet-400" />
                          </div>
                          <div className="min-w-0 flex-1 relative">
                            <p className="text-sm font-bold text-slate-300 truncate group-hover:text-violet-300 transition-colors">
                              {result.filename}
                            </p>
                            <p className="text-xs text-slate-600 font-medium mt-0.5">
                              {result.pageCount} pages • {result.chunkCount} segments
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Chat */}
          <div className="lg:col-span-7 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative glass-card rounded-[2rem] overflow-hidden flex flex-col h-[680px]">
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500" />

              {/* Chat header */}
              <div className="relative flex-shrink-0 px-6 py-5 border-b border-white/5 bg-slate-950/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-xl bg-cyan-500/30 blur-md" />
                      <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center">
                        <Brain className="w-4.5 h-4.5 text-white w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-100">DocuMind Assistant</h2>
                      <p className="text-xs text-slate-500 font-medium">AI-powered document analysis</p>
                    </div>
                  </div>

                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold border ${hasDocuments
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-500'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${hasDocuments
                      ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                      : 'bg-slate-600'
                      }`} />
                    {hasDocuments ? `${documentCount} Doc${documentCount > 1 ? 's' : ''} Ready` : 'No Documents'}
                  </div>
                </div>
              </div>

              {/* Chat body */}
              <div className="flex-1 overflow-hidden">
                <ChatInterface hasDocuments={hasDocuments} />
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="text-center mt-16 pb-4 animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="inline-flex flex-col items-center gap-3">
            {/* Project name */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 animate-gradient">
                DocuMind
              </span>
            </div>
            {/* Divider */}
            <div className="inline-flex items-center gap-3">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-slate-700" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Built by</span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-slate-700" />
            </div>
            {/* Author name */}
            <span className="text-lg font-black text-slate-300">
              Abu Bakar Rakib
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
