'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, getCurrentSession, getCurrentParticipant } from '@/lib/supabase';
import { Participant, Session, Vote, CategoryIndex } from '@/lib/types';
import { CATEGORIES } from '@/lib/constants';
import { VotingScreen } from '@/components/VotingScreen';

export default function PlayPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryIndex | null>(null);
  const [loading, setLoading] = useState(true);

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
        // Load session
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionInfo.sessionId)
          .single();

        if (sessionData) {
          setSession(sessionData);
        }

        // Load current participant
        const { data: participantData } = await supabase
          .from('participants')
          .select('*')
          .eq('id', participantId)
          .single();

        if (participantData) {
          setCurrentParticipant(participantData);
        }

        // Load all participants
        const { data: allParticipantsData } = await supabase
          .from('participants')
          .select('*')
          .eq('session_id', sessionInfo.sessionId)
          .order('created_at');

        if (allParticipantsData) {
          setAllParticipants(allParticipantsData);
        }

        // Load existing votes
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

  // Get vote count per category
  function getVoteCount(categoryIndex: CategoryIndex): number {
    const targetCount = allParticipants.filter(
      (p) => p.id !== currentParticipant?.id
    ).length;
    const votedCount = votes.filter((v) => v.category === categoryIndex).length;
    return votedCount;
  }

  function getTargetCount(): number {
    return allParticipants.filter((p) => p.id !== currentParticipant?.id).length;
  }

  async function saveVote(targetId: string, category: CategoryIndex, position: number) {
    if (!currentParticipant || !session) return;

    // Optimistic update
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

  // Show waiting screen if not in voting phase
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

  // Show reveal message if in reveal phase
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

  // Voting screen for selected category
  if (selectedCategory !== null) {
    const targets = allParticipants.filter(
      (p) => p.id !== currentParticipant?.id
    );
    const categoryVotes = votes.filter((v) => v.category === selectedCategory);

    return (
      <VotingScreen
        category={CATEGORIES[selectedCategory]}
        targets={targets}
        votes={categoryVotes}
        onVote={(targetId, position) => saveVote(targetId, selectedCategory, position)}
        onBack={() => setSelectedCategory(null)}
      />
    );
  }

  // Category selection screen
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-bold mb-2">
            Votez, {currentParticipant?.name} !
          </h1>
          <p className="text-[var(--muted-foreground)]">
            Placez chaque personne sur le spectre
          </p>
        </motion.div>

        <div className="space-y-4">
          {CATEGORIES.map((category, index) => {
            const voteCount = getVoteCount(category.index);
            const targetCount = getTargetCount();
            const isComplete = voteCount === targetCount;

            return (
              <motion.button
                key={category.index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedCategory(category.index)}
                className={`w-full card flex items-center gap-4 text-left transition-all ${
                  isComplete
                    ? 'border-[var(--success)] bg-[var(--success)]/10'
                    : 'hover:border-[var(--primary)]'
                }`}
              >
                <span className="text-3xl">{category.emoji}</span>
                <div className="flex-1">
                  <div className="font-semibold text-lg">
                    {category.left} / {category.right}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)]">
                    {voteCount} / {targetCount} votes
                  </div>
                </div>
                <div className="text-2xl">
                  {isComplete ? '✅' : '→'}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Progress summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <div className="text-[var(--muted-foreground)]">
            {CATEGORIES.every(
              (c) => getVoteCount(c.index) === getTargetCount()
            ) ? (
              <span className="text-[var(--success)] font-semibold">
                ✨ Tous les votes sont complets !
              </span>
            ) : (
              <span>Complétez tous les votes pour chaque catégorie</span>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}

