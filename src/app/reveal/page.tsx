'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Session, Participant, Vote, CategoryIndex } from '@/lib/types';
import { CATEGORIES, getActualSide, getAvatarColor } from '@/lib/constants';

type RevealState = 'spectrum' | 'transition' | 'groups';

interface AggregatedData {
  [participantId: string]: {
    [category: number]: {
      mean: number;
      count: number;
    };
  };
}

function RevealContent() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get('code');

  const [code, setCode] = useState(codeFromUrl || '');
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [aggregates, setAggregates] = useState<AggregatedData>({});
  const [error, setError] = useState('');

  const [currentCategory, setCurrentCategory] = useState<CategoryIndex>(0);
  const [revealState, setRevealState] = useState<RevealState>('spectrum');

  // Load session data
  useEffect(() => {
    if (codeFromUrl) {
      loadSession(codeFromUrl);
    }
  }, [codeFromUrl]);

  async function loadSession(sessionCode: string) {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', sessionCode.toUpperCase())
        .single();

      if (sessionError || !sessionData) {
        setError('Partie non trouvée');
        return;
      }

      setSession(sessionData);
      setCurrentCategory(sessionData.current_category as CategoryIndex);

      const { data: participantsData } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionData.id)
        .order('created_at');

      if (participantsData) {
        setParticipants(participantsData);
      }

      // Load votes
      const { data: votesData } = await supabase
        .from('votes')
        .select('*')
        .eq('session_id', sessionData.id);

      if (votesData) {
        aggregateVotes(votesData);
      }
    } catch (err) {
      console.error('Error loading session:', err);
      setError('Erreur de connexion');
    }
  }

  function aggregateVotes(votes: Vote[]) {
    const agg: AggregatedData = {};

    votes.forEach((vote) => {
      if (!agg[vote.target_id]) {
        agg[vote.target_id] = {};
      }
      if (!agg[vote.target_id][vote.category]) {
        agg[vote.target_id][vote.category] = { mean: 0, count: 0 };
      }

      const current = agg[vote.target_id][vote.category];
      const newCount = current.count + 1;
      const newMean = (current.mean * current.count + vote.position) / newCount;

      agg[vote.target_id][vote.category] = {
        mean: newMean,
        count: newCount,
      };
    });

    setAggregates(agg);
  }

  // Keyboard controls
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealState, currentCategory]);

  async function nextStep() {
    if (revealState === 'spectrum') {
      setRevealState('transition');
      setTimeout(() => setRevealState('groups'), 1500);
    } else if (revealState === 'groups') {
      if (currentCategory < 3) {
        const nextCat = (currentCategory + 1) as CategoryIndex;
        setCurrentCategory(nextCat);
        setRevealState('spectrum');

        // Update session
        if (session) {
          await supabase
            .from('sessions')
            .update({ current_category: nextCat })
            .eq('id', session.id);
        }
      }
    }
  }

  function prevStep() {
    if (revealState === 'groups') {
      setRevealState('spectrum');
    } else if (revealState === 'spectrum' && currentCategory > 0) {
      const prevCat = (currentCategory - 1) as CategoryIndex;
      setCurrentCategory(prevCat);
      setRevealState('groups');
    }
  }

  // Code entry screen
  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md w-full glass p-8"
        >
          <h1 className="text-5xl font-bold mb-4 text-gradient">Révélation</h1>
          <p className="text-[var(--muted-foreground)] mb-8">
            Entrez le code de la partie
          </p>

          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && loadSession(code)}
            placeholder="CODE"
            className="input text-center text-4xl tracking-widest uppercase mb-4"
            maxLength={6}
            autoFocus
          />

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[var(--error)] mb-4"
            >
              {error}
            </motion.p>
          )}

          <button
            onClick={() => loadSession(code)}
            disabled={code.length < 4}
            className="btn btn-primary w-full text-xl py-4"
          >
            Commencer →
          </button>
        </motion.div>
      </main>
    );
  }

  const category = CATEGORIES[currentCategory];

  // Group participants by their actual MBTI
  const leftGroup = participants.filter(
    (p) => getActualSide(p.real_mbti, currentCategory) === 'left'
  );
  const rightGroup = participants.filter(
    (p) => getActualSide(p.real_mbti, currentCategory) === 'right'
  );

  return (
    <main className="min-h-screen p-8 flex flex-col overflow-hidden">
      {/* Progress indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center gap-3 mb-8"
      >
        {CATEGORIES.map((cat, idx) => (
          <div
            key={cat.index}
            className={`w-16 h-2 rounded-full transition-all ${
              idx < currentCategory
                ? 'bg-[var(--success)]'
                : idx === currentCategory
                ? 'bg-[var(--secondary)]'
                : 'bg-[var(--muted)]'
            }`}
          />
        ))}
      </motion.div>

      {/* Category title */}
      <motion.div
        key={currentCategory}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <span className="text-6xl mb-4 block">{category.emoji}</span>
        <h1 className="text-5xl font-bold">
          <span className="text-[var(--primary)]">{category.left}</span>
          {' ou '}
          <span className="text-[var(--accent)]">{category.right}</span>
          {' ?'}
        </h1>
      </motion.div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col justify-center relative">
        <AnimatePresence mode="wait">
          {/* State A: Spectrum with guessed positions */}
          {(revealState === 'spectrum' || revealState === 'transition') && (
            <motion.div
              key="spectrum"
              initial={{ opacity: 0 }}
              animate={{ opacity: revealState === 'transition' ? 0.3 : 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              {/* Labels */}
              <div className="flex justify-between text-3xl font-bold mb-6 px-4">
                <span className="text-[var(--primary)]">{category.left}</span>
                <span className="text-[var(--accent)]">{category.right}</span>
              </div>

              {/* Spectrum bar */}
              <div className="relative h-40 bg-gradient-to-r from-[var(--primary)]/30 via-transparent to-[var(--accent)]/30 rounded-full border-2 border-[var(--border)]">
                {/* Center line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[var(--border)]" />

                {/* Participants at guessed positions */}
                {participants.map((participant, index) => {
                  const agg = aggregates[participant.id]?.[currentCategory];
                  const position = agg?.mean ?? 50;
                  const actualSide = getActualSide(participant.real_mbti, currentCategory);
                  const targetPosition = actualSide === 'left' ? 15 : 85;

                  const initials = participant.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <motion.div
                      key={participant.id}
                      initial={{ scale: 0 }}
                      animate={{
                        scale: 1,
                        left: revealState === 'transition' 
                          ? `${targetPosition}%` 
                          : `${position}%`,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: revealState === 'transition' ? 50 : 200,
                        damping: revealState === 'transition' ? 15 : 20,
                        delay: revealState === 'transition' ? index * 0.1 : 0,
                      }}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                      style={{ left: `${position}%` }}
                    >
                      <div
                        className="w-24 h-24 rounded-full flex items-center justify-center font-bold text-white text-2xl shadow-xl"
                        style={{ backgroundColor: getAvatarColor(index) }}
                      >
                        {initials}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <p className="text-center text-[var(--muted-foreground)] mt-8 text-xl">
                {revealState === 'spectrum' 
                  ? '👆 Perception du groupe'
                  : '✨ Révélation...'}
              </p>
            </motion.div>
          )}

          {/* State B: Two groups with real MBTI */}
          {revealState === 'groups' && (
            <motion.div
              key="groups"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-between px-8"
            >
              {/* Left group */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex-1 max-w-md"
              >
                <h2 className="text-4xl font-bold text-[var(--primary)] text-center mb-8">
                  {category.left}
                </h2>
                <div className="flex flex-wrap justify-center gap-6">
                  {leftGroup.map((participant, idx) => {
                    const index = participants.indexOf(participant);
                    const initials = participant.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <motion.div
                        key={participant.id}
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        className="flex flex-col items-center"
                      >
                        <div
                          className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-white text-xl shadow-lg glow-red"
                          style={{ backgroundColor: getAvatarColor(index) }}
                        >
                          {initials}
                        </div>
                        <p className="mt-2 font-medium text-lg">
                          {participant.name.split(' ')[0]}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Divider */}
              <div className="w-px bg-[var(--border)] mx-8" />

              {/* Right group */}
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex-1 max-w-md"
              >
                <h2 className="text-4xl font-bold text-[var(--accent)] text-center mb-8">
                  {category.right}
                </h2>
                <div className="flex flex-wrap justify-center gap-6">
                  {rightGroup.map((participant, idx) => {
                    const index = participants.indexOf(participant);
                    const initials = participant.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <motion.div
                        key={participant.id}
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        className="flex flex-col items-center"
                      >
                        <div
                          className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-white text-xl shadow-lg"
                          style={{ 
                            backgroundColor: getAvatarColor(index),
                            boxShadow: '0 0 30px rgba(34, 139, 34, 0.4)'
                          }}
                        >
                          {initials}
                        </div>
                        <p className="mt-2 font-medium text-lg">
                          {participant.name.split(' ')[0]}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-[var(--muted-foreground)] mt-8"
      >
        <p>Appuyez sur <kbd className="px-2 py-1 bg-[var(--muted)] rounded">→</kbd> ou <kbd className="px-2 py-1 bg-[var(--muted)] rounded">Espace</kbd> pour continuer</p>
      </motion.div>

      {/* Navigation buttons (for touch) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
        <button
          onClick={prevStep}
          className="btn btn-ghost text-2xl w-16 h-16 rounded-full"
          disabled={currentCategory === 0 && revealState === 'spectrum'}
        >
          ←
        </button>
        <button
          onClick={nextStep}
          className="btn btn-primary text-2xl w-16 h-16 rounded-full"
          disabled={currentCategory === 3 && revealState === 'groups'}
        >
          →
        </button>
      </div>
    </main>
  );
}

export default function RevealPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-2xl">⏳ Chargement...</div>
        </main>
      }
    >
      <RevealContent />
    </Suspense>
  );
}

