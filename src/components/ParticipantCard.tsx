'use client';

import { motion } from 'framer-motion';
import { Participant } from '@/lib/types';
import { ALL_MBTI_TYPES } from '@/lib/constants';
import { ImageUpload } from './ImageUpload';

interface ParticipantCardProps {
  participant: Participant;
  index: number;
  onUpdate: (id: string, updates: Partial<Participant>) => void;
  onRemove: (id: string) => void;
}

export function ParticipantCard({
  participant,
  index,
  onUpdate,
  onRemove,
}: ParticipantCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="card flex items-center gap-3"
    >
      {/* Avatar with upload */}
      <ImageUpload
        participantId={participant.id}
        participantName={participant.name}
        currentUrl={participant.avatar_url}
        index={index}
        onUpload={(url) => onUpdate(participant.id, { avatar_url: url })}
      />

      {/* Name input */}
      <input
        type="text"
        value={participant.name}
        onChange={(e) => onUpdate(participant.id, { name: e.target.value })}
        className="input font-semibold"
        placeholder="Nom"
        style={{ flex: '1 1 auto', minWidth: 0 }}
      />
      
      {/* MBTI select */}
      <select
        value={participant.real_mbti}
        onChange={(e) => onUpdate(participant.id, { real_mbti: e.target.value as Participant['real_mbti'] })}
        className="input text-sm"
        style={{ width: '80px', flexShrink: 0 }}
      >
        {ALL_MBTI_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      {/* Remove button */}
      <button
        onClick={() => onRemove(participant.id)}
        className="p-2 text-[var(--muted-foreground)] hover:text-[var(--error)] transition-colors"
        style={{ flexShrink: 0 }}
        title="Supprimer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
    </motion.div>
  );
}
