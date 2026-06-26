import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Plus, BrainCircuit } from 'lucide-react';

interface IngestFormProps {
  onIngestSuccess: () => void;
}

export const IngestForm: React.FC<IngestFormProps> = ({ onIngestSuccess }) => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to ingest data');
      setText('');
      onIngestSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 shadow-xl relative overflow-hidden"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-white/5 border border-white/10 text-violet-400 rounded-xl">
           <BrainCircuit className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Data Ingestion</h2>
          <p className="text-sm font-bold text-white tracking-tight">Extracts nodes via Gemini API</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste lecture notes, articles, or concepts here..."
          className="w-full h-40 bg-white/5 border border-white/10 rounded-xl p-4 text-slate-300 font-mono text-[11px] resize-none focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-slate-600"
          disabled={isSubmitting}
        />
        
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-400 text-[10px] font-mono bg-red-500/10 p-3 rounded-lg border border-red-500/20 uppercase tracking-widest"
            >
              Error: {error}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={isSubmitting || !text.trim()}
          className="bg-white hover:bg-violet-400 disabled:bg-white/10 disabled:text-white/30 text-black font-black text-[10px] uppercase tracking-widest py-3 px-6 rounded-full transition-colors flex items-center justify-center gap-2 group shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Ingest & Generate Nodes
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
};
