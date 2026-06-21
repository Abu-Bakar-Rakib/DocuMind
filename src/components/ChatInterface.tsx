import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ChevronDown, ChevronUp, FileText, Sparkles } from 'lucide-react';
import { queryDocuments, type Source } from '../lib/api';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

interface ChatInterfaceProps {
  hasDocuments: boolean;
}

export function ChatInterface({ hasDocuments }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !hasDocuments) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await queryDocuments(input.trim());
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get answer'}`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const toggleSources = (messageId: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-transparent">

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8 animate-fade-up">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-3xl bg-violet-600/20 blur-2xl scale-110" />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-violet-600/30 to-fuchsia-600/30 border border-violet-500/20 flex items-center justify-center">
                <Sparkles className="w-9 h-9 text-violet-400 animate-float" />
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-200 mb-2">
              {hasDocuments ? 'Ready to answer' : 'Upload a document first'}
            </h3>
            <p className="text-slate-300 text-sm max-w-xs leading-relaxed">
              {hasDocuments
                ? 'Ask anything about your indexed documents — I\'ll find the relevant passages instantly.'
                : 'Upload a PDF from the left panel to enable AI-powered Q&A on your document.'}
            </p>
            {hasDocuments && (
              <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
                {['Summarize the key points', 'What are the main topics?', 'Find important dates'].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="text-left text-xs font-semibold text-slate-300 hover:text-violet-300 border border-slate-800 hover:border-violet-500/30 rounded-xl px-4 py-2.5 transition-all hover:bg-violet-500/5"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((message, idx) => (
          <div
            key={message.id}
            className={`flex gap-3 animate-fade-up ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            {/* Assistant avatar */}
            {message.role === 'assistant' && (
              <div className="relative flex-shrink-0 mt-1">
                <div className="absolute inset-0 rounded-2xl bg-violet-600/30 blur-md" />
                <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              </div>
            )}

            <div className={`max-w-[85%] ${message.role === 'user' ? 'order-1' : ''}`}>
              {/* Bubble */}
              <div className={`relative rounded-3xl px-5 py-4 overflow-hidden
                ${message.role === 'user'
                  ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-br-sm shadow-lg shadow-violet-900/30'
                  : 'bg-slate-900/80 border border-white/5 text-slate-200 rounded-bl-sm'
                }`}
              >
                {message.role === 'user' && (
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                )}
                <div className={`prose prose-sm max-w-none break-words ${message.role === 'assistant' ? 'prose-dark' : 'prose-invert'}`}>
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>

              {/* Sources */}
              {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                <div className="mt-3 ml-2">
                  <button
                    type="button"
                    onClick={() => toggleSources(message.id)}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-violet-400 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {message.sources.length} Reference{message.sources.length > 1 ? 's' : ''}
                    {expandedSources.has(message.id)
                      ? <ChevronUp className="w-3.5 h-3.5" />
                      : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {expandedSources.has(message.id) && (
                    <div className="mt-3 space-y-2">
                      {message.sources.map((source) => (
                        <div
                          key={source.sourceIndex}
                          className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-violet-500/30 transition-all group"
                        >
                          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                            <span className="text-xs font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-lg">
                              [{source.sourceIndex}]
                            </span>
                            <span className="text-xs font-semibold text-slate-200 truncate">{source.filename}</span>
                            <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-lg ml-auto flex-shrink-0">p.{source.pageNumber}</span>
                            <span className="text-xs font-mono text-slate-600 flex-shrink-0">{(source.similarity * 100).toFixed(0)}%</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{source.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User avatar */}
            {message.role === 'user' && (
              <div className="relative flex-shrink-0 order-2 mt-1">
                <div className="w-9 h-9 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-200" />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start animate-fade-up">
            <div className="relative flex-shrink-0 mt-1">
              <div className="absolute inset-0 rounded-2xl bg-violet-600/30 blur-md" />
              <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="bg-slate-900/80 border border-white/5 rounded-3xl rounded-bl-sm px-6 py-4 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-violet-500 dot-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-fuchsia-500 dot-bounce" style={{ animationDelay: '200ms' }} />
                <div className="w-2 h-2 rounded-full bg-cyan-500 dot-bounce" style={{ animationDelay: '400ms' }} />
              </div>
              <span className="text-xs font-semibold text-slate-300">Analyzing your documents...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="flex-shrink-0 p-4 border-t border-white/5 bg-slate-950/50">
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-center gap-3">
            <div className={`flex-1 relative flex items-center rounded-2xl border transition-all duration-300 overflow-hidden
              ${!hasDocuments || isLoading
                ? 'border-slate-800 bg-slate-900/50'
                : 'border-slate-700 bg-slate-900/80 focus-within:border-violet-500/50 focus-within:shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)]'
              }`}
            >
              {/* Inner glow on focus */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent opacity-0 focus-within:opacity-100 transition-opacity" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={hasDocuments ? 'Ask anything about your documents...' : 'Upload a document to start...'}
                disabled={!hasDocuments || isLoading}
                className="flex-1 px-5 py-4 bg-transparent text-sm font-medium text-slate-200 placeholder-slate-600 focus:outline-none disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isLoading || !hasDocuments}
              className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200
                ${input.trim() && hasDocuments && !isLoading
                  ? 'bg-gradient-to-tr from-violet-600 to-fuchsia-500 text-white hover:scale-105 shadow-lg shadow-violet-900/40 glow-violet'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
            >
              <Send className="w-4.5 h-4.5 w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
