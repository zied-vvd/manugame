'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { supabase, getCurrentSession, getCurrentParticipant } from '@/lib/supabase';
import { Participant, Session, Vote, CategoryIndex } from '@/lib/types';
import { CATEGORIES } from '@/lib/constants';
import { VotingScreen } from '@/components/VotingScreen';
import { VotingTutorial } from '@/components/VotingTutorial';

const TUTORIAL_KEY = 'manugame_tutorial_seen';

export default function PlayPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  // Check if tutorial should be shown
  useEffect(() => {
    const seen = localStorage.getItem(TUTORIAL_KEY);
    if (!seen) {
      setShowTutorial(true);
    }
  }, []);

  const handleTutorialComplete = () => {
    localStorage.setItem(TUTORIAL_KEY, 'true');
    setShowTutorial(false);
  };

  // Load session and participant data
  useEffect(() => {
    async function loadData() {
      const sessionInfo = getCurrentSession();
      const participantId = getCurrentParticipant();

      if (!sessionInfo || !participantId) {
        router.push('/');
        return;
      }

      try {
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionInfo.sessionId)
          .single();

        if (sessionData) {
          setSession(sessionData);
        }

        const { data: participantData } = await supabase
          .from('participants')
          .select('*')
          .eq('id', participantId)
          .single();

        if (participantData) {
          setCurrentParticipant(participantData);
        }

        const { data: allParticipantsData } = await supabase
          .from('participants')
          .select('*')
          .eq('session_id', sessionInfo.sessionId)
          .order('created_at');

        if (allParticipantsData) {
          setAllParticipants(allParticipantsData);
        }

        const { data: votesData } = await supabase
          .from('votes')
          .select('*')
          .eq('voter_id', participantId);

        if (votesData) {
          setVotes(votesData);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Subscribe to session changes
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('session-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload: { new: Session }) => {
          setSession(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  function getVoteCount(categoryIndex: CategoryIndex): number {
    return votes.filter((v) => v.category === categoryIndex).length;
  }

  function getTargetCount(): number {
    return allParticipants.filter((p) => p.id !== currentParticipant?.id).length;
  }

  function getTotalProgress(): { voted: number; total: number } {
    const targetCount = getTargetCount();
    const totalVotes = CATEGORIES.length * targetCount;
    const currentVotes = votes.length;
    return { voted: currentVotes, total: totalVotes };
  }

  async function saveVote(targetId: string, category: CategoryIndex, position: number) {
    if (!currentParticipant || !session) return;

    const existingVoteIndex = votes.findIndex(
      (v) => v.target_id === targetId && v.category === category
    );

    const newVote: Vote = {
      id: existingVoteIndex >= 0 ? votes[existingVoteIndex].id : crypto.randomUUID(),
      session_id: session.id,
      voter_id: currentParticipant.id,
      target_id: targetId,
      category,
      position,
      updated_at: new Date().toISOString(),
    };

    if (existingVoteIndex >= 0) {
      setVotes((prev) =>
        prev.map((v, i) => (i === existingVoteIndex ? newVote : v))
      );
    } else {
      setVotes((prev) => [...prev, newVote]);
    }

    try {
      const { error } = await supabase.from('votes').upsert(
        {
          session_id: session.id,
          voter_id: currentParticipant.id,
          target_id: targetId,
          category,
          position,
        },
        {
          onConflict: 'voter_id,target_id,category',
        }
      );

      if (error) throw error;
    } catch (err) {
      console.error('Error saving vote:', err);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl"
        >
          ⏳ Chargement...
        </motion.div>
      </main>
    );
  }

  // Lobby phase
  if (session?.phase === 'lobby') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center glass p-8"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-6xl mb-6"
          >
            ❄️
          </motion.div>
          <h1 className="text-3xl font-bold mb-4">
            Bienvenue, {currentParticipant?.name} !
          </h1>
          <p className="text-[var(--muted-foreground)] text-lg">
            En attente du début des votes...
          </p>
        </motion.div>
      </main>
    );
  }

  // Reveal phase
  if (session?.phase === 'reveal') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center glass p-8"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-6xl mb-6"
          >
            🎭
          </motion.div>
          <h1 className="text-3xl font-bold mb-4">Révélation en cours !</h1>
          <p className="text-[var(--muted-foreground)] text-lg">
            Regardez l&apos;écran principal
          </p>
        </motion.div>
      </main>
    );
  }

  // Voting screen for selected category (Step 2)
  if (selectedCategory !== null) {
    const targets = allParticipants.filter(
      (p) => p.id !== currentParticipant?.id
    );
    const categoryVotes = votes.filter((v) => v.category === selectedCategory);
    const isFirstCategory = selectedCategory === 0;
    const isLastCategory = selectedCategory === 3;

    const handleNext = () => {
      if (selectedCategory < 3) {
        setSelectedCategory((selectedCategory + 1) as CategoryIndex);
      }
    };

    const handlePrevious = () => {
      if (selectedCategory > 0) {
        setSelectedCategory((selectedCategory - 1) as CategoryIndex);
      }
    };

    return (
      <>
        <AnimatePresence>
          {showTutorial && <VotingTutorial onComplete={handleTutorialComplete} />}
        </AnimatePresence>
        <VotingScreen
          category={CATEGORIES[selectedCategory]}
          categoryIndex={selectedCategory}
          targets={targets}
          votes={categoryVotes}
          onVote={(targetId, position) => saveVote(targetId, selectedCategory, position)}
          onBack={() => setSelectedCategory(null)}
          onNext={handleNext}
          onPrevious={handlePrevious}
          isFirstCategory={isFirstCategory}
          isLastCategory={isLastCategory}
        />
      </>
    );
  }

  // Category selection (Step 1)
  const progress = getTotalProgress();
  const allComplete = CATEGORIES.every(
    (c) => getVoteCount(c.index) === getTargetCount()
  );

  return (
    <>
      <AnimatePresence>
        {showTutorial && <VotingTutorial onComplete={handleTutorialComplete} />}
      </AnimatePresence>

      <main className="min-h-screen p-6">
        <div className="max-w-lg mx-auto">
          {/* Step indicator */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-4 mb-6"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm">
                1
              </div>
              <span className="text-sm font-medium">Choisir</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30" />
            <div className="flex items-center gap-2 opacity-40">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <span className="text-sm">Voter</span>
            </div>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            className="mb-6"
          >
            <div className="flex justify-between text-xs text-[var(--muted-foreground)] mb-1">
              <span>Progression totale</span>
              <span>{progress.voted} / {progress.total} votes</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(progress.voted / progress.total) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-full"
              />
            </div>
          </motion.div>

          {/* Category cards */}
          <div className="space-y-3">
            {CATEGORIES.map((category, index) => {
              const voteCount = getVoteCount(category.index);
              const targetCount = getTargetCount();
              const isComplete = voteCount === targetCount;
              const progressPct = targetCount > 0 ? (voteCount / targetCount) * 100 : 0;

              return (
                <motion.button
                  key={category.index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  onClick={() => setSelectedCategory(category.index)}
                  className={`w-full glass rounded-2xl p-4 text-left transition-all relative overflow-hidden ${
                    isComplete
                      ? 'border-[var(--success)] bg-[var(--success)]/10'
                      : 'hover:border-[var(--primary)] hover:scale-[1.02]'
                  }`}
                >
                  {/* Progress fill background */}
                  <div
                    className="absolute inset-0 bg-[var(--primary)]/10 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />

                  <div className="relative flex items-center gap-4">
                    {/* Emojis */}
                    <div className="flex flex-col items-center text-2xl">
                      <span>{category.leftEmoji}</span>
                      <span className="text-xs text-white/40">↕</span>
                      <span>{category.rightEmoji}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lg flex items-center gap-2">
                        <span className="text-[var(--primary)]">{category.left}</span>
                        <span className="text-white/30">vs</span>
                        <span className="text-[var(--accent)]">{category.right}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--success)] rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                          {voteCount}/{targetCount}
                        </span>
                      </div>
                    </div>

                    {/* Status icon */}
                    <div className="text-2xl">
                      {isComplete ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400 }}
                        >
                          ✅
                        </motion.span>
                      ) : (
                        <ChevronRight className="w-6 h-6 text-white/40" />
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Completion message */}
          <AnimatePresence>
            {allComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-6 text-center glass p-4 rounded-xl border-[var(--success)]"
              >
                <span className="text-[var(--success)] font-semibold text-lg">
                  🎉 Tous les votes sont complets !
                </span>
                <p className="text-[var(--muted-foreground)] text-sm mt-1">
                  Attendez la révélation sur l&apos;écran principal
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Help button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => setShowTutorial(true)}
            className="mt-6 mx-auto block text-sm text-[var(--muted-foreground)] hover:text-white transition-colors"
          >
            ❓ Comment voter ?
          </motion.button>
        </div>
      </main>
    </>
  );
}
