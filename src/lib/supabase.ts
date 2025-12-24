import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient(supabaseUrl, supabaseAnonKey) as any;

// Helper to get or create a device ID for this browser
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  let deviceId = localStorage.getItem('mbti_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('mbti_device_id', deviceId);
  }
  return deviceId;
}

// Session storage for current game
export function setCurrentSession(sessionId: string, code: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('mbti_session_id', sessionId);
  sessionStorage.setItem('mbti_session_code', code);
}

export function getCurrentSession(): { sessionId: string; code: string } | null {
  if (typeof window === 'undefined') return null;
  const sessionId = sessionStorage.getItem('mbti_session_id');
  const code = sessionStorage.getItem('mbti_session_code');
  if (sessionId && code) {
    return { sessionId, code };
  }
  return null;
}

export function setCurrentParticipant(participantId: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('mbti_participant_id', participantId);
}

export function getCurrentParticipant(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('mbti_participant_id');
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('mbti_session_id');
  sessionStorage.removeItem('mbti_session_code');
  sessionStorage.removeItem('mbti_participant_id');
}

