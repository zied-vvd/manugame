'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Session, Participant, Vote, CategoryIndex, Award } from '@/lib/types';
import {
  CATEGORIES,
  getActualSide,
  getAvatarColor,
  calculateAwards,
  ALL_MBTI_TYPES,
  getGroupColor,
  getMBTIGroup,
  getGroupEmoji,
  getGroupName,
  MBTI_GROUP_COLORS,
  getMBTITypeImage,
  MBTI_DESCRIPTIONS,
  getCompatibilityScore,
  getCompatibilityVibe,
  COMPATIBILITY_VIBES,
  areGoldenPair,
  getOppositeMBTI,
} from '@/lib/constants';
import { MBTIType } from '@/lib/types';

type RevealState = 'spectrum' | 'transition' | 'groups' | 'awards' | 'personalities' | 'summary' | 'compatibility';

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
  const [rawVotes, setRawVotes] = useState<Vote[]>([]);
  const [error, setError] = useState('');

  const [currentCategory, setCurrentCategory] = useState<CategoryIndex>(0);
  const [revealState, setRevealState] = useState<RevealState>('spectrum');

  // Personalities reveal state
  const [currentTypeIndex, setCurrentTypeIndex] = useState(0);
  const [personalitiesPhase, setPersonalitiesPhase] = useState<'overview' | 'featuring' | 'revealed'>('overview');
  const [revealedTypes, setRevealedTypes] = useState<Set<MBTIType>>(new Set());

  // Computed: Group participants by their real MBTI type
  const participantsByType = useMemo(() => {
    const grouped: Partial<Record<MBTIType, Participant[]>> = {};
    ALL_MBTI_TYPES.forEach((type) => {
      const matching = participants.filter((p) => p.real_mbti === type);
      if (matching.length > 0) grouped[type] = matching;
    });
    return grouped;
  }, [participants]);

  // Types that exist in the group (ordered by group: NT, NF, SJ, SP)
  const typesInGroup = useMemo(
    () => ALL_MBTI_TYPES.filter((type) => (participantsByType[type]?.length ?? 0) > 0),
    [participantsByType]
  );

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
        setRawVotes(votesData);
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
    // Must include all state that nextStep/prevStep read
  }, [revealState, currentCategory, personalitiesPhase, currentTypeIndex, typesInGroup]);

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
      } else {
        // After final category, show awards
        setRevealState('awards');
      }
    } else if (revealState === 'awards') {
      // Transition to personalities reveal
      setRevealState('personalities');
      setCurrentTypeIndex(0);
      setPersonalitiesPhase('overview');
      setRevealedTypes(new Set());
    } else if (revealState === 'personalities') {
      if (personalitiesPhase === 'overview') {
        // Move from overview to first type featuring
        setPersonalitiesPhase('featuring');
      } else if (personalitiesPhase === 'featuring') {
        // Reveal people for current type
        setPersonalitiesPhase('revealed');
        setRevealedTypes((prev) => new Set([...prev, typesInGroup[currentTypeIndex]]));
      } else if (personalitiesPhase === 'revealed') {
        // Move to next type or summary
        if (currentTypeIndex < typesInGroup.length - 1) {
          setCurrentTypeIndex((prev) => prev + 1);
          setPersonalitiesPhase('featuring');
        } else {
          // All types revealed → go to summary
          setRevealState('summary');
        }
      }
    } else if (revealState === 'summary') {
      // Go to compatibility slide
      setRevealState('compatibility');
    }
    // compatibility state: nextStep does nothing (end of reveal)
  }

  function prevStep() {
    if (revealState === 'compatibility') {
      // Go back to summary
      setRevealState('summary');
    } else if (revealState === 'summary') {
      // Go back to personalities (all revealed)
      setRevealState('personalities');
    } else if (revealState === 'personalities') {
      if (personalitiesPhase === 'revealed') {
        // Go back to featuring (hide people)
        setPersonalitiesPhase('featuring');
        setRevealedTypes((prev) => {
          const next = new Set(prev);
          next.delete(typesInGroup[currentTypeIndex]);
          return next;
        });
      } else if (personalitiesPhase === 'featuring') {
        if (currentTypeIndex > 0) {
          // Go to previous type (revealed state)
          setCurrentTypeIndex((prev) => prev - 1);
          setPersonalitiesPhase('revealed');
        } else {
          // Go back to overview
          setPersonalitiesPhase('overview');
        }
      } else if (personalitiesPhase === 'overview') {
        // Go back to awards
        setRevealState('awards');
      }
    } else if (revealState === 'awards') {
      setRevealState('groups');
    } else if (revealState === 'groups') {
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
    <main className="h-screen max-h-screen p-6 flex flex-col overflow-hidden">
      {/* Progress indicator - hidden on awards, personalities, summary */}
      {!['awards', 'personalities', 'summary'].includes(revealState) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center gap-3 mb-4 shrink-0"
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
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col justify-center relative min-h-0">
        {revealState === 'compatibility' ? (
          <div className="h-full flex items-center justify-center">
            <CompatibilitySlide participants={participants} />
          </div>
        ) : revealState === 'summary' ? (
          <div className="h-full flex items-center justify-center">
            <SummarySlide participants={participants} />
          </div>
        ) : revealState === 'personalities' ? (
          <div className="h-full flex items-center justify-center">
            <PersonalitiesSlide
              typesInGroup={typesInGroup}
              participantsByType={participantsByType}
              currentTypeIndex={currentTypeIndex}
              revealedTypes={revealedTypes}
              personalitiesPhase={personalitiesPhase}
              participants={participants}
            />
          </div>
        ) : revealState === 'awards' ? (
          <div className="h-full flex items-center justify-center">
            <AwardsSlide
              participants={participants}
              rawVotes={rawVotes}
              aggregates={aggregates}
            />
          </div>
        ) : (
        <motion.div className="w-full max-w-7xl mx-auto flex flex-col flex-1">
          {/* Labels positioned at the ends */}
          <div className="flex justify-between items-center mb-4 px-8">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{category.leftEmoji}</span>
              <span className="text-2xl font-bold text-[var(--primary)] uppercase tracking-widest">{category.left}</span>
            </div>
            <div className="flex items-center gap-4 text-right">
              <span className="text-2xl font-bold text-[var(--accent)] uppercase tracking-widest">{category.right}</span>
              <span className="text-5xl">{category.rightEmoji}</span>
            </div>
          </div>

          {/* The morphing container */}
          <div className="flex-1 relative rounded-3xl overflow-hidden glass border-2 border-white/10 min-h-[70vh]">
            {/* Spectrum background - fades out */}
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 1 }}
              animate={{ opacity: revealState === 'spectrum' ? 1 : 0 }}
              transition={{ duration: 0.5 }}
              style={{
                background: 'linear-gradient(to right, rgba(91, 164, 212, 0.08), rgba(255,255,255,0.02) 50%, rgba(126, 184, 218, 0.08))',
              }}
            >
              {/* Spectrum grid lines */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/10" />
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/5" />
              {[0, 25, 50, 75, 100].map(tick => (
                <div
                  key={tick}
                  className="absolute top-0 bottom-0 w-px bg-white/5"
                  style={{ left: `${tick}%` }}
                />
              ))}
            </motion.div>

            {/* Groups background - fades in */}
            <motion.div
              className="absolute inset-0 flex"
              initial={{ opacity: 0 }}
              animate={{ opacity: revealState === 'groups' ? 1 : 0 }}
              transition={{ duration: 0.5, delay: revealState === 'groups' ? 0.3 : 0 }}
            >
              {/* Left zone */}
              <div
                className="flex-1 flex flex-col items-center justify-start pt-8"
                style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1), transparent)' }}
              >
                <motion.h2
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: revealState === 'groups' ? 1 : 0, y: revealState === 'groups' ? 0 : -20 }}
                  transition={{ delay: 0.5 }}
                  className="text-3xl font-black text-[var(--primary)] uppercase tracking-widest"
                >
                  {category.left}
                </motion.h2>
              </div>

              {/* Center divider */}
              <motion.div
                className="w-1 bg-gradient-to-b from-transparent via-white/20 to-transparent"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: revealState === 'groups' ? 1 : 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              />

              {/* Right zone */}
              <div
                className="flex-1 flex flex-col items-center justify-start pt-8"
                style={{ background: 'linear-gradient(225deg, rgba(34, 139, 34, 0.1), transparent)' }}
              >
                <motion.h2
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: revealState === 'groups' ? 1 : 0, y: revealState === 'groups' ? 0 : -20 }}
                  transition={{ delay: 0.5 }}
                  className="text-3xl font-black text-[var(--accent)] uppercase tracking-widest"
                >
                  {category.right}
                </motion.h2>
              </div>
            </motion.div>

            {/* Participants - animate between positions */}
            {participants.map((participant, index) => {
              const agg = aggregates[participant.id]?.[currentCategory];
              const guessedPosition = agg?.mean ?? 50;
              const actualSide = getActualSide(participant.real_mbti, currentCategory);
              const isLeft = actualSide === 'left';

              const initials = participant.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              // Spectrum position (spread vertically across container)
              const spectrumY = (Math.sin(index * 1.8) * 150) + (Math.cos(index * 2.3) * 80);

              // Calculate groups position
              const group = isLeft ? leftGroup : rightGroup;
              const indexInGroup = group.findIndex(p => p.id === participant.id);
              const cols = Math.min(3, Math.ceil(Math.sqrt(group.length)));
              const row = Math.floor(indexInGroup / cols);
              const col = indexInGroup % cols;
              const totalRows = Math.ceil(group.length / cols);

              // Groups X: center of left (25%) or right (75%) half, spread by columns
              const colSpacing = 18;
              const groupCenterX = isLeft ? 25 : 75;
              const colOffset = (col - (cols - 1) / 2) * colSpacing;
              const groupsX = groupCenterX + colOffset;

              // Groups Y: center vertically (percentage-based), spread by rows
              const rowSpacingPct = 20; // percentage of container height
              const rowOffsetPct = (row - (totalRows - 1) / 2) * rowSpacingPct;
              const groupsYPct = 55 + rowOffsetPct; // slightly below center to account for labels

              // Determine current target based on state
              const isTransitioningOrGroups = revealState === 'transition' || revealState === 'groups';
              const targetX = isTransitioningOrGroups ? groupsX : guessedPosition;
              const targetY = isTransitioningOrGroups ? `${groupsYPct}%` : `calc(50% + ${spectrumY}px)`;

              // Border glow based on side (visible in groups state)
              const glowColor = isLeft ? 'rgba(220, 38, 38, 0.5)' : 'rgba(34, 139, 34, 0.5)';
              const borderColor = isLeft ? 'border-[var(--primary)]/50' : 'border-[var(--accent)]/50';

              return (
                <motion.div
                  key={participant.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    left: `${targetX}%`,
                    top: typeof targetY === 'string' ? targetY : `${targetY}px`,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: isTransitioningOrGroups ? 40 : 100,
                    damping: isTransitioningOrGroups ? 12 : 20,
                    delay: isTransitioningOrGroups ? indexInGroup * 0.08 : 0,
                  }}
                  className="absolute -translate-y-1/2 -translate-x-1/2"
                >
                  <div className="relative group flex flex-col items-center">
                    <motion.div
                      className={`w-20 h-20 rounded-full bg-cover bg-center shadow-2xl border-4 transition-all ${
                        revealState === 'groups' ? borderColor : 'border-white/20'
                      }`}
                      animate={{
                        boxShadow: revealState === 'groups'
                          ? `0 0 30px ${glowColor}`
                          : '0 10px 40px rgba(0,0,0,0.3)',
                      }}
                      style={{
                        backgroundImage: participant.avatar_url ? `url(${participant.avatar_url})` : undefined,
                        backgroundColor: participant.avatar_url ? undefined : getAvatarColor(index),
                      }}
                    >
                      {!participant.avatar_url && (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl rounded-full">
                          {initials}
                        </div>
                      )}
                    </motion.div>
                    <p className="mt-2 text-lg font-bold text-white drop-shadow-md whitespace-nowrap">
                      {participant.name.split(' ')[0]}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.p
            className="text-center text-[var(--muted-foreground)] mt-6 text-xl"
            animate={{ opacity: revealState === 'groups' ? 0 : 1 }}
          >
            {revealState === 'spectrum'
              ? '👆 Perception du groupe'
              : '✨ Révélation...'}
          </motion.p>
        </motion.div>
        )}
      </div>

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
          disabled={revealState === 'compatibility'}
        >
          →
        </button>
      </div>
    </main>
  );
}

// Award Card Component
function AwardCard({
  award,
  delay,
  participantIndex,
}: {
  award: Award;
  delay: number;
  participantIndex: number;
}) {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      className="glass rounded-2xl p-4 border border-white/10 flex flex-col items-center justify-center min-h-0"
    >
      {/* Prize title at top */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-3xl shrink-0">{award.emoji}</span>
        <h3 className="text-lg font-black uppercase tracking-wide text-[var(--primary)]">
          {award.title}
        </h3>
      </div>

      {/* Winner info below */}
      <div className="flex items-center justify-center gap-3">
        <div
          className="w-20 h-20 rounded-full bg-cover bg-center shrink-0"
          style={{
            backgroundImage: award.winner.avatar_url
              ? `url(${award.winner.avatar_url})`
              : undefined,
            backgroundColor: award.winner.avatar_url
              ? undefined
              : getAvatarColor(participantIndex),
          }}
        >
          {!award.winner.avatar_url && (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl rounded-full">
              {award.winner.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
          )}
        </div>
        <div>
          <p className="font-bold text-white text-xl">{award.winner.name}</p>
          {award.value !== undefined && (
            <p className="text-sm text-[var(--muted-foreground)]">
              {award.type === 'most_mysterious' && `${award.value}/4 mal devinés`}
              {award.type === 'most_obvious' && `${award.value}/4 bien devinés`}
              {!['best_guesser', 'most_mysterious', 'most_obvious'].includes(award.type) &&
                `${award.value}%`}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Awards Slide Component
function AwardsSlide({
  participants,
  rawVotes,
  aggregates,
}: {
  participants: Participant[];
  rawVotes: Vote[];
  aggregates: {
    [participantId: string]: {
      [category: number]: { mean: number; count: number };
    };
  };
}) {
  const awards = useMemo(
    () => calculateAwards(rawVotes, participants, aggregates),
    [rawVotes, participants, aggregates]
  );

  // Featured award (Best Guesser) on the left
  const featuredAward = awards.find((a) => a.type === 'best_guesser');

  // Other awards on the right (pick the most interesting ones)
  const sideAwards = awards.filter((a) =>
    ['most_mysterious', 'most_obvious', 'most_extroverted', 'most_introverted', 'most_rational', 'most_feeling'].includes(a.type)
  );

  const featuredIndex = featuredAward
    ? participants.findIndex((p) => p.id === featuredAward.winner.id)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-7xl mx-auto px-4 h-full flex flex-col"
    >
      <motion.h1
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-4xl font-black text-center text-gradient mb-4 shrink-0"
        style={{ fontFamily: 'var(--font-playfair), serif' }}
      >
        🏆 Les Awards 🏆
      </motion.h1>

      <div className="flex gap-6 items-stretch flex-1 min-h-0">
        {/* Featured Award - Large on Left */}
        {featuredAward && (
          <motion.div
            initial={{ x: -50, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 150, damping: 20 }}
            className="w-[45%] glass rounded-3xl p-6 border-2 border-[var(--secondary)]/30 bg-gradient-to-br from-[var(--secondary)]/10 to-transparent flex flex-col items-center justify-center text-center"
          >
            <div className="text-6xl mb-2">{featuredAward.emoji}</div>
            <h2 className="text-2xl font-black text-[var(--secondary)] uppercase tracking-wide mb-4">
              {featuredAward.title}
            </h2>
            <div
              className="w-[min(60vh,26rem)] h-[min(60vh,26rem)] rounded-full bg-cover bg-center mb-4 shadow-2xl shrink-0"
              style={{
                backgroundImage: featuredAward.winner.avatar_url
                  ? `url(${featuredAward.winner.avatar_url})`
                  : undefined,
                backgroundColor: featuredAward.winner.avatar_url
                  ? undefined
                  : getAvatarColor(featuredIndex),
              }}
            >
              {!featuredAward.winner.avatar_url && (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-6xl rounded-full">
                  {featuredAward.winner.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
              )}
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {featuredAward.winner.name}
            </p>
            {featuredAward.value !== undefined && (
              <p className="text-lg text-[var(--secondary)]">{featuredAward.value}% correct</p>
            )}
            <p className="text-sm text-[var(--muted-foreground)] mt-1 italic">
              {featuredAward.description}
            </p>
          </motion.div>
        )}

        {/* Side Awards - Smaller Grid on Right */}
        <div className="flex-1 grid grid-cols-2 grid-rows-3 gap-3 min-h-0">
          {sideAwards.map((award, idx) => {
            const pIndex = participants.findIndex((p) => p.id === award.winner.id);
            return (
              <AwardCard
                key={award.type}
                award={award}
                delay={0.4 + idx * 0.1}
                participantIndex={pIndex}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// Personalities Slide Component
function PersonalitiesSlide({
  typesInGroup,
  participantsByType,
  currentTypeIndex,
  revealedTypes,
  personalitiesPhase,
  participants,
}: {
  typesInGroup: MBTIType[];
  participantsByType: Partial<Record<MBTIType, Participant[]>>;
  currentTypeIndex: number;
  revealedTypes: Set<MBTIType>;
  personalitiesPhase: 'overview' | 'featuring' | 'revealed';
  participants: Participant[];
}) {
  const currentType = typesInGroup[currentTypeIndex];
  const currentParticipants = currentType ? participantsByType[currentType] || [] : [];
  const isRevealed = currentType ? revealedTypes.has(currentType) : false;

  // Overview phase: Show all types in a list
  if (personalitiesPhase === 'overview') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-5xl mx-auto px-4 flex flex-col items-center"
      >
        <motion.h1
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl font-black text-center text-gradient mb-8"
          style={{ fontFamily: 'var(--font-playfair), serif' }}
        >
          🧠 Les Personnalités du Groupe
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-[var(--muted-foreground)] mb-8"
        >
          {typesInGroup.length} types représentés
        </motion.p>

        <div className="flex flex-wrap justify-center gap-6">
          {typesInGroup.map((type, idx) => {
            const groupColor = getGroupColor(type);
            const typeParticipants = participantsByType[type] || [];
            const typeImage = getMBTITypeImage(type);

            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass rounded-2xl p-6 border-2 flex flex-col items-center min-w-[200px]"
                style={{ borderColor: groupColor + '60' }}
              >
                {/* MBTI type image */}
                {typeImage ? (
                  <img
                    src={typeImage}
                    alt={type}
                    className="w-28 h-28 object-contain rounded-xl mb-4"
                  />
                ) : (
                  <div
                    className="w-28 h-28 rounded-xl mb-4 flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${groupColor}40, ${groupColor}20)` }}
                  >
                    <span className="text-4xl font-black opacity-60">{type}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getGroupEmoji(getMBTIGroup(type))}</span>
                  <span className="text-3xl font-black" style={{ color: groupColor }}>{type}</span>
                </div>
                <span className="text-base text-[var(--muted-foreground)]">
                  {typeParticipants.length} {typeParticipants.length === 1 ? 'personne' : 'personnes'}
                </span>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-[var(--muted-foreground)] mt-8"
        >
          Appuyez sur → pour découvrir qui est qui
        </motion.p>
      </motion.div>
    );
  }

  // Featuring/Revealed phase: Show current type with image and people
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col px-8"
    >
      {/* Top row: Already revealed types */}
      {revealedTypes.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap justify-center gap-3 mb-4 shrink-0 max-w-full px-4"
        >
          {Array.from(revealedTypes).map((type) => {
            const groupColor = getGroupColor(type);
            const typeParticipants = participantsByType[type] || [];

            return (
              <div
                key={type}
                className="glass rounded-xl px-4 py-3 border-2 flex items-center gap-3"
                style={{ borderColor: groupColor + '60', backgroundColor: groupColor + '20' }}
              >
                <span className="font-bold text-lg" style={{ color: groupColor }}>{type}</span>
                <div className="flex -space-x-3">
                  {typeParticipants.slice(0, 4).map((p) => {
                    const pIndex = participants.findIndex((ap) => ap.id === p.id);
                    return (
                      <div
                        key={p.id}
                        className="w-10 h-10 rounded-full border-2 border-white/30 bg-cover bg-center"
                        style={{
                          backgroundImage: p.avatar_url ? `url(${p.avatar_url})` : undefined,
                          backgroundColor: p.avatar_url ? undefined : getAvatarColor(pIndex),
                        }}
                      />
                    );
                  })}
                  {typeParticipants.length > 4 && (
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                      +{typeParticipants.length - 4}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Main content: Current type featuring */}
      <div className="flex-1 flex items-center justify-center gap-16">
        {/* Left: Type image */}
        <motion.div
          key={currentType}
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col items-center"
        >
          {getMBTITypeImage(currentType) ? (
            <motion.img
              src={getMBTITypeImage(currentType)}
              alt={currentType}
              className="w-[400px] h-[400px] object-contain rounded-3xl"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            />
          ) : (
            <motion.div
              className="w-[400px] h-[400px] rounded-3xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${getGroupColor(currentType)}40, ${getGroupColor(currentType)}20)` }}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              <span className="text-9xl font-black opacity-60">{currentType}</span>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-4xl">{getGroupEmoji(getMBTIGroup(currentType))}</span>
              <h2 className="text-6xl font-black" style={{ color: getGroupColor(currentType) }}>
                {currentType}
              </h2>
            </div>
            <p className="text-2xl text-[var(--muted-foreground)]">
              {MBTI_DESCRIPTIONS[currentType]}
            </p>
          </motion.div>
        </motion.div>

        {/* Right: People (hidden or revealed) */}
        <motion.div
          key={`people-${currentType}`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-6"
        >
          <h3 className="text-2xl font-bold text-center text-[var(--muted-foreground)] mb-4">
            {isRevealed ? 'Membres du groupe' : 'Qui sont-ils ?'}
          </h3>

          {currentParticipants.map((p, idx) => {
            const pIndex = participants.findIndex((ap) => ap.id === p.id);

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="flex items-center gap-6 glass rounded-2xl p-6 min-w-[350px]"
              >
                {/* Avatar or question mark */}
                <div
                  className="w-24 h-24 rounded-full overflow-hidden relative shrink-0"
                  style={{ perspective: 1000 }}
                >
                  <motion.div
                    className="w-full h-full"
                    style={{ transformStyle: 'preserve-3d' }}
                    animate={{ rotateY: isRevealed ? 180 : 0 }}
                    transition={{ delay: idx * 0.15, type: 'spring', stiffness: 200, damping: 20 }}
                  >
                    {/* Front: Question mark */}
                    <div
                      className="absolute inset-0 flex items-center justify-center rounded-full"
                      style={{
                        backfaceVisibility: 'hidden',
                        backgroundColor: getGroupColor(currentType) + '40',
                      }}
                    >
                      <span className="text-5xl">❓</span>
                    </div>

                    {/* Back: Avatar */}
                    <div
                      className="absolute inset-0 rounded-full bg-cover bg-center"
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        backgroundImage: p.avatar_url ? `url(${p.avatar_url})` : undefined,
                        backgroundColor: p.avatar_url ? undefined : getAvatarColor(pIndex),
                      }}
                    >
                      {!p.avatar_url && (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-3xl rounded-full">
                          {p.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Name (revealed) or placeholder */}
                <AnimatePresence mode="wait">
                  {isRevealed ? (
                    <motion.div
                      key="name"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: idx * 0.15 + 0.2 }}
                    >
                      <p className="font-bold text-3xl text-white">{p.name}</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1"
                    >
                      <div className="h-6 w-48 bg-white/10 rounded-lg" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Progress indicator */}
      <div className="flex justify-center gap-3 mt-4 shrink-0">
        {typesInGroup.map((type, idx) => (
          <div
            key={type}
            className={`w-4 h-4 rounded-full transition-all ${
              idx < currentTypeIndex
                ? 'bg-green-500'
                : idx === currentTypeIndex
                ? 'bg-white scale-125'
                : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Compatibility Slide Component
function CompatibilitySlide({ participants }: { participants: Participant[] }) {
  // Find all interesting pairs
  const pairs = useMemo(() => {
    const goldenPairs: { p1: Participant; p2: Participant; score: number }[] = [];
    const samePairs: { p1: Participant; p2: Participant }[] = [];
    const oppositePairs: { p1: Participant; p2: Participant }[] = [];
    const allPairs: { p1: Participant; p2: Participant; score: number; vibe: string }[] = [];

    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const p1 = participants[i];
        const p2 = participants[j];
        const score = getCompatibilityScore(p1.real_mbti, p2.real_mbti);
        const vibe = getCompatibilityVibe(p1.real_mbti, p2.real_mbti);

        allPairs.push({ p1, p2, score, vibe });

        if (areGoldenPair(p1.real_mbti, p2.real_mbti)) {
          goldenPairs.push({ p1, p2, score });
        }
        if (p1.real_mbti === p2.real_mbti) {
          samePairs.push({ p1, p2 });
        }
        if (getOppositeMBTI(p1.real_mbti) === p2.real_mbti) {
          oppositePairs.push({ p1, p2 });
        }
      }
    }

    // Sort all pairs by score
    allPairs.sort((a, b) => b.score - a.score);

    return { goldenPairs, samePairs, oppositePairs, topPairs: allPairs.slice(0, 6) };
  }, [participants]);

  const renderAvatar = (p: Participant, size: string = 'w-14 h-14') => {
    const pIndex = participants.findIndex((ap) => ap.id === p.id);
    return (
      <div
        className={`${size} rounded-full bg-cover bg-center border-2 border-white/30 shrink-0`}
        style={{
          backgroundImage: p.avatar_url ? `url(${p.avatar_url})` : undefined,
          backgroundColor: p.avatar_url ? undefined : getAvatarColor(pIndex),
        }}
      >
        {!p.avatar_url && (
          <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm rounded-full">
            {p.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-6xl mx-auto px-4 flex flex-col items-center h-full overflow-auto"
    >
      <motion.h1
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-5xl font-black text-center text-gradient mb-6 shrink-0"
        style={{ fontFamily: 'var(--font-playfair), serif' }}
      >
        🤝 Dynamiques du Groupe
      </motion.h1>

      <div className="grid grid-cols-2 gap-6 w-full">
        {/* Golden Pairs - Best Matches */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">⭐</span> Dream Teams
          </h3>
          {pairs.goldenPairs.length > 0 ? (
            <div className="space-y-3">
              {pairs.goldenPairs.slice(0, 4).map((pair, idx) => (
                <motion.div
                  key={`golden-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="flex items-center gap-3 bg-white/5 rounded-xl p-3"
                >
                  {renderAvatar(pair.p1)}
                  <div className="flex-1 text-center">
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {pair.p1.real_mbti} + {pair.p2.real_mbti}
                    </div>
                    <div className="text-lg font-bold text-yellow-400">{pair.score}%</div>
                  </div>
                  {renderAvatar(pair.p2)}
                  <div className="text-right min-w-[80px]">
                    <p className="font-medium text-sm">{pair.p1.name.split(' ')[0]}</p>
                    <p className="font-medium text-sm">&amp; {pair.p2.name.split(' ')[0]}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--muted-foreground)] text-sm">Pas de dream team classique - mais plein de potentiel!</p>
          )}
        </motion.div>

        {/* Same Type Twins */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🪞</span> Les Jumeaux
            <span className="text-sm font-normal text-[var(--muted-foreground)]">(même type)</span>
          </h3>
          {pairs.samePairs.length > 0 ? (
            <div className="space-y-3">
              {pairs.samePairs.slice(0, 4).map((pair, idx) => (
                <motion.div
                  key={`same-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  className="flex items-center gap-3 bg-white/5 rounded-xl p-3"
                >
                  {renderAvatar(pair.p1)}
                  <div className="flex-1 text-center">
                    <div
                      className="text-lg font-black"
                      style={{ color: getGroupColor(pair.p1.real_mbti) }}
                    >
                      {pair.p1.real_mbti}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {MBTI_DESCRIPTIONS[pair.p1.real_mbti]}
                    </div>
                  </div>
                  {renderAvatar(pair.p2)}
                  <div className="text-right min-w-[80px]">
                    <p className="font-medium text-sm">{pair.p1.name.split(' ')[0]}</p>
                    <p className="font-medium text-sm">&amp; {pair.p2.name.split(' ')[0]}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--muted-foreground)] text-sm">Tous les types sont uniques!</p>
          )}
        </motion.div>

        {/* Opposites - Complementary */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🧩</span> Complémentaires
          </h3>
          {pairs.oppositePairs.length > 0 ? (
            <div className="space-y-3">
              {pairs.oppositePairs.slice(0, 4).map((pair, idx) => (
                <motion.div
                  key={`opp-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  className="flex items-center gap-3 bg-white/5 rounded-xl p-3"
                >
                  {renderAvatar(pair.p1)}
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span style={{ color: getGroupColor(pair.p1.real_mbti) }}>{pair.p1.real_mbti}</span>
                      <span className="text-orange-400">⚡</span>
                      <span style={{ color: getGroupColor(pair.p2.real_mbti) }}>{pair.p2.real_mbti}</span>
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">Équilibre parfait!</div>
                  </div>
                  {renderAvatar(pair.p2)}
                  <div className="text-right min-w-[80px]">
                    <p className="font-medium text-sm">{pair.p1.name.split(' ')[0]}</p>
                    <p className="font-medium text-sm">&amp; {pair.p2.name.split(' ')[0]}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--muted-foreground)] text-sm">Aucun duo d'opposés dans le groupe</p>
          )}
        </motion.div>

        {/* Top Duos */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🏆</span> Meilleurs Duos
          </h3>
          <div className="space-y-2">
            {pairs.topPairs.map((pair, idx) => {
              const vibeData = COMPATIBILITY_VIBES[pair.vibe];
              return (
                <motion.div
                  key={`top-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + idx * 0.05 }}
                  className="flex items-center gap-2 bg-white/5 rounded-lg p-2"
                >
                  <span className="text-lg w-6">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '•'}</span>
                  {renderAvatar(pair.p1, 'w-8 h-8')}
                  {renderAvatar(pair.p2, 'w-8 h-8')}
                  <div className="flex-1">
                    <span className="text-sm font-medium">
                      {pair.p1.name.split(' ')[0]} &amp; {pair.p2.name.split(' ')[0]}
                    </span>
                  </div>
                  <span className="text-xs">{vibeData.emoji}</span>
                  <span
                    className="font-bold text-sm w-10 text-right"
                    style={{
                      color: pair.score >= 90 ? '#fbbf24' : pair.score >= 80 ? '#34d399' : '#94a3b8',
                    }}
                  >
                    {pair.score}%
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Summary Slide Component
function SummarySlide({ participants }: { participants: Participant[] }) {
  const total = participants.length;

  // Calculate group distribution
  const groupCounts = useMemo(() => ({
    NT: participants.filter((p) => getMBTIGroup(p.real_mbti) === 'NT').length,
    NF: participants.filter((p) => getMBTIGroup(p.real_mbti) === 'NF').length,
    SJ: participants.filter((p) => getMBTIGroup(p.real_mbti) === 'SJ').length,
    SP: participants.filter((p) => getMBTIGroup(p.real_mbti) === 'SP').length,
  }), [participants]);

  // Calculate dimension splits
  const dimensionSplits = useMemo(() => ({
    EI: {
      E: participants.filter((p) => p.real_mbti[0] === 'E').length,
      I: participants.filter((p) => p.real_mbti[0] === 'I').length,
    },
    NS: {
      N: participants.filter((p) => p.real_mbti[1] === 'N').length,
      S: participants.filter((p) => p.real_mbti[1] === 'S').length,
    },
    TF: {
      T: participants.filter((p) => p.real_mbti[2] === 'T').length,
      F: participants.filter((p) => p.real_mbti[2] === 'F').length,
    },
    JP: {
      J: participants.filter((p) => p.real_mbti[3] === 'J').length,
      P: participants.filter((p) => p.real_mbti[3] === 'P').length,
    },
  }), [participants]);

  // Find rarest and most common types
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    participants.forEach((p) => {
      counts[p.real_mbti] = (counts[p.real_mbti] || 0) + 1;
    });
    return counts;
  }, [participants]);

  const sortedTypes = Object.entries(typeCounts).sort((a, b) => a[1] - b[1]);
  const rarestType = sortedTypes[0];
  const commonType = sortedTypes[sortedTypes.length - 1];
  const uniqueTypes = Object.keys(typeCounts).length;

  const groups: (keyof typeof MBTI_GROUP_COLORS)[] = ['NT', 'NF', 'SJ', 'SP'];

  // Calculate pie chart segments
  const pieSegments = useMemo(() => {
    let cumulative = 0;
    return groups.map((group) => {
      const pct = total > 0 ? (groupCounts[group] / total) * 100 : 0;
      const start = cumulative;
      cumulative += pct;
      return { group, pct, start, end: cumulative };
    });
  }, [groupCounts, total]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-6xl mx-auto px-4 flex flex-col items-center h-full overflow-auto"
    >
      <motion.h1
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-5xl font-black text-center text-gradient mb-6 shrink-0"
        style={{ fontFamily: 'var(--font-playfair), serif' }}
      >
        📊 Répartition du Groupe
      </motion.h1>

      <div className="flex gap-8 w-full flex-1 min-h-0">
        {/* Left: Donut Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center"
        >
          <div className="relative w-64 h-64">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {pieSegments.map((seg, idx) => {
                const radius = 40;
                const circumference = 2 * Math.PI * radius;
                const strokeDasharray = `${(seg.pct / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((seg.start / 100) * circumference);

                return (
                  <motion.circle
                    key={seg.group}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={MBTI_GROUP_COLORS[seg.group]}
                    strokeWidth="20"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + idx * 0.15, duration: 0.5 }}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-white">{total}</span>
              <span className="text-sm text-[var(--muted-foreground)]">participants</span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
            {groups.map((group, idx) => (
              <motion.div
                key={group}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + idx * 0.1 }}
                className="flex items-center gap-2"
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: MBTI_GROUP_COLORS[group] }}
                />
                <span className="text-sm font-medium">{getGroupEmoji(group)} {getGroupName(group)}</span>
                <span className="text-sm text-[var(--muted-foreground)]">({groupCounts[group]})</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right: Stats and Dimensions */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Dimension Bars */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl p-5"
          >
            <h3 className="text-lg font-bold mb-4 text-center">⚖️ Équilibre du Groupe</h3>

            {/* E vs I */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>🎉 Extravertis ({dimensionSplits.EI.E})</span>
                <span>Introvertis ({dimensionSplits.EI.I}) 🧘</span>
              </div>
              <div className="h-6 bg-white/10 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(dimensionSplits.EI.E / total) * 100}%` }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(dimensionSplits.EI.I / total) * 100}%` }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                />
              </div>
            </div>

            {/* N vs S */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>🔮 Intuitifs ({dimensionSplits.NS.N})</span>
                <span>Observateurs ({dimensionSplits.NS.S}) 👀</span>
              </div>
              <div className="h-6 bg-white/10 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(dimensionSplits.NS.N / total) * 100}%` }}
                  transition={{ delay: 0.7, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(dimensionSplits.NS.S / total) * 100}%` }}
                  transition={{ delay: 0.7, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-green-500 to-teal-500"
                />
              </div>
            </div>

            {/* T vs F */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>🧠 Rationnels ({dimensionSplits.TF.T})</span>
                <span>Sensibles ({dimensionSplits.TF.F}) ❤️</span>
              </div>
              <div className="h-6 bg-white/10 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(dimensionSplits.TF.T / total) * 100}%` }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(dimensionSplits.TF.F / total) * 100}%` }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-pink-500 to-red-500"
                />
              </div>
            </div>

            {/* J vs P */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>📋 Organisés ({dimensionSplits.JP.J})</span>
                <span>Explorateurs ({dimensionSplits.JP.P}) 🧭</span>
              </div>
              <div className="h-6 bg-white/10 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(dimensionSplits.JP.J / total) * 100}%` }}
                  transition={{ delay: 0.9, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-500"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(dimensionSplits.JP.P / total) * 100}%` }}
                  transition={{ delay: 0.9, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
                />
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="glass rounded-xl p-4 text-center"
            >
              <span className="text-4xl mb-2 block">🦄</span>
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Type le plus rare</p>
              <p className="text-2xl font-black" style={{ color: rarestType ? getGroupColor(rarestType[0] as MBTIType) : 'white' }}>
                {rarestType ? rarestType[0] : '-'}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {rarestType ? `${rarestType[1]} personne${rarestType[1] > 1 ? 's' : ''}` : ''}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="glass rounded-xl p-4 text-center"
            >
              <span className="text-4xl mb-2 block">👑</span>
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Type dominant</p>
              <p className="text-2xl font-black" style={{ color: commonType ? getGroupColor(commonType[0] as MBTIType) : 'white' }}>
                {commonType ? commonType[0] : '-'}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {commonType ? `${commonType[1]} personne${commonType[1] > 1 ? 's' : ''}` : ''}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="glass rounded-xl p-4 text-center"
            >
              <span className="text-4xl mb-2 block">🎯</span>
              <p className="text-xs text-[var(--muted-foreground)] mb-1">Diversité</p>
              <p className="text-2xl font-black text-white">
                {uniqueTypes}/16
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                types représentés
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
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

