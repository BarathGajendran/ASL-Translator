import React, { useState } from 'react';
import { HelpCircle, ChevronRight, X, Sparkles, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ASLCheatSheet = () => {
  const [isOpen, setIsOpen] = useState(false);

  const guideCards = [
    { sign: 'A', name: 'Fist pose', desc: 'Hold hand in a tight fist, with thumb resting flat against the side of your index finger.' },
    { sign: 'B', name: 'Open hand', desc: 'Extend index, middle, ring, and pinky straight up. Fold thumb across your palm.' },
    { sign: 'C', name: 'Cup shape', desc: 'Curve all fingers and thumb to form a hollow semi-circle (the letter C).' },
    { sign: 'L', name: 'L shape', desc: 'Extend thumb and index finger straight up/out (forming an L). Curl middle, ring, and pinky.' },
    { sign: 'Y', name: 'Call me sign', desc: 'Extend only your thumb and pinky finger fully. Curl index, middle, and ring.' },
    { sign: 'Space', name: 'Flat hand', desc: 'Extend all 5 fingers fully flat (palm open) horizontally to submit a space.' },
    { sign: 'Delete', name: 'Thumb pose', desc: 'Make a tight fist, but extend only your thumb outwards (like thumbs-up/down) to backspace.' }
  ];

  return (
    <div>
      {/* Small floating button under the webcam or in the action area */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs bg-dark-hover hover:bg-dark-border text-gray-300 hover:text-white px-3.5 py-2.5 rounded-xl border border-dark-border transition-all duration-200"
      >
        <BookOpen className="h-4 w-4 text-primary-light animate-pulse" />
        ASL Pose Guide & Cheat Sheet
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl glass-panel-glow rounded-2xl p-6 relative overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-dark-border/60 pb-3 mb-4">
                <h3 className="text-md font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary-light" />
                  ASL Gesture Pose Cheat Sheet
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-dark-border text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Grid content of cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
                {guideCards.map((card) => (
                  <div
                    key={card.sign}
                    className="flex gap-3 bg-dark-bg/60 border border-dark-border/40 p-3.5 rounded-xl items-start hover:border-primary/20 transition-all duration-200"
                  >
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-lg shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                      {card.sign}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1">
                        {card.name}
                        <ChevronRight className="h-3 w-3 text-gray-500" />
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer hint */}
              <div className="mt-5 text-center text-[10px] text-gray-500 border-t border-dark-border/30 pt-3">
                Tip: Hold the hand pose completely steady for ~0.4s to type. If it misses, use the **Calibration Panel** to teach the AI your hand!
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ASLCheatSheet;
