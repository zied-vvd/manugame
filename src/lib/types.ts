// Core types for the MBTI Party Game

export type GamePhase = 'lobby' | 'voting' | 'reveal';

export type MBTIType = 
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';

export type CategoryIndex = 0 | 1 | 2 | 3;

export interface Session {
  id: string;
  code: string;
  phase: GamePhase;
  current_category: CategoryIndex;
  created_at: string;
  show_live_board: boolean;
}

export interface Participant {
  id: string;
  session_id: string;
  name: string;
  avatar_url: string | null;
  real_mbti: MBTIType;
  claimed_at: string | null;
  device_id: string | null;
}

export interface Vote {
  id: string;
  session_id: string;
  voter_id: string;
  target_id: string;
  category: CategoryIndex;
  position: number; // 0-100, where 0 = left trait, 100 = right trait
  updated_at: string;
}

// Computed aggregates
export interface ParticipantAggregate {
  participant_id: string;
  category: CategoryIndex;
  mean_position: number;
  vote_count: number;
}

export interface CategoryResult {
  participant_id: string;
  guessed_position: number; // mean of votes
  actual_side: 'left' | 'right'; // based on real MBTI
}

// For the voting UI
export interface VoteState {
  [targetId: string]: number; // position 0-100
}

// Award types for the reveal finale
export type AwardType =
  | 'most_extroverted' | 'most_introverted'
  | 'most_intuitive' | 'most_observant'
  | 'most_rational' | 'most_feeling'
  | 'most_organized' | 'most_explorer'
  | 'best_guesser'
  | 'most_mysterious'
  | 'most_obvious';

export interface Award {
  type: AwardType;
  emoji: string;
  title: string;
  description: string;
  winner: Participant;
  value?: number;
}

// Database row types for Supabase
export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: Session;
        Insert: Omit<Session, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Session, 'id'>>;
      };
      participants: {
        Row: Participant;
        Insert: Omit<Participant, 'id'> & { id?: string };
        Update: Partial<Omit<Participant, 'id'>>;
      };
      votes: {
        Row: Vote;
        Insert: Omit<Vote, 'id' | 'updated_at'> & { id?: string; updated_at?: string };
        Update: Partial<Omit<Vote, 'id'>>;
      };
    };
  };
}

