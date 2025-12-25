'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Participant, Vote } from '@/lib/types';
import { CATEGORIES, getAvatarColor } from '@/lib/constants';

interface VotingScreenProps {
  category: (typeof CATEGORIES)[number];
  categoryIndex: number;
  targets: Participant[];
  votes: Vote[];
  onVote: (targetId: string, position: number) => void;
  onBack: () => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstCategory: boolean;
  isLastCategory: boolean;
}

interface PlacedHead {
  id: string;
  x: number; // 0-100 percentage
  y: number; // -100 to 100 percentage (relative to center)
  vx: number; // velocity x
  vy: number; // velocity y
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
  
  // Keep config ref up to date
  useEffect(() => {
    configRef.current = { containerWidth, containerHeight, headSize };
  }, [containerWidth, containerHeight, headSize]);

  // Update heads function
  const updateHeads = useCallback((heads: PlacedHead[]) => {
    positionsRef.current = heads;
    setPositions(heads);
  }, []);

  // Simulation step function
  const simulateStep = useCallback(() => {
    const { containerWidth: cw, containerHeight: ch, headSize: hs } = configRef.current;
    if (cw === 0) return false;
    
    const current = [...positionsRef.current];
    const padding = 8;
    const minDistance = hs + padding;
    
    // Apply forces
    for (let i = 0; i < current.length; i++) {
      const head = current[i];
      
      // Collision with other heads
      for (let j = i + 1; j < current.length; j++) {
        const other = current[j];
        
        const dx = (other.x - head.x) * cw / 100;
        const dy = (other.y - head.y) * ch / 200; // y is -100 to 100
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          // Strong repulsion force when overlapping
          const overlap = minDistance - distance;
          const pushStrength = overlap * 0.3;
          
          if (distance === 0) {
            // If exactly overlapping, push in deterministic alternating directions
            const angle = (i * 1.33); 
            head.vy += Math.sin(angle) * 2;
            other.vy -= Math.sin(angle) * 2;
          } else {
            // Push apart based on relative position
            const ny = dy / distance;
            head.vy -= ny * pushStrength;
            other.vy += ny * pushStrength;
          }
        }
      }
      
      // Damping
      head.vy *= 0.6;
      
      // Apply velocity (convert pixels to percentage)
      head.y += (head.vy / ch) * 200;
      
      // Clamp Y to container bounds
      const maxYPct = 100 - (hs / ch) * 100;
      head.y = Math.max(-maxYPct, Math.min(maxYPct, head.y));
    }
    
    positionsRef.current = current;
    setPositions([...current]);
    
    // Return whether there's still movement
    const hasMovement = current.some(h => Math.abs(h.vy) > 0.05);
    return hasMovement;
  }, []);

  // Animation loop
  const runSimulation = useCallback(() => {
    const loop = () => {
      const hasMovement = simulateStep();
      if (hasMovement) {
        animationRef.current = requestAnimationFrame(loop);
      }
    };
    loop();
  }, [simulateStep]);

  useEffect(() => {
    if (positions.length === 0 || containerWidth === 0) return;

    animationRef.current = requestAnimationFrame(runSimulation);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [positions.length, containerWidth, runSimulation]);

  const triggerSimulation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(runSimulation);
  }, [runSimulation]);

  return { positions, triggerSimulation, updateHeads };
}

// Draggable head component with grow effect
function DraggableHead({
  participant,
  index,
  isPlaced,
  onDragToSpectrum,
  spectrumRef,
}: {
  participant: Participant;
  index: number;
  isPlaced: boolean;
  onDragToSpectrum: (id: string, x: number, y: number) => void;
  spectrumRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const bgColor = getAvatarColor(index);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);

    // Check if dropped on spectrum
    if (spectrumRef.current) {
      const rect = spectrumRef.current.getBoundingClientRect();
      const point = info.point;
      
      if (
        point.x >= rect.left &&
        point.x <= rect.right &&
        point.y >= rect.top &&
        point.y <= rect.bottom
      ) {
        const x = ((point.x - rect.left) / rect.width) * 100;
        const y = (((point.y - (rect.top + rect.height / 2)) / (rect.height / 2))) * 100;
        onDragToSpectrum(participant.id, Math.max(2, Math.min(98, x)), Math.max(-95, Math.min(95, y)));
      }
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      animate={{ scale: isDragging ? 1.2 : 1 }}
      style={{ zIndex: isDragging ? 100 : 1 }}
      whileDrag={{ cursor: 'grabbing' }}
      className="flex flex-col items-center gap-1 cursor-grab touch-none"
    >
      <div
        className={`
          w-14 h-14 rounded-full flex items-center justify-center 
          font-bold text-white text-base shadow-lg transition-shadow
          ${isPlaced ? 'ring-2 ring-[var(--success)] ring-offset-2 ring-offset-transparent' : ''}
          ${isDragging ? 'shadow-2xl shadow-[var(--primary)]/30' : ''}
        `}
        style={{
          backgroundColor: participant.avatar_url ? 'transparent' : bgColor,
          backgroundImage: participant.avatar_url ? `url(${participant.avatar_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!participant.avatar_url && participant.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
      </div>
      <span className="text-xs text-[var(--muted-foreground)] max-w-16 truncate text-center">
        {participant.name.split(' ')[0]}
      </span>
    </motion.div>
  );
}

// Placed head on spectrum (draggable within spectrum)
function PlacedHeadOnSpectrum({
  participant,
  position,
  yPercent,
  index,
  containerWidth,
  containerHeight,
  spectrumRef,
  onDragEnd,
}: {
  participant: Participant;
  position: number;
  yPercent: number;
  index: number;
  containerWidth: number;
  containerHeight: number;
  spectrumRef: React.RefObject<HTMLDivElement | null>;
  onDragEnd: (id: string, x: number, y: number) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const lastPositionRef = useRef({ x: position, y: yPercent });
  const bgColor = getAvatarColor(index);
  const headSize = 56;

  useEffect(() => {
    lastPositionRef.current = { x: position, y: yPercent };
  }, [position, yPercent]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (spectrumRef.current) {
      const parentRect = spectrumRef.current.getBoundingClientRect();
      const x = ((info.point.x - parentRect.left) / parentRect.width) * 100;
      const y = (((info.point.y - (parentRect.top + parentRect.height / 2)) / (parentRect.height / 2))) * 100;
      lastPositionRef.current = {
        x: Math.max(2, Math.min(98, x)),
        y: Math.max(-95, Math.min(95, y))
      };
    }
  };

  const handleDragEndEvent = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    if (spectrumRef.current) {
      const parentRect = spectrumRef.current.getBoundingClientRect();
      const x = ((info.point.x - parentRect.left) / parentRect.width) * 100;
      const y = (((info.point.y - (parentRect.top + parentRect.height / 2)) / (parentRect.height / 2))) * 100;
      onDragEnd(
        participant.id,
        Math.max(2, Math.min(98, x)),
        Math.max(-95, Math.min(95, y))
      );
    } else {
      onDragEnd(participant.id, lastPositionRef.current.x, lastPositionRef.current.y);
    }
  };

  const xPos = (position / 100) * containerWidth - headSize / 2;
  const yPos = (containerHeight / 2) + (yPercent * containerHeight / 200) - headSize / 2;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={{ 
        left: -xPos, 
        right: containerWidth - xPos - headSize,
        top: -yPos,
        bottom: containerHeight - yPos - headSize
      }}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEndEvent}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: isDragging ? 1.2 : 1, opacity: 1 }}
      style={{ 
        position: 'absolute',
        left: xPos,
        top: yPos,
        zIndex: isDragging ? 100 : 10,
        width: headSize,
        height: headSize,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="cursor-grab active:cursor-grabbing touch-none"
    >
      <motion.div
        className="w-full h-full rounded-full flex items-center justify-center font-bold text-white text-base shadow-lg"
        style={{
          backgroundColor: participant.avatar_url ? 'transparent' : bgColor,
          backgroundImage: participant.avatar_url ? `url(${participant.avatar_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: isDragging 
            ? '0 12px 30px rgba(0,0,0,0.5), 0 0 20px rgba(91, 164, 212, 0.4)' 
            : '0 4px 15px rgba(0,0,0,0.3)',
        }}
      >
        {!participant.avatar_url && participant.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
      </motion.div>
    </motion.div>
  );
}

export function VotingScreen({
  category,
  categoryIndex,
  targets,
  votes,
  onVote,
  onBack,
  onNext,
  onPrevious,
  isFirstCategory,
  isLastCategory,
}: VotingScreenProps) {
  const spectrumRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const headSize = 56;

  // Create initial placed heads from votes
  const initialPlacedHeads = useMemo(() => {
    return votes.map(v => ({
      id: v.target_id,
      x: v.position,
      y: 0,
      vx: 0,
      vy: 0,
    }));
  }, [votes]);

  // Track placed heads with positions
  const [localHeads, setLocalHeads] = useState<PlacedHead[]>(initialPlacedHeads);

  // Sync with votes when they change externally
  useEffect(() => {
    const newPlaced = votes.map(v => {
      const existing = localHeads.find(h => h.id === v.target_id);
      return {
        id: v.target_id,
        x: v.position,
        y: existing?.y ?? 0,
        vx: 0,
        vy: existing?.vy ?? 0,
      };
    });
    setLocalHeads(newPlaced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votes]);

  // Measure container
  useEffect(() => {
    const updateSize = () => {
      if (spectrumRef.current) {
        const rect = spectrumRef.current.getBoundingClientRect();
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

  // Sync localHeads to physics simulation (preserve Y positions from physics)
  useEffect(() => {
    const currentPositions = positions;
    const headsWithPhysicsY = localHeads.map(h => {
      const existing = currentPositions.find(p => p.id === h.id);
      return {
        ...h,
        y: existing?.y ?? h.y,
        vy: existing?.vy ?? h.vy,
      };
    });
    updateHeads(headsWithPhysicsY);
    // Trigger simulation to resolve any overlaps
    setTimeout(() => triggerSimulation(), 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localHeads, updateHeads]);

  // Handle drag to spectrum from unplaced area
  const handleDragToSpectrum = useCallback((id: string, x: number, y: number) => {
    onVote(id, x);
    setLocalHeads(prev => {
      const existing = prev.find(h => h.id === id);
      if (existing) {
        return prev.map(h => h.id === id ? { ...h, x, y, vy: 0 } : h);
      }
      return [...prev, { id, x, y, vx: 0, vy: 0 }];
    });
    setTimeout(() => {
      triggerSimulation();
    }, 50);
  }, [onVote, triggerSimulation]);

  // Handle drag end within spectrum - receives final position directly
  const handleDragEndWithinSpectrum = useCallback((id: string, x: number, y: number) => {
    onVote(id, x);
    setLocalHeads(prev => {
      const newHeads = prev.map(h => h.id === id ? { ...h, x, y, vy: 0 } : h);
      updateHeads(newHeads);
      return newHeads;
    });
    setTimeout(() => triggerSimulation(), 50);
  }, [onVote, updateHeads, triggerSimulation]);

  const unplacedTargets = targets.filter(t => !votes.find(v => v.target_id === t.id));
  const placedTargets = targets.filter(t => votes.find(v => v.target_id === t.id));

  const placedCount = votes.length;
  const totalCount = targets.length;

  return (
      <main className="min-h-screen flex flex-col">
        {/* Header with step indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4"
        >
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="flex items-center gap-2 opacity-40">
              <div className="w-6 h-6 rounded-full bg-[var(--success)] flex items-center justify-center text-white font-bold text-xs">
                ✓
              </div>
              <span className="text-xs">Choisir</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-xs">
                2
              </div>
              <span className="text-xs font-medium">Voter</span>
            </div>
          </div>

          <div className="text-center text-xs text-[var(--muted-foreground)]">
            Catégorie {categoryIndex + 1}/4 · {placedCount}/{totalCount} placés
          </div>
        </motion.div>

      {/* Spectrum Area */}
      <div className="flex-1 px-4 pb-4 flex flex-col min-h-0">
        <div className="flex flex-col glass rounded-2xl p-4">
          {/* Labels at top */}
          <div className="flex justify-between items-start mb-3 px-2">
            {/* Left label */}
            <div className="flex items-center gap-2">
              <span className="text-3xl">{category.leftEmoji || '👈'}</span>
              <span className="text-lg font-semibold text-[var(--primary)]">
                {category.left}
              </span>
            </div>

            {/* Right label */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-[var(--accent)]">
                {category.right}
              </span>
              <span className="text-3xl">{category.rightEmoji || '👉'}</span>
            </div>
          </div>

        {/* Spectrum area */}
          <div
            ref={spectrumRef}
            className="spectrum-area relative rounded-xl overflow-hidden h-40"
            style={{
              background: 'linear-gradient(to right, rgba(91, 164, 212, 0.15), rgba(255,255,255,0.05) 50%, rgba(126, 184, 218, 0.15))',
              border: '2px dashed rgba(255,255,255,0.15)',
            }}
          >
            {/* Center line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
            
            {/* Tick marks */}
            {[0, 25, 50, 75, 100].map(tick => (
              <div
                key={tick}
                className="absolute top-0 bottom-0 w-px bg-white/10"
                style={{ left: `${tick}%` }}
              />
            ))}

            {/* Placed heads with physics */}
            {containerSize.width > 0 && positions.map((head) => {
              const participant = targets.find(t => t.id === head.id);
              if (!participant) return null;
              const idx = targets.findIndex(t => t.id === head.id);
              
              return (
                <PlacedHeadOnSpectrum
                  key={head.id}
                  participant={participant}
                  position={head.x}
                  yPercent={head.y}
                  index={idx}
                  containerWidth={containerSize.width}
                  containerHeight={containerSize.height}
                  spectrumRef={spectrumRef}
                  onDragEnd={handleDragEndWithinSpectrum}
                />
              );
            })}

            {/* Drop hint */}
            {unplacedTargets.length > 0 && placedTargets.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-[var(--muted-foreground)] text-lg">
                  Glissez les avatars ici ☝️
                </p>
              </div>
            )}
          </div>
        </div>

          {/* Unplaced targets */}
          {unplacedTargets.length > 0 && (
            <motion.div
            initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            className="mt-3 glass rounded-xl p-3"
            >
            <p className="text-center text-[var(--muted-foreground)] text-xs mb-2">
              Glissez sur le spectre ({unplacedTargets.length} restant{unplacedTargets.length > 1 ? 's' : ''})
              </p>
            <div className="flex flex-wrap justify-center gap-3">
                {unplacedTargets.map((target) => (
                <DraggableHead
                    key={target.id}
                    participant={target}
                  index={targets.findIndex(t => t.id === target.id)}
                    isPlaced={false}
                  onDragToSpectrum={handleDragToSpectrum}
                  spectrumRef={spectrumRef}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* All placed message */}
          {unplacedTargets.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 text-center py-2 glass rounded-xl"
            >
              <span className="text-[var(--success)] text-sm font-medium">
                ✓ Tous placés ! Glissez pour ajuster.
              </span>
            </motion.div>
          )}

          {/* Navigation buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 flex gap-3"
          >
            <button
              onClick={isFirstCategory ? onBack : onPrevious}
              className="flex-1 py-3 glass rounded-xl flex items-center justify-center gap-2 text-[var(--muted-foreground)] hover:text-white hover:border-white/30 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">
                {isFirstCategory ? 'Retour' : 'Précédent'}
              </span>
            </button>
            <button
              onClick={isLastCategory ? onBack : onNext}
              className="flex-1 py-3 glass rounded-xl flex items-center justify-center gap-2 text-white bg-[var(--primary)]/20 hover:bg-[var(--primary)]/40 border-[var(--primary)]/50 transition-all"
            >
              <span className="font-medium">
                {isLastCategory ? 'Terminer' : 'Suivant'}
              </span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </main>
  );
}
