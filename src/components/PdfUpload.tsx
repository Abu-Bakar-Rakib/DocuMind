import { useCallback, useState } from 'react';
import { Upload, Loader2, AlertCircle, CheckCircle, FileText, Zap } from 'lucide-react';
import { extractPdfText, createChunks } from '../lib/pdf-processor';
import { storeChunks } from '../lib/api';

interface PdfUploadProps {
  onUploadSuccess: (filename: string, pageCount: number, chunkCount: number) => void;
  disabled: boolean;
}

export function PdfUpload({ onUploadSuccess, disabled }: PdfUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [lastFile, setLastFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const processFile = useCallback(async (file: File) => {
    if (disabled) return;

    setIsProcessing(true);
    setStatus('idle');
    setProgress(10);
    setMessage('Extracting text from PDF...');
    setLastFile(file.name);

    try {
      const pages = await extractPdfText(file);
      setProgress(35);

      if (pages.every(p => !p.text.trim())) {
        throw new Error('No extractable text found in this PDF.');
      }

      setMessage('Creating semantic chunks...');
      setProgress(55);
      const chunks = createChunks(pages);

      if (chunks.length === 0) {
        throw new Error('No text chunks could be created from this PDF.');
      }

      setMessage('Generating vector embeddings...');
      setProgress(75);

      const result = await storeChunks({ filename: file.name, chunks });
      setProgress(100);

      setStatus('success');
      setMessage(`Successfully indexed "${file.name}"`);
      onUploadSuccess(file.name, result.pageCount, result.chunkCount);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to process PDF');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  }, [disabled, onUploadSuccess]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  return (
    <div className="w-full space-y-4">
      <div
        role="button"
        tabIndex={0}
        className={`relative overflow-hidden rounded-2xl p-8 text-center transition-all duration-500 cursor-pointer group
          ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}
          ${isProcessing ? 'pointer-events-none' : ''}
          ${isDragging
            ? 'border-2 border-violet-500 bg-violet-500/8 scale-[1.02]'
            : 'border-2 border-dashed border-slate-700 hover:border-violet-500/60 hover:bg-violet-500/5'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => { if (!disabled && !isProcessing) document.getElementById('pdf-input')?.click(); }}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isProcessing) document.getElementById('pdf-input')?.click(); }}
      >
        {/* Shimmer sweep on hover */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-violet-500/5 to-transparent pointer-events-none" />

        {/* Drag active glow */}
        {isDragging && (
          <div className="absolute inset-0 bg-violet-500/5 pointer-events-none rounded-2xl" />
        )}

        <input
          id="pdf-input"
          type="file"
          accept="application/pdf"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled || isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-5 py-4">
            {/* Processing animation */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-violet-600/30 blur-xl animate-pulse-glow scale-150" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-slate-200 font-bold text-base mb-1">{message}</p>
              <p className="text-slate-500 text-xs font-medium">Please wait, this may take a moment...</p>
            </div>
            {/* Progress bar */}
            <div className="w-full max-w-xs bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-bold text-violet-400">{progress}%</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-violet-600/20 blur-lg group-hover:bg-violet-600/40 transition-all duration-500 scale-110" />
              <div className="relative w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 group-hover:border-violet-500/50 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                <Upload className="w-7 h-7 text-slate-400 group-hover:text-violet-400 transition-colors" />
              </div>
            </div>
            <div>
              <p className="text-slate-200 font-bold text-lg mb-1">
                {isDragging ? '✨ Drop to analyze' : 'Drop your PDF here'}
              </p>
              <p className="text-slate-500 text-sm font-medium">
                or <span className="text-violet-400 font-bold hover:text-violet-300">click to browse</span>
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> PDF only</span>
              <div className="w-px h-3 bg-slate-700" />
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> AI-powered indexing</span>
            </div>
          </div>
        )}
      </div>

      {/* Status message */}
      {status !== 'idle' && !isProcessing && (
        <div className={`relative overflow-hidden rounded-2xl p-4 flex items-start gap-3 border transition-all animate-fade-up
          ${status === 'success'
            ? 'bg-emerald-500/8 border-emerald-500/20'
            : 'bg-red-500/8 border-red-500/20'
          }`}
        >
          <div className={`absolute inset-x-0 top-0 h-px ${status === 'success' ? 'bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent' : 'bg-gradient-to-r from-transparent via-red-500/50 to-transparent'}`} />
          {status === 'success' ? (
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 w-5 h-5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
          )}
          <div>
            <p className={`font-bold text-sm ${status === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>{message}</p>
            {status === 'error' && lastFile && (
              <p className="text-xs font-medium mt-1 text-slate-500">File: {lastFile}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
