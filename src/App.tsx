import React, { useEffect, useState } from 'react';
import { IngestForm } from './components/IngestForm';
import { GraphView } from './components/GraphView';
import { StudyMode } from './components/StudyMode';
import { Flashcard, GraphData } from './types';
import { Database, Play, BookOpen, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ViewMode = 'dashboard' | 'study';

export default function App() {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [graphRes, dueRes] = await Promise.all([
        fetch('/api/graph'),
        fetch('/api/flashcards/due')
      ]);
      const gData = await graphRes.json();
      const dCards = await dueRes.json();
      setGraphData(gData);
      setDueCards(dCards.cards || []);
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleReviewCompleted = () => {
    setView('dashboard');
    fetchDashboardData();
  };

  return (
    <div className="min-h-screen bg-[#050508] text-slate-200 font-sans selection:bg-violet-500/30 flex flex-col overflow-hidden">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 md:px-8 py-4 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
          <div className="w-8 h-8 bg-gradient-to-tr from-violet-600 to-cyan-400 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.4)] shrink-0">
            <span className="font-black text-white text-xs italic">NS</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-white">Neural Sync</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono hidden sm:block">Adaptive System v1.0.4</p>
          </div>
        </div>
        
        <nav className="flex items-center justify-center gap-1 sm:gap-2 bg-black/40 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/10 w-full sm:w-auto">
          <button
            onClick={() => { setView('dashboard'); fetchDashboardData(); }}
            className={`px-3 sm:px-4 py-2 rounded-xl text-[9px] sm:text-[10px] uppercase tracking-widest font-bold transition-all ${
              view === 'dashboard' 
                ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-1.5 sm:gap-2"><Database className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Dashboard</span>
          </button>
          <button
            onClick={() => setView('study')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-[9px] sm:text-[10px] uppercase tracking-widest font-bold transition-all ${
              view === 'study' 
                ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-1.5 sm:gap-2">
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
              Study Loop
              {dueCards.length > 0 && (
                <span className="ml-1 bg-violet-500 text-white text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded font-mono">
                  {dueCards.length}
                </span>
              )}
            </span>
          </button>
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-12">
        <div className="max-w-7xl mx-auto w-full h-full">
          <AnimatePresence mode="wait">
            {view === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid lg:grid-cols-3 gap-6 h-full min-h-[600px]"
              >
                <div className="lg:col-span-1 flex flex-col gap-6">
                  <IngestForm onIngestSuccess={fetchDashboardData} />
                  
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 shadow-xl relative overflow-hidden flex-1 flex flex-col">
                     <div className="flex items-center gap-3 mb-6">
                       <div className="p-3 bg-white/5 border border-white/10 text-cyan-400 rounded-xl">
                          <BookOpen className="w-5 h-5" />
                       </div>
                       <div>
                         <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Pending Loop</h2>
                         <p className="text-sm font-bold text-white tracking-tight">Cards due for SM-2 review</p>
                       </div>
                     </div>
                     
                     <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl mt-auto">
                       <span className="text-3xl font-mono text-cyan-400 font-bold">
                         {dueCards.length}
                       </span>
                       <button 
                         onClick={() => setView('study')}
                         disabled={dueCards.length === 0}
                         className="bg-white hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-white text-black px-5 py-2.5 rounded-full text-[10px] uppercase tracking-widest font-black transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:shadow-none"
                       >
                         Start Session
                       </button>
                     </div>
                  </div>
                </div>
                
                <div className="lg:col-span-2 relative h-full">
                  <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-600/10 blur-[100px] rounded-full pointer-events-none"></div>
                  <GraphView data={graphData} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="study"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4 }}
                className="h-full"
              >
                <StudyMode cards={dueCards} onReviewCompleted={handleReviewCompleted} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
