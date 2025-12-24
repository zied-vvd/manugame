'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { supabase, setCurrentSession } from '@/lib/supabase';
import { generateRoomCode, ALL_MBTI_TYPES } from '@/lib/constants';
import { Participant, MBTIType, Session } from '@/lib/types';
import { ParticipantCard } from '@/components/ParticipantCard';
import { PARTY_MEMBERS, getPartyMemberAvatarUrl } from '@/lib/party-members';

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMbti, setNewMbti] = useState<MBTIType>('ENFP');

  // Create or load session
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const existingCode = urlParams.get('code');

    if (existingCode) {
      loadSession(existingCode);
    }
  }, []);

  async function loadSession(code: string) {
    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code)
        .single();

      if (sessionError) throw sessionError;

      const s = sessionData as Session;
      setSession(s);
      setCurrentSession(s.id, s.code);

      const { data: participantsData } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', s.id)
        .order('created_at');

      if (participantsData) {
        setParticipants(participantsData as Participant[]);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createSession() {
    setLoading(true);
    try {
      const code = generateRoomCode();
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          code,
          phase: 'lobby',
          current_category: 0,
          show_live_board: false,
        })
        .select()
        .single();

      if (error) throw error;

      setSession(data);
      setCurrentSession(data.id, data.code);
      
      // Update URL without reload
      window.history.replaceState({}, '', `/admin?code=${code}`);
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createChristmasParty() {
    setLoading(true);
    try {
      // Create session
      const code = generateRoomCode();
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          code,
          phase: 'lobby',
          current_category: 0,
          show_live_board: false,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Add all party members
      const participantsToInsert = PARTY_MEMBERS.map((member) => ({
        session_id: sessionData.id,
        name: member.name,
        real_mbti: member.mbti,
        avatar_url: getPartyMemberAvatarUrl(member),
      }));

      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .insert(participantsToInsert)
        .select();

      if (participantsError) throw participantsError;

      setSession(sessionData);
      setCurrentSession(sessionData.id, sessionData.code);
      setParticipants(participantsData || []);
      
      // Update URL without reload
      window.history.replaceState({}, '', `/admin?code=${code}`);
    } catch (error) {
      console.error('Error creating Christmas party:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addParticipant() {
    if (!session || !newName.trim()) return;

    const tempId = uuidv4();
    const newParticipant: Participant = {
      id: tempId,
      session_id: session.id,
      name: newName.trim(),
      avatar_url: null,
      real_mbti: newMbti,
      claimed_at: null,
      device_id: null,
    };

    // Optimistic update
    setParticipants((prev) => [...prev, newParticipant]);
    setNewName('');

    try {
      const { data, error } = await supabase
        .from('participants')
        .insert({
          session_id: session.id,
          name: newParticipant.name,
          real_mbti: newParticipant.real_mbti,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp with real data
      setParticipants((prev) =>
        prev.map((p) => (p.id === tempId ? data : p))
      );
    } catch (error) {
      console.error('Error adding participant:', error);
      // Rollback on error
      setParticipants((prev) => prev.filter((p) => p.id !== tempId));
    }
  }

  async function updateParticipant(id: string, updates: Partial<Participant>) {
    // Optimistic update
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );

    try {
      const { error } = await supabase
        .from('participants')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating participant:', error);
    }
  }

  async function removeParticipant(id: string) {
    const participant = participants.find((p) => p.id === id);
    
    // Optimistic update
    setParticipants((prev) => prev.filter((p) => p.id !== id));

    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing participant:', error);
      // Rollback
      if (participant) {
        setParticipants((prev) => [...prev, participant]);
      }
    }
  }

  async function updatePhase(phase: 'lobby' | 'voting' | 'reveal') {
    if (!session) return;

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ phase })
        .eq('id', session.id);

      if (error) throw error;

      setSession({ ...session, phase });
    } catch (error) {
      console.error('Error updating phase:', error);
    }
  }

  async function toggleLiveBoard() {
    if (!session) return;

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ show_live_board: !session.show_live_board })
        .eq('id', session.id);

      if (error) throw error;

      setSession({ ...session, show_live_board: !session.show_live_board });
    } catch (error) {
      console.error('Error toggling live board:', error);
    }
  }

  // No session yet - show create button
  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md w-full glass p-8"
        >
          <h1 
            className="text-4xl font-bold mb-4 text-gradient"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Créer une partie
          </h1>
          <p className="text-[var(--muted-foreground)] mb-8">
            Configurez les participants et leurs types MBTI réels.
          </p>

          {/* Christmas Party Quick Start */}
          <button
            onClick={createChristmasParty}
            disabled={loading}
            className="btn btn-secondary w-full text-lg py-4 mb-4"
          >
            {loading ? '⏳ Création...' : '🎄 Christmas Party 2024'}
          </button>

          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[var(--muted-foreground)] text-sm">ou</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <button
            onClick={createSession}
            disabled={loading}
            className="btn btn-primary w-full text-lg py-4"
          >
            {loading ? '⏳ Création...' : '✨ Nouvelle Partie Vide'}
          </button>

          <button
            onClick={() => router.push('/admin/celebrities')}
            className="btn btn-ghost w-full mt-4"
          >
            🌟 Voir les Célébrités MBTI
          </button>

          <button
            onClick={() => router.push('/')}
            className="btn btn-ghost w-full mt-2"
          >
            ← Retour
          </button>
        </motion.div>
      </main>
    );
  }

  // Session exists - show admin panel
  return (
    <main className="min-h-screen p-6 pb-32">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 relative"
        >
          <button
            onClick={() => router.push('/admin/celebrities')}
            className="absolute right-0 top-0 btn btn-ghost btn-sm"
            title="Répertoire des Célébrités"
          >
            🌟
          </button>
          <p className="text-[var(--muted-foreground)] mb-2">Code de la partie</p>
          <h1 className="text-5xl font-bold tracking-widest text-gradient mb-4">
            {session.code}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                session.phase === 'lobby'
                  ? 'bg-[var(--secondary)]/20 text-[var(--secondary)]'
                  : session.phase === 'voting'
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                  : 'bg-[var(--primary)]/20 text-[var(--primary)]'
              }`}
            >
              {session.phase === 'lobby' && '🏠 Lobby'}
              {session.phase === 'voting' && '🗳️ Vote en cours'}
              {session.phase === 'reveal' && '🎭 Révélation'}
            </span>
            <span className="text-[var(--muted-foreground)]">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </span>
          </div>
        </motion.div>

        {/* Add participant form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card mb-6"
        >
          <h2 className="text-lg font-semibold mb-4">➕ Ajouter un participant</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
              placeholder="Nom"
              className="input flex-1"
            />
            <select
              value={newMbti}
              onChange={(e) => setNewMbti(e.target.value as MBTIType)}
              className="input w-28"
            >
              {ALL_MBTI_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <button
              onClick={addParticipant}
              disabled={!newName.trim()}
              className="btn btn-primary"
            >
              Ajouter
            </button>
          </div>
        </motion.div>

        {/* Participants list */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3 mb-8"
        >
          <AnimatePresence mode="popLayout">
            {participants.map((participant, index) => (
              <ParticipantCard
                key={participant.id}
                participant={participant}
                index={index}
                onUpdate={updateParticipant}
                onRemove={removeParticipant}
              />
            ))}
          </AnimatePresence>

          {participants.length === 0 && (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <p className="text-4xl mb-4">👥</p>
              <p>Ajoutez des participants pour commencer</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Fixed bottom controls */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="fixed bottom-0 left-0 right-0 glass border-t border-[var(--glass-border)] p-4"
      >
        <div className="max-w-2xl mx-auto flex gap-3">
          {session.phase === 'lobby' && (
            <>
              <button
                onClick={toggleLiveBoard}
                className={`btn ${session.show_live_board ? 'btn-secondary' : 'btn-ghost'} flex-1`}
              >
                📺 Live Board {session.show_live_board ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => updatePhase('voting')}
                disabled={participants.length < 2}
                className="btn btn-primary flex-1"
              >
                🗳️ Lancer les Votes
              </button>
            </>
          )}

          {session.phase === 'voting' && (
            <>
              <button
                onClick={toggleLiveBoard}
                className={`btn ${session.show_live_board ? 'btn-secondary' : 'btn-ghost'} flex-1`}
              >
                📺 Live Board {session.show_live_board ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => updatePhase('reveal')}
                className="btn btn-primary flex-1"
              >
                🎭 Lancer la Révélation
              </button>
            </>
          )}

          {session.phase === 'reveal' && (
            <>
              <button
                onClick={() => router.push(`/reveal?code=${session.code}`)}
                className="btn btn-primary flex-1"
              >
                🎬 Ouvrir la Révélation
              </button>
              <button
                onClick={() => updatePhase('lobby')}
                className="btn btn-ghost flex-1"
              >
                🔄 Recommencer
              </button>
            </>
          )}
        </div>
      </motion.div>
    </main>
  );
}
