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
  { name: 'Lala', mbti: 'ENFP', image: 'dub.png' },
  { name: 'Marti', mbti: 'ESFP', image: 'martina.png' },
  { name: 'Martin', mbti: 'ESTJ', image: 'martin.png' },
  { name: 'Louis', mbti: 'ENTP', image: 'louis.png' },
  { name: 'Zied', mbti: 'ENTP', image: 'zied.png' },
  { name: 'Axel', mbti: 'INFP', image: 'axel.png' },
  { name: 'Clara', mbti: 'INFP', image: 'clara.png' },
  { name: 'Marieve', mbti: 'INFP', image: 'marieve.png' },
  { name: 'LP', mbti: 'ENFP', image: 'lp.png' },
  { name: 'Patricia', mbti: 'ENTJ', image: 'patricia.png' },
  { name: 'Pénélope', mbti: 'ISFP', image: 'pepe.png' },
  { name: 'Manu', mbti: 'ESTJ', image: 'manu.png' },
  { name: 'Anne Phil', mbti: 'ESFJ', image: 'annephil.png' },
  { name: 'Lorraine', mbti: 'ISFP', image: 'lorraine.png' },
  { name: 'JY', mbti: 'ENTP', image: 'jy.png' },
  { name: 'Zach', mbti: 'ENTP', image: 'zach.png' },
  { name: 'Marie-Helene', mbti: 'ISFJ', image: 'marie.png' },
  { name: 'Virginie', mbti: 'ISFJ', image: 'virginie.png' },
];

/**
 * Get the full avatar URL for a party member
 */
export function getPartyMemberAvatarUrl(member: PartyMember): string {
  return `/avatars/${member.image}`;
}
