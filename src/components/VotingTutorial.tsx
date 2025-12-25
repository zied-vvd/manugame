'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VotingTutorialProps {
  onComplete: () => void;
}

const STEPS = [
  {
    emoji: '👆',
    title: 'Glissez les avatars',
    description: 'Maintenez appuyé sur un avatar et faites-le glisser sur le spectre',
  },
  {
    emoji: '↔️',
    title: 'Placez sur le spectre',
    description: 'Plus à gauche = plus ce trait, plus à droite = plus l\'autre',
  },
  {
    emoji: '✨',
    title: 'Ajustez si besoin',
    description: 'Vous pouvez repositionner les avatars déjà placés',
  },
];

export function VotingTutorial({ onComplete }: VotingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass max-w-sm w-full p-6 rounded-2xl text-center"
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentStep
                  ? 'bg-[var(--primary)]'
                  : idx < currentStep
                  ? 'bg-[var(--success)]'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Animated emoji */}
            <motion.div
              animate={
                currentStep === 0
                  ? { y: [0, -10, 0] }
                  : currentStep === 1
                  ? { x: [-20, 20, -20] }
                  : { scale: [1, 1.2, 1] }
              }
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-6xl mb-4"
            >
              {STEPS[currentStep].emoji}
            </motion.div>

            <h2 className="text-xl font-bold mb-2">
              {STEPS[currentStep].title}
            </h2>
            <p className="text-[var(--muted-foreground)] mb-6">
              {STEPS[currentStep].description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Demo animation for first step */}
        {currentStep === 0 && (
          <motion.div
            className="relative h-20 mb-6 rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <motion.div
              animate={{ x: [20, 120, 120, 20] }}
              transition={{
                repeat: Infinity,
                duration: 2.5,
                times: [0, 0.4, 0.6, 1],
                ease: "easeInOut"
              }}
              className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold shadow-lg"
            >
              AB
            </motion.div>
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
          </motion.div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 py-3 rounded-xl text-[var(--muted-foreground)] hover:text-white transition-colors"
          >
            Passer
          </button>
          <button
            onClick={handleNext}
            className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-opacity"
          >
            {currentStep < STEPS.length - 1 ? 'Suivant' : 'Compris !'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
