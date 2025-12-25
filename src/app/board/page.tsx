'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Session, Participant, Vote, CategoryIndex } from '@/lib/types';
import { 
  CATEGORIES, 
  getAvatarColor, 
  calculatePredictedMBTI, 
  MBTI_DESCRIPTIONS,
  MBTI_CELEBRITIES 
} from '@/lib/constants';

interface AggregatedData {
  [participantId: string]: {
    [category: number]: {
      mean: number;
      count: number;
    };
  };
}

interface PlacedHead {
  id: string;
  x: number; // 0-100 percentage
  y: number; // -100 to 100 percentage (relative to center)
  vx: number;
  vy: number;
}

// Physics simulation for collision avoidance
function useForceSimulation(
  containerWidth: number,
  containerHeight: number,
  headSize: number
) {
  const [positions, setPositions] = useState<PlacedHead[]>([]);
  const animationRef = useRef<number | null>(null);
  const positionsRef = useRef<PlacedHead[]>([]);
  const configRef = useRef({ containerWidth, containerHeight, headSize });
  
  useEffect(() => {
    configRef.current = { containerWidth, containerHeight, headSize };
  }, [containerWidth, containerHeight, headSize]);

  const updateHeads = useCallback((heads: PlacedHead[]) => {
    positionsRef.current = heads;
    setPositions([...heads]);
  }, []);

  const simulateStep = useCallback(() => {
    const { containerWidth: cw, containerHeight: ch, headSize: hs } = configRef.current;
    if (cw === 0) return false;
    
    const current = [...positionsRef.current];
    const padding = 12;
    const minDistance = hs + padding;
    let moved = false;
    
    for (let i = 0; i < current.length; i++) {
      const head = current[i];
      
      for (let j = i + 1; j < current.length; j++) {
        const other = current[j];
        
        const dx = (other.x - head.x) * cw / 100;
        const dy = (other.y - head.y) * ch / 200;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          const overlap = minDistance - distance;
          const pushStrength = overlap * 0.3;
          moved = true;
          
          if (distance === 0) {
            const angle = (i * 1.33); 
            head.vy += Math.sin(angle) * 3;
            other.vy -= Math.sin(angle) * 3;
          } else {
            const ny = dy / distance;
            head.vy -= ny * pushStrength;
            other.vy += ny * pushStrength;
          }
        }
      }
      
      if (Math.abs(head.vy) > 0.01) {
        moved = true;
      }

      // Weak spring force to center Y
      head.vy += -head.y * 0.01;
      head.vy *= 0.6;
      head.y += (head.vy / ch) * 200;
      
      const maxYPct = 100 - (hs / ch) * 100;
      head.y = Math.max(-maxYPct, Math.min(maxYPct, head.y));
    }
    
    if (moved) {
      positionsRef.current = current;
      setPositions([...current]);
    }
    
    return moved;
  }, []);

  const runSimulation = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const loop = () => {
      if (simulateStep()) {
        animationRef.current = requestAnimationFrame(loop);
      }
    };
    loop();
  }, [simulateStep]);

  useEffect(() => {
    if (positions.length === 0 || containerWidth === 0) return;
    runSimulation();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [positions.length, containerWidth, runSimulation]);

  return { positions, triggerSimulation: runSimulation, updateHeads };
}

type ViewMode = 'spectrum' | 'spotlight';
type PeekerPositionType = 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

// Peeker component with position-aware animations
function PeekerAvatar({
  peeker,
  position,
  colorIndex,
}: {
  peeker: Participant;
  position: PeekerPositionType;
  colorIndex: number;
}) {
  const getAnimationProps = () => {
    switch (position) {
      case 'left':
        return {
          className: 'fixed left-0 top-1/3 z-50',
          initial: { x: -250, rotate: 45 },
          animate: { x: -60, rotate: 35 },
          exit: { x: -250, rotate: 45 },
        };
      case 'right':
        return {
          className: 'fixed right-0 top-1/3 z-50',
          initial: { x: 250, rotate: -45 },
          animate: { x: 60, rotate: -35 },
          exit: { x: 250, rotate: -45 },
        };
      case 'top':
        return {
          className: 'fixed top-0 left-1/2 -translate-x-1/2 z-50',
          initial: { y: -250, rotate: 180 },
          animate: { y: -60, rotate: 180 },
          exit: { y: -250, rotate: 180 },
        };
      case 'bottom':
        return {
          className: 'fixed bottom-0 left-1/2 -translate-x-1/2 z-50',
          initial: { y: 250, rotate: 0 },
          animate: { y: 60, rotate: 0 },
          exit: { y: 250, rotate: 0 },
        };
      case 'top-left':
        return {
          className: 'fixed top-0 left-0 z-50',
          initial: { x: -200, y: -200, rotate: 135 },
          animate: { x: -40, y: -40, rotate: 125 },
          exit: { x: -200, y: -200, rotate: 135 },
        };
      case 'top-right':
        return {
          className: 'fixed top-0 right-0 z-50',
          initial: { x: 200, y: -200, rotate: -135 },
          animate: { x: 40, y: -40, rotate: -125 },
          exit: { x: 200, y: -200, rotate: -135 },
        };
      case 'bottom-left':
        return {
          className: 'fixed bottom-0 left-0 z-50',
          initial: { x: -200, y: 200, rotate: 45 },
          animate: { x: -40, y: 40, rotate: 35 },
          exit: { x: -200, y: 200, rotate: 45 },
        };
      case 'bottom-right':
        return {
          className: 'fixed bottom-0 right-0 z-50',
          initial: { x: 200, y: 200, rotate: -45 },
          animate: { x: 40, y: 40, rotate: -35 },
          exit: { x: 200, y: 200, rotate: -45 },
        };
    }
  };

  const props = getAnimationProps();

  return (
    <motion.div
      initial={props.initial}
      animate={props.animate}
      exit={props.exit}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
      }}
      className={props.className}
      style={{ transformOrigin: 'center center', willChange: 'transform', transform: 'translate3d(0,0,0)' }}
    >
      <div
        className="w-48 h-48 rounded-full bg-cover bg-center shadow-2xl"
        style={{
          backgroundImage: peeker.avatar_url ? `url(${peeker.avatar_url})` : undefined,
          backgroundColor: peeker.avatar_url ? undefined : getAvatarColor(colorIndex),
        }}
      >
        {!peeker.avatar_url && (
          <div className="w-full h-full flex items-center justify-center text-white font-bold text-5xl rounded-full">
            {peeker.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function BoardContent() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get('code');

  const [code, setCode] = useState(codeFromUrl || '');
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [aggregates, setAggregates] = useState<AggregatedData>({});
  const [error, setError] = useState('');
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('spectrum');
  const [activeCategory, setActiveCategory] = useState<CategoryIndex>(0);
  const [spotlightPerson, setSpotlightPerson] = useState<Participant | null>(null);
  
  // Peeker state - random head that peeks in from edges
  const [peeker, setPeeker] = useState<Participant | null>(null);
  const [peekerPosition, setPeekerPosition] = useState<'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('left');

  // Debounce vote updates to batch queries (100ms)
  const voteUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load session data
  const aggregateVotes = useCallback((votes: Vote[]) => {
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
  }, []);

  const loadVotes = useCallback(async (sessionId: string) => {
    const { data: votesData } = await supabase
      .from('votes')
      .select('*')
      .eq('session_id', sessionId);

    if (votesData) {
      aggregateVotes(votesData as Vote[]);
    }
  }, [aggregateVotes]);

  const loadSession = useCallback(async (sessionCode: string) => {
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

      const s = sessionData as Session;
      setSession(s);

      const { data: participantsData } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', s.id)
        .order('created_at');

      if (participantsData) {
        setParticipants(participantsData as Participant[]);
        if (participantsData.length > 0) {
          setSpotlightPerson(participantsData[0] as Participant);
        }
      }

      await loadVotes(s.id);
    } catch (err) {
      console.error('Error loading session:', err);
      setError('Erreur de connexion');
    }
  }, [loadVotes]);

  useEffect(() => {
    if (codeFromUrl) {
      const timer = setTimeout(() => {
        loadSession(codeFromUrl);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [codeFromUrl, loadSession]);

  // Subscribe to session and vote changes
  useEffect(() => {
    if (!session) return;

    const sessionChannel = supabase
      .channel('board-session')
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

    const votesChannel = supabase
      .channel('board-votes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `session_id=eq.${session.id}`,
        },
        () => {
          // Debounce vote updates: batch multiple rapid changes into single query
          if (voteUpdateTimeoutRef.current) {
            clearTimeout(voteUpdateTimeoutRef.current);
          }
          voteUpdateTimeoutRef.current = setTimeout(() => {
            loadVotes(session.id);
          }, 100); // Wait 100ms for more updates before querying
        }
      )
      .subscribe();

    const participantsChannel = supabase
      .channel('board-participants')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${session.id}`,
        },
        async () => {
          const { data } = await supabase
            .from('participants')
            .select('*')
            .eq('session_id', session.id)
            .order('created_at');
          if (data) setParticipants(data as Participant[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(votesChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [session, loadVotes]);

  // Semi-random rotation every 30 seconds
  const rotateView = useCallback(() => {
    // Randomly decide next view
    const rand = Math.random();
    
    if (rand < 0.4) {
      // 40% chance: Show spectrum view with random category
      setViewMode('spectrum');
      setActiveCategory(Math.floor(Math.random() * 4) as CategoryIndex);
    } else {
      // 60% chance: Show person spotlight
      setViewMode('spotlight');
      if (participants.length > 0) {
        const randomPerson = participants[Math.floor(Math.random() * participants.length)];
        setSpotlightPerson(randomPerson);
      }
    }
  }, [participants]);

  // Auto-rotate every 30 seconds
  useEffect(() => {
    if (!session || session.phase !== 'voting' || !session.show_live_board) return;

    const interval = setInterval(rotateView, 30000);

    return () => clearInterval(interval);
  }, [session, rotateView]);

  // Auto-rotate spotlight person every 2 minutes when in spotlight mode
  useEffect(() => {
    if (viewMode !== 'spotlight' || participants.length === 0) return;

    const interval = setInterval(() => {
      setSpotlightPerson((current) => {
        const idx = current ? participants.findIndex(p => p.id === current.id) : -1;
        const nextIdx = (idx + 1) % participants.length;
        return participants[nextIdx];
      });
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [viewMode, participants]);

  // Random peeker effect - a head peeks in from random edges every 3 minutes
  useEffect(() => {
    if (!session || participants.length === 0) return;

    const positions: Array<'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'> = [
      'left', 'right', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'
    ];

    const triggerPeek = () => {
      if (participants.length === 0) return;
      const randomPerson = participants[Math.floor(Math.random() * participants.length)];
      const randomPosition = positions[Math.floor(Math.random() * positions.length)];
      setPeekerPosition(randomPosition);
      setPeeker(randomPerson);

      // Hide after 3 seconds
      setTimeout(() => {
        setPeeker(null);
      }, 3000);
    };

    // Initial delay of 30 seconds, then every 3 minutes
    const initialTimeout = setTimeout(() => {
      triggerPeek();

      const interval = setInterval(() => {
        triggerPeek();
      }, 180000); // 3 minutes

      return () => clearInterval(interval);
    }, 30000);

    return () => clearTimeout(initialTimeout);
  }, [session, participants]);

  // Code entry screen
  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md w-full glass p-8"
        >
          <h1 className="text-5xl font-bold mb-4 text-gradient">Live Board</h1>
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
          />

          {error && <p className="text-[var(--error)] mb-4">{error}</p>}

          <button
            onClick={() => loadSession(code)}
            className="btn btn-primary w-full text-lg py-4"
          >
            Afficher →
          </button>
        </motion.div>
      </main>
    );
  }

  // Waiting screen when live board is hidden
  if (!session.show_live_board && session.phase !== 'reveal') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center glass p-12"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-8xl mb-8"
          >
            ❄️
          </motion.div>
          <h1
            className="text-6xl font-bold text-gradient mb-4"
            style={{ fontFamily: 'var(--font-playfair), serif' }}
          >
            {session.code}
          </h1>
          <p className="text-2xl text-[var(--muted-foreground)]">
            {session.phase === 'lobby'
              ? 'En attente des joueurs...'
              : 'Votez sur vos téléphones !'}
          </p>
          <p className="text-lg text-[var(--muted-foreground)] mt-4">
            {participants.filter((p) => p.claimed_at).length} / {participants.length} connectés
          </p>
        </motion.div>
      </main>
    );
  }

  // Live view
  return (
    <main className="min-h-screen p-8 flex flex-col overflow-hidden relative">
      {/* Peeker - random head that peeks in from edges */}
      <AnimatePresence>
        {peeker && (
          <PeekerAvatar
            peeker={peeker}
            position={peekerPosition}
            colorIndex={participants.indexOf(peeker)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-6"
      >
        <div className="text-2xl font-bold tracking-widest text-gradient">
          {session.code}
        </div>
        
        {/* View mode indicators */}
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.index}
              onClick={() => {
                setViewMode('spectrum');
                setActiveCategory(cat.index);
              }}
              className={`w-10 h-10 rounded-full text-xl transition-all ${
                viewMode === 'spectrum' && activeCategory === cat.index
                  ? 'bg-[var(--primary)] scale-110'
                  : 'bg-[var(--muted)] opacity-50 hover:opacity-75'
              }`}
            >
              {cat.emoji}
            </button>
          ))}
          <div className="w-px bg-[var(--border)] mx-2" />
          <button
            onClick={() => {
              setViewMode('spotlight');
              if (participants.length > 0) {
                setSpotlightPerson(participants[Math.floor(Math.random() * participants.length)]);
              }
            }}
            className={`px-4 h-10 rounded-full text-sm transition-all ${
              viewMode === 'spotlight'
                ? 'bg-[var(--secondary)] scale-105'
                : 'bg-[var(--muted)] opacity-50 hover:opacity-75'
            }`}
          >
            👤 Focus
          </button>
        </div>
      </motion.div>

      {/* Main content area */}
      <div className="flex-1 w-full relative">
      <AnimatePresence mode="wait">
          {viewMode === 'spectrum' ? (
            <SpectrumView
              key={`spectrum-${activeCategory}`}
              category={CATEGORIES[activeCategory]}
              participants={participants}
              aggregates={aggregates}
            />
          ) : (
            <SpotlightView
              key={`spotlight-${spotlightPerson?.id}`}
              person={spotlightPerson}
              participants={participants}
              aggregates={aggregates}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Footer with participant avatars */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex justify-center gap-3 flex-wrap"
        >
          {participants.map((p, i) => (
            <button
              key={p.id}
              onClick={() => {
                setViewMode('spotlight');
                setSpotlightPerson(p);
              }}
              className={`group relative transition-all ${
                spotlightPerson?.id === p.id && viewMode === 'spotlight'
                  ? 'scale-125 z-10'
                  : 'hover:scale-110 opacity-70 hover:opacity-100'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full bg-cover bg-center border-2 ${
                  spotlightPerson?.id === p.id && viewMode === 'spotlight'
                    ? 'border-[var(--secondary)]'
                    : 'border-white/20'
                }`}
                style={{
                  backgroundImage: p.avatar_url ? `url(${p.avatar_url})` : undefined,
                  backgroundColor: p.avatar_url ? undefined : getAvatarColor(i),
                }}
              >
                {!p.avatar_url && (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
                    {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                {p.name}
              </div>
            </button>
          ))}
        </motion.div>
    </main>
  );
}

// Spectrum View Component
function SpectrumView({
  category,
  participants,
  aggregates,
}: {
  category: typeof CATEGORIES[number];
  participants: Participant[];
  aggregates: AggregatedData;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const headSize = 80;

  // Measure container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Physics simulation
  const { positions, triggerSimulation, updateHeads } = useForceSimulation(
    containerSize.width,
    containerSize.height,
    headSize
  );

  // Sync participants to physics
  useEffect(() => {
    const heads = participants
      .map((p, pIdx) => {
        const agg = aggregates[p.id]?.[category.index];
        if (!agg || agg.count === 0) return null;

        const existing = positions.find(pos => pos.id === p.id);
        
        return {
          id: p.id,
          x: agg.mean,
          y: existing?.y ?? (Math.sin(pIdx * 1.5) * 40), // Deterministic spread
          vx: 0,
          vy: 0,
        };
      })
      .filter((h): h is PlacedHead => h !== null);

    updateHeads(heads);
    setTimeout(() => triggerSimulation(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, aggregates, category.index, updateHeads]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-7xl h-full flex flex-col min-h-[600px] mx-auto"
    >
      {/* Category title */}
      <div className="text-center mb-6">
        <span className="text-7xl mb-2 block">{category.emoji}</span>
        <h1 className="text-5xl font-black tracking-tight">
          <span className="text-[var(--primary)]">{category.left}</span>
          <span className="mx-4 text-white/20">/</span>
          <span className="text-[var(--accent)]">{category.right}</span>
        </h1>
      </div>

      {/* Main Spectrum Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Labels positioned at the ends of the spectrum bar area */}
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

        {/* The 2D Area */}
        <div 
          ref={containerRef}
          className="flex-1 relative rounded-3xl overflow-hidden glass border-2 border-white/10 min-h-[400px]"
          style={{
            background: 'linear-gradient(to right, rgba(91, 164, 212, 0.08), rgba(255,255,255,0.02) 50%, rgba(126, 184, 218, 0.08))',
          }}
        >
          {/* Decorative grid/lines */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/10" />
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/5" />
          
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map(tick => (
            <div
              key={tick}
              className="absolute top-0 bottom-0 w-px bg-white/5"
              style={{ left: `${tick}%` }}
            />
          ))}

          {/* Placed participants with physics */}
          {containerSize.width > 0 && positions.map((pos) => {
            const p = participants.find(part => part.id === pos.id);
            if (!p) return null;
            const pIndex = participants.indexOf(p);
            
            const xPos = (pos.x / 100) * containerSize.width - headSize / 2;
            const yPos = (containerSize.height / 2) + (pos.y * containerSize.height / 200) - headSize / 2;

              return (
                <motion.div
                key={p.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                  x: xPos,
                  y: yPos,
                }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                className="absolute left-0 top-0"
                style={{ width: headSize, height: headSize }}
              >
                <div className="relative group">
                  {/* Black outer border */}
                  <div className="w-24 h-24 rounded-full p-1.5 flex items-center justify-center bg-black transition-transform group-hover:scale-110">
                    {/* White middle border */}
                    <div className="w-full h-full rounded-full p-1 bg-white flex items-center justify-center">
                      {/* Avatar inner */}
                      <div
                        className="w-full h-full rounded-full bg-cover bg-center shadow-2xl"
                        style={{
                          backgroundImage: p.avatar_url ? `url(${p.avatar_url})` : undefined,
                          backgroundColor: p.avatar_url ? undefined : getAvatarColor(pIndex),
                        }}
                      >
                        {!p.avatar_url && (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-3xl">
                            {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-32 text-center">
                    <p className="text-lg font-bold text-white drop-shadow-md truncate">
                      {p.name.split(' ')[0]}
                    </p>
                  </div>
                </div>
                </motion.div>
              );
            })}
        </div>
      </div>
    </motion.div>
  );
}

// Spotlight View Component - Shows one person with all 4 spectrums
function SpotlightView({
  person,
  participants,
  aggregates,
}: {
  person: Participant | null;
  participants: Participant[];
  aggregates: AggregatedData;
}) {
  const [flipCount, setFlipCount] = useState(0);
  const [rightSideState, setRightSideState] = useState<'votes' | 'celebs'>('votes');

  // Flip animation every 10 seconds and toggle state every 15 seconds
  useEffect(() => {
    const flipInterval = setInterval(() => {
      setFlipCount(prev => prev + 1);
    }, 10000);
    
    const stateInterval = setInterval(() => {
      setRightSideState(prev => prev === 'votes' ? 'celebs' : 'votes');
    }, 15000);
    
    return () => {
      clearInterval(flipInterval);
      clearInterval(stateInterval);
    };
  }, []);

  if (!person) return null;

  const personIndex = participants.findIndex(p => p.id === person.id);
  const personAgg = aggregates[person.id] || {};
  const predictedMBTI = calculatePredictedMBTI(personAgg);
  const celebs = MBTI_CELEBRITIES[predictedMBTI] || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-7xl flex gap-12 items-center"
    >
      {/* Large avatar on left */}
      <div className="flex-shrink-0 text-center" style={{ perspective: '1000px' }}>
        <motion.div
          initial={{ scale: 0.8, rotateY: 0 }}
          animate={{ 
            scale: 1, 
            rotateY: flipCount % 2 === 0 ? 0 : 180,
          }}
          transition={{ 
            scale: { duration: 0.5 },
            rotateY: { duration: 0.8, ease: 'easeInOut' }
          }}
          className="w-[30rem] h-[30rem] rounded-full bg-cover bg-center mx-auto"
          style={{
            backgroundImage: person.avatar_url ? `url(${person.avatar_url})` : undefined,
            backgroundColor: person.avatar_url ? undefined : getAvatarColor(personIndex),
            transformStyle: 'preserve-3d',
          }}
        >
          {!person.avatar_url && (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-9xl">
              {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          )}
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-6xl font-black mt-8 text-gradient"
          style={{ fontFamily: 'var(--font-playfair), serif' }}
        >
          {person.name}
        </motion.h2>
      </div>

      {/* Right side - Two states */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {rightSideState === 'votes' ? (
            <motion.div
              key="votes-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="mb-6">
                <h3 className="text-2xl font-black text-gradient uppercase tracking-tighter">
                  Perception Collective
                </h3>
                <p className="text-[var(--muted-foreground)] italic">
                  Où les autres vous placent sur le spectre
                </p>
              </div>

              {CATEGORIES.map((category) => {
                const agg = personAgg[category.index];
                const position = agg?.mean ?? 50;
                const hasVotes = !!agg;

                return (
                  <div
                    key={category.index}
                    className="glass p-5 rounded-2xl border border-white/5"
                  >
                    {/* Labels */}
                    <div className="flex justify-between text-sm font-black uppercase tracking-widest mb-3">
                      <span className="flex items-center gap-2 text-[var(--primary)]">
                        <span className="text-2xl">{category.leftEmoji}</span>
                        {category.left}
                      </span>
                      <span className="flex items-center gap-2 text-[var(--accent)]">
                        {category.right}
                        <span className="text-2xl">{category.rightEmoji}</span>
                      </span>
                    </div>

                    {/* Mini spectrum */}
                    <div className="relative h-10 mt-2 mb-4">
                      <div className="absolute inset-0 bg-white/5 rounded-full border border-white/10">
                        <div className="absolute left-0 right-0 top-0 bottom-0 bg-gradient-to-r from-[var(--primary)]/10 via-transparent to-[var(--accent)]/10 rounded-full" />
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
                      </div>

                      {hasVotes ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, left: `${position}%` }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                        >
                          <div
                            className="w-12 h-12 rounded-full bg-cover bg-center shadow-2xl border-2 border-white"
                            style={{
                              backgroundImage: person.avatar_url ? `url(${person.avatar_url})` : undefined,
                              backgroundColor: person.avatar_url ? undefined : getAvatarColor(personIndex),
                            }}
                          />
                        </motion.div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs font-black uppercase tracking-widest">
                          En attente de votes...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="celebs-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Prediction Header ONLY in Celebs state */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass p-6 rounded-3xl border-2 border-[var(--secondary)]/30 mb-8 flex items-center justify-between"
              >
                <div>
                  <p className="text-[var(--muted-foreground)] text-xs uppercase tracking-[0.2em] font-black mb-1">
                    PROFIL PRÉDIT
                  </p>
                  <div className="text-6xl font-black text-gradient">
                    {predictedMBTI}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[var(--secondary)]">
                    {MBTI_DESCRIPTIONS[predictedMBTI]}
                  </p>
                  <p className="text-[var(--muted-foreground)] italic">
                    Personnalités similaires
                  </p>
                </div>
              </motion.div>

              <div className="grid grid-cols-3 gap-6">
                {celebs.map((celeb, idx) => (
                  <motion.div
                    key={celeb.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass p-5 rounded-[2.5rem] border border-white/10 flex flex-col items-center text-center justify-start hover:bg-white/5 transition-colors"
                  >
                    <div
                      className="w-full aspect-square rounded-[2rem] mb-4 bg-cover bg-center shadow-2xl border border-white/10 shrink-0"
                      style={{ backgroundImage: `url(${celeb.imageUrl})` }}
                    />
                    <div className="flex flex-col justify-start pb-2">
                      <h3 className="text-xl font-black mb-2 text-gradient leading-tight">
                        {celeb.name}
                      </h3>
                      <p className="text-sm text-[var(--muted-foreground)] leading-snug font-medium">
                        {celeb.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function BoardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-2xl">⏳ Chargement...</div>
        </main>
      }
    >
      <BoardContent />
    </Suspense>
  );
}
