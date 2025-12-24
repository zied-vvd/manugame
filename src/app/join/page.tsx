'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, getDeviceId, setCurrentSession, setCurrentParticipant } from '@/lib/supabase';
import { Participant, Session } from '@/lib/types';
import { AvatarWithName } from '@/components/Avatar';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get('code');

  const [code, setCode] = useState(codeFromUrl || '');
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Auto-join if code is in URL
  useEffect(() => {
    if (codeFromUrl) {
      joinSession(codeFromUrl);
    }
  }, [codeFromUrl]);

  // Subscribe to participant and session changes
  useEffect(() => {
    if (!session) return;

    const participantsChannel = supabase
      .channel('participants-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${session.id}`,
        },
        (payload: { eventType: string; new: Participant }) => {
          if (payload.eventType === 'UPDATE') {
            setParticipants((prev) =>
              prev.map((p) =>
                p.id === payload.new.id ? payload.new : p
              )
            );
          } else if (payload.eventType === 'INSERT') {
            setParticipants((prev) => [...prev, payload.new]);
          }
        }
      )
      .subscribe();

    const sessionChannel = supabase
      .channel('session-changes-join')
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
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [session]);

  async function joinSession(sessionCode: string) {
    setLoading(true);
    setError('');

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

      // Allow joining in lobby or voting phase (not during reveal)
      if (sessionData.phase === 'reveal') {
        setError('La révélation a déjà commencé !');
        return;
      }

      setSession(sessionData);
      setCurrentSession(sessionData.id, sessionData.code);

      const { data: participantsData } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionData.id)
        .order('created_at');

      if (participantsData) {
        const typedParticipants = participantsData as Participant[];
        setParticipants(typedParticipants);

        // Check if this device already claimed someone
        const deviceId = getDeviceId();
        const alreadyClaimed = typedParticipants.find(
          (p) => p.device_id === deviceId
        );
        if (alreadyClaimed) {
          setCurrentParticipant(alreadyClaimed.id);
          router.push('/play');
        }
      }
    } catch (err) {
      console.error('Error joining:', err);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  async function claimParticipant(participant: Participant) {
    if (participant.claimed_at) return;

    setConfirming(true);
    setSelectedParticipant(participant);
  }

  async function confirmClaim() {
    if (!selectedParticipant || !session) return;

    setLoading(true);

    try {
      const deviceId = getDeviceId();
      const { error } = await supabase
        .from('participants')
        .update({
          claimed_at: new Date().toISOString(),
          device_id: deviceId,
        })
        .eq('id', selectedParticipant.id)
        .is('claimed_at', null); // Only claim if not already claimed

      if (error) throw error;

      setCurrentParticipant(selectedParticipant.id);
      router.push('/play');
    } catch (err) {
      console.error('Error claiming:', err);
      setError('Ce participant a déjà été réclamé');
      setConfirming(false);
      setSelectedParticipant(null);
      // Refresh participants
      joinSession(session.code);
    } finally {
      setLoading(false);
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
          <h1 
            className="text-4xl font-bold mb-2 text-gradient"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Rejoindre
          </h1>
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
            onKeyDown={(e) => e.key === 'Enter' && joinSession(code)}
            placeholder="CODE"
            className="input text-center text-3xl tracking-widest uppercase mb-4"
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
            onClick={() => joinSession(code)}
            disabled={loading || code.length < 4}
            className="btn btn-primary w-full text-lg py-4"
          >
            {loading ? '⏳ Connexion...' : 'Rejoindre →'}
          </button>

          <button
            onClick={() => router.push('/')}
            className="btn btn-ghost w-full mt-4"
          >
            ← Retour
          </button>
        </motion.div>
      </main>
    );
  }

  // Claim confirmation modal
  if (confirming && selectedParticipant) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md w-full glass p-8"
        >
          <h2 className="text-2xl font-bold mb-6">C&apos;est bien vous ?</h2>

          <AvatarWithName
            name={selectedParticipant.name}
            avatarUrl={selectedParticipant.avatar_url}
            index={participants.indexOf(selectedParticipant)}
            size="xl"
          />

          {session.phase === 'voting' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[var(--warning)] mt-4 text-sm"
            >
              ⚡ Les votes ont déjà commencé — dépêchez-vous !
            </motion.p>
          )}

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => {
                setConfirming(false);
                setSelectedParticipant(null);
              }}
              className="btn btn-ghost flex-1"
            >
              Non, retour
            </button>
            <button
              onClick={confirmClaim}
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? '⏳' : 'Oui, c\'est moi !'}
            </button>
          </div>
        </motion.div>
      </main>
    );
  }

  // Participant selection screen
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="text-[var(--muted-foreground)] mb-2">Partie</p>
          <h1 className="text-4xl font-bold tracking-widest text-gradient mb-4">
            {session.code}
          </h1>
          
          {/* Phase indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                session.phase === 'lobby'
                  ? 'bg-[var(--secondary)]/20 text-[var(--secondary)]'
                  : session.phase === 'voting'
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                  : 'bg-[var(--primary)]/20 text-[var(--primary)]'
              }`}
            >
              {session.phase === 'lobby' && '🏠 En attente'}
              {session.phase === 'voting' && '🗳️ Votes en cours'}
              {session.phase === 'reveal' && '🎭 Révélation'}
            </span>
          </div>

          <p className="text-lg">Qui êtes-vous ?</p>
          
          {session.phase === 'voting' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[var(--warning)] text-sm mt-2"
            >
              ⚡ Rejoignez vite pour voter !
            </motion.p>
          )}
        </motion.div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[var(--error)] text-center mb-4"
          >
            {error}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 sm:grid-cols-4 gap-6 justify-items-center"
        >
          <AnimatePresence>
            {participants.map((participant, index) => (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={participant.claimed_at ? 'opacity-50 pointer-events-none' : ''}
              >
                <AvatarWithName
                  name={participant.name}
                  avatarUrl={participant.avatar_url}
                  index={index}
                  size="lg"
                  claimed={!!participant.claimed_at}
                  onClick={() => claimParticipant(participant)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {participants.length === 0 && (
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            <p className="text-4xl mb-4">⏳</p>
            <p>En attente des participants...</p>
          </div>
        )}

        {/* Count of available spots */}
        {participants.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-[var(--muted-foreground)] mt-8 text-sm"
          >
            {participants.filter(p => !p.claimed_at).length} place(s) disponible(s) sur {participants.length}
          </motion.p>
        )}
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">⏳ Chargement...</div>
      </main>
    }>
      <JoinContent />
    </Suspense>
  );
}
