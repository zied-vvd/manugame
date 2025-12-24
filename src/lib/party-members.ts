import { MBTIType } from './types';

export interface PartyMember {
  name: string;
  mbti: MBTIType;
  image: string; // filename in /public/avatars/
}

/**
 * Pre-configured party members for Christmas 2024
 * Images are in /public/avatars/
 */
export const PARTY_MEMBERS: PartyMember[] = [
  { name: 'Dubravka', mbti: 'ENFP', image: 'dub.png' },
  { name: 'Marti', mbti: 'ESFP', image: 'martina.png' },
  { name: 'Martin', mbti: 'ESTJ', image: 'martin.png' },
  { name: 'Louis', mbti: 'ENTP', image: 'louis.png' },
  { name: 'Zied', mbti: 'ENTP', image: 'zied.png' },
  { name: 'Axel', mbti: 'ENTP', image: 'axel.png' },
  { name: 'Clara', mbti: 'INFP', image: 'clara.png' },
  { name: 'Marieve', mbti: 'INFP', image: 'marieve.png' },
  { name: 'LP', mbti: 'ENTJ', image: 'lp.png' },
  { name: 'Patricia', mbti: 'ENTJ', image: 'patricia.png' },
  { name: 'Pepe', mbti: 'ISFJ', image: 'pepe.png' },
  { name: 'Manu', mbti: 'ESTJ', image: 'manu.png' },
  { name: 'Anne Phil', mbti: 'ENFJ', image: 'annephil.png' },
  { name: 'Lorraine', mbti: 'ISFP', image: 'lorraine.png' },
  { name: 'JY', mbti: 'ENTP', image: 'jy.png' },
];

/**
 * Get the full avatar URL for a party member
 */
export function getPartyMemberAvatarUrl(member: PartyMember): string {
  return `/avatars/${member.image}`;
}
