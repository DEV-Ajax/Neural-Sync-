import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flashcard } from '../types';
import { Sparkles, Brain, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

interface StudyModeProps {
  cards: Flashcard[];
  onReviewCompleted: () => void;
}

export const StudyMode: React.FC<StudyModeProps> = ({ cards, onReviewCompleted }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentCard = cards[currentIndex];

  if (!cards.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 text-center shadow-2xl relative">
        <Sparkles className="w-12 h-12 text-slate-600 mb-4" />
        <h3 className="text-xl font-bold text-white">All caught up!</h3>
        <p className="text-slate-500 mt-2 font-mono text-[10px] uppercase tracking-widest">No pending cards in your learning loop.</p>
      </div>
    );
  }

  const handleSelect = (option: string) => {
    if (isRevealed) return;
    setSelectedOption(option);
    setIsRevealed(true);
  };

  const submitQuality = async (quality: number) => {
    setIsSubmitting(true);
    try {
      await fetch(`/api/flashcards/${currentCard.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality }),
      });
      
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(c => c + 1);
        setSelectedOption(null);
        setIsRevealed(false);
      } else {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#06b6d4', '#ffffff']
        });
        setTimeout(() => {
          onReviewCompleted();
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to submit review", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center py-10">
      {/* Ambient Background Glow */}
      <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="w-full flex-1 max-w-2xl bg-white/[0.02] border border-white/10 rounded-[2rem] flex flex-col items-center justify-center p-6 md:p-12 shadow-2xl relative overflow-hidden">
        
        {/* Kinetic Text Backdrop */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5 z-0">
           <div className="absolute text-[120px] font-black uppercase italic -left-20 top-0 whitespace-nowrap">HEURISTIC</div>
           <div className="absolute text-[120px] font-black uppercase italic -right-40 bottom-10 whitespace-nowrap">SCHEDULING</div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id}
            initial={{ opacity: 0, rotateX: 10, y: 20 }}
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, rotateX: -10, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
            className="w-full bg-[#0E0E14] border border-white/10 rounded-3xl p-8 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] relative transform perspective-1000 z-10"
          >
            <div className="absolute -top-3 left-8 bg-violet-600 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]">
              Node: {currentCard.concept_tag}
            </div>

            <div className="flex items-center justify-between mb-6 pt-2">
               <div className="inline-flex items-center gap-2">
                  <Brain className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest">Prompt Challenge</span>
               </div>
               <div className="font-mono text-[10px] text-slate-500 tracking-widest">
                  {currentIndex + 1} / {cards.length}
               </div>
            </div>

            <h2 className="text-2xl font-bold text-white leading-tight tracking-tight italic mb-8">
              {currentCard.question}
            </h2>

            <div className="grid gap-3 mt-auto">
              {currentCard.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === currentCard.correct_answer;
                
                let stateClass = "bg-white/5 border-white/10 hover:border-white/30 text-slate-300";
                
                if (isRevealed) {
                  if (isCorrect) {
                    stateClass = "bg-white/10 border-cyan-400/50 text-white font-bold ring-1 ring-cyan-400/20";
                  } else if (isSelected && !isCorrect) {
                    stateClass = "bg-white/5 border-red-500/50 text-red-400";
                  } else {
                    stateClass = "bg-white/5 border-white/5 text-slate-600 opacity-50";
                  }
                }

                return (
                  <motion.button
                    key={idx}
                    whileHover={!isRevealed ? { scale: 1.01 } : {}}
                    whileTap={!isRevealed ? { scale: 0.98 } : {}}
                    onClick={() => handleSelect(option)}
                    disabled={isRevealed}
                    className={cn(
                      "text-left p-4 rounded-xl border transition-all duration-300 flex items-center justify-between group",
                      stateClass
                    )}
                  >
                    <span className="text-sm">{option}</span>
                    <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                      {isRevealed ? (isCorrect ? 'Correct' : (isSelected ? 'Incorrect' : '')) : `Option ${String.fromCharCode(65 + idx)}`}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {isRevealed && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                     <p className="text-[10px] font-bold text-slate-400 text-center mb-3 uppercase tracking-widest">
                       Assess SM-2 Recall Quality
                     </p>
                     <div className="flex gap-2">
                       {[
                         { q: 0, label: "Blank", color: "hover:bg-red-500 hover:text-white" },
                         { q: 2, label: "Hard", color: "hover:bg-orange-500 hover:text-white" },
                         { q: 4, label: "Good", color: "hover:bg-cyan-500 hover:text-white shadow-cyan-500/20" },
                         { q: 5, label: "Perfect", color: "hover:bg-violet-500 hover:text-white shadow-violet-500/20" },
                       ].map(({ q, label, color }) => (
                         <button
                           key={q}
                           disabled={isSubmitting}
                           onClick={() => submitQuality(q)}
                           className={cn(
                             "flex-1 py-2 px-2 rounded border border-white/10 bg-transparent text-[10px] uppercase font-bold tracking-widest text-slate-300 transition-all disabled:opacity-50 hover:shadow-[0_0_15px_inherit]",
                             color
                           )}
                         >
                           {label}
                         </button>
                       ))}
                     </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
