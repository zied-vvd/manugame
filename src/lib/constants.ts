import { CategoryIndex, MBTIType, AwardType, Award, Participant, Vote } from './types';

// Categories in fixed order (French)
export const CATEGORIES = [
  {
    index: 0 as CategoryIndex,
    left: 'Introverti',
    right: 'Extraverti',
    leftCode: 'I',
    rightCode: 'E',
    emoji: '🧘',
    leftEmoji: '🧘',
    rightEmoji: '🎉',
  },
  {
    index: 1 as CategoryIndex,
    left: 'Intuitif',
    right: 'Observateur',
    leftCode: 'N',
    rightCode: 'S',
    emoji: '🔮',
    leftEmoji: '🔮',
    rightEmoji: '👀',
  },
  {
    index: 2 as CategoryIndex,
    left: 'Rationnel',
    right: 'Sensible',
    leftCode: 'T',
    rightCode: 'F',
    emoji: '🧠',
    leftEmoji: '🧠',
    rightEmoji: '❤️',
  },
  {
    index: 3 as CategoryIndex,
    left: 'Organisé',
    right: 'Explorateur',
    leftCode: 'J',
    rightCode: 'P',
    emoji: '📋',
    leftEmoji: '📋',
    rightEmoji: '🧭',
  },
] as const;

// Get the actual side for a participant based on their MBTI
export function getActualSide(mbti: MBTIType, categoryIndex: CategoryIndex): 'left' | 'right' {
  const category = CATEGORIES[categoryIndex];
  const mbtiChar = mbti[categoryIndex];
  return mbtiChar === category.leftCode ? 'left' : 'right';
}

// Calculate predicted MBTI based on mean positions
export function calculatePredictedMBTI(aggregates: Record<number, { mean: number }>): MBTIType {
  let predicted = '';
  
  for (let i = 0; i < 4; i++) {
    const agg = aggregates[i];
    const category = CATEGORIES[i];
    
    if (!agg) {
      // If no votes, default to a sensible default or just use the left code
      predicted += category.leftCode;
    } else {
      predicted += agg.mean >= 50 ? category.rightCode : category.leftCode;
    }
  }
  
  return predicted as MBTIType;
}

// Generate a random room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// All MBTI types for selection
export const ALL_MBTI_TYPES: MBTIType[] = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
];

// MBTI type descriptions (short)
export const MBTI_DESCRIPTIONS: Record<MBTIType, string> = {
  INTJ: 'L\'Architecte',
  INTP: 'Le Logicien',
  ENTJ: 'Le Commandant',
  ENTP: 'L\'Innovateur',
  INFJ: 'L\'Avocat',
  INFP: 'Le Médiateur',
  ENFJ: 'Le Protagoniste',
  ENFP: 'L\'Inspirateur',
  ISTJ: 'Le Logisticien',
  ISFJ: 'Le Défenseur',
  ESTJ: 'Le Directeur',
  ESFJ: 'Le Consul',
  ISTP: 'Le Virtuose',
  ISFP: 'L\'Aventurier',
  ESTP: 'L\'Entrepreneur',
  ESFP: 'L\'Amuseur',
};

export interface Celebrity {
  name: string;
  description: string;
  imageUrl: string;
}

export const MBTI_CELEBRITIES: Record<MBTIType, Celebrity[]> = {
  INTJ: [
    { name: 'Denis Villeneuve', description: 'Strategic, future-oriented storyteller with controlled aesthetics', imageUrl: '/celebs/denis.jpg' },
    { name: 'Lucien Bouchard', description: 'Long-range strategist in sovereignty-era politics', imageUrl: '/celebs/Lucien_Bouchard02_crop.jpg' },
    { name: 'Margaret Atwood', description: 'Intellectual, foresight-driven, socially critical', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Margaret_Atwood_2015.jpg/440px-Margaret_Atwood_2015.jpg' }
  ],
  INTP: [
    { name: 'Albert Einstein', description: 'Pure conceptual exploration', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Einstein_1921_by_F_Schmutzer_-_restoration.jpg/440px-Einstein_1921_by_F_Schmutzer_-_restoration.jpg' },
    { name: 'Jean-Marc Vallée', description: 'Meticulous, emotionally intelligent filmmaker', imageUrl: '/celebs/Jean-Marc_Vallée,_Genie_Awards_2012.jpg' },
    { name: 'Hubert Reeves', description: 'Abstract, cerebral exploration of the cosmos', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/80/Hubert_Reeves%2C_2015_%28cropped%29.jpg' }
  ],
  ENTJ: [
    { name: 'Steve Jobs', description: 'Vision + ruthless execution', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg/440px-Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg' },
    { name: 'Brian Mulroney', description: 'Scaled vision into national policy', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/40/Mulroney_%28cropped%29%282%29.jpg' },
    { name: 'Tywin Lannister', description: 'Authority, structure, legacy', imageUrl: '/celebs/Tywin_Lannister_4x08.webp' }
  ],
  ENTP: [
    { name: 'Guy Laliberté', description: 'Improvisational, risk-taking creator-entrepreneur', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Guy_Laliberte_WPT.jpg' },
    { name: 'Jay Du Temple', description: 'Rapid-fire wit, social creativity', imageUrl: '/celebs/jay-du-temple-les-enfants-de-la-tele.webp' },
    { name: 'Robin Williams', description: 'Improvisational brilliance', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Robin_Williams_2011a_%282%29.jpg/440px-Robin_Williams_2011a_%282%29.jpg' }
  ],
  INFJ: [
    { name: 'Robert Lepage', description: 'Visionary integrator across mediums with thematic depth', imageUrl: '/celebs/Robert_Lepage.jpg' },
    { name: 'Leonard Cohen', description: 'Quiet duty, values-first, poetic depth', imageUrl: '/celebs/Leonard_Cohen,_1988_01.jpg' },
    { name: 'Martin Luther King Jr.', description: 'Moral vision + long arc change', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Martin_Luther_King%2C_Jr..jpg/440px-Martin_Luther_King%2C_Jr..jpg' }
  ],
  INFP: [
    { name: 'Xavier Dolan', description: 'Emotive, values-driven auteur focused on identity', imageUrl: '/celebs/Xavier_Dolan_Cannes_2016.jpg' },
    { name: 'Michel Tremblay', description: 'Language, identity, and humanism in literature', imageUrl: '/celebs/micheltremblay.jpeg' },
    { name: 'Cœur de pirate', description: 'Introspective, expressive art', imageUrl: '/celebs/piratecoeur.jpg' }
  ],
  ENFJ: [
    { name: 'Justin Trudeau', description: 'Relational leadership', imageUrl: '/celebs/trudeau.avif' },
    { name: 'Oprah Winfrey', description: 'Emotional leadership at scale', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Oprah_in_2014.jpg/440px-Oprah_in_2014.jpg' },
    { name: 'Véronique Cloutier', description: 'Guidance through connection and charisma', imageUrl: '/celebs/veronique-cloutier-bio-1.jpg' }
  ],
  ENFP: [
    { name: 'Charlotte Cardin', description: 'Expressive creativity', imageUrl: '/celebs/charlotte.webp' },
    { name: 'Will Smith', description: 'Big emotional range + optimism', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/TechCrunch_Disrupt_2019_%2848834434641%29_%28cropped%29.jpg/440px-TechCrunch_Disrupt_2019_%2848834434641%29_%28cropped%29.jpg' },
    { name: 'Mitsou', description: 'Playful idealism and energy', imageUrl: '/celebs/mitsou.jpeg' }
  ],
  ISTJ: [
    { name: 'Georges St-Pierre', description: 'Disciplined, methodical competitor with structured preparation', imageUrl: '/celebs/gsp.jpg' },
    { name: 'Jean Charest', description: 'Institutional steadiness', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Agriculture_Secretary_Perdue_Visit_to_Canada_20170605-OSEC-RV-0003_%2834337316314%29_%28cropped%29.jpg' },
    { name: 'Eddard Stark', description: 'Law, honor, structure', imageUrl: '/celebs/Eddard_Stark.webp' }
  ],
  ISFJ: [
    { name: 'Ginette Reno', description: 'Duty, care, emotional depth', imageUrl: 'https://canadianmusichalloffame.ca/wp-content/uploads/2025/01/CMHF_Ginette-Reno.png' },
    { name: 'Queen Elizabeth II', description: 'Lifelong service', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Queen_Elizabeth_II_in_March_2015.jpg/440px-Queen_Elizabeth_II_in_March_2015.jpg' },
    { name: 'Samwise Gamgee', description: 'Loyalty incarnate', imageUrl: '/celebs/samwise.jpeg' }
  ],
  ESTJ: [
    { name: 'François Legault', description: 'Administrative, pragmatic executive style in governance', imageUrl: '/celebs/legault.jpg' },
    { name: 'Paul Desmarais', description: 'Organizational power and standards', imageUrl: '/celebs/paul.png' },
    { name: 'Judge Judy', description: 'Rules + authority', imageUrl: '/celebs/judge.JPG' }
  ],
  ESFJ: [
    { name: 'Celine Dion', description: 'Warm, service-oriented performer with strong audience attunement', imageUrl: '/celebs/celine.jpg' },
    { name: 'Pauline Marois', description: 'Consensus-building, community-oriented leadership profile', imageUrl: '/celebs/pauline.jpeg' },
    { name: 'Marie-Mai', description: 'Community focus and engagement', imageUrl: '/celebs/marie.jpeg' }
  ],
  ISTP: [
    { name: 'Jacques Villeneuve', description: 'Tactical pragmatism, calm under pressure', imageUrl: '/celebs/jacques.jpg' },
    { name: 'Clint Eastwood', description: 'Stoic competence', imageUrl: '/celebs/clint.webp' },
    { name: 'Geralt of Rivia', description: 'Tactical pragmatism', imageUrl: '/celebs/geralt.webp' }
  ],
  ISFP: [
    { name: 'Patrick Watson', description: 'Aesthetic, free-spirited, ethereal creativity', imageUrl: 'https://images.radio-canada.ca/v1/ici-tele/16x9/tout-le-monde-en-parle-patrick-watson.jpg' },
    { name: 'Ariane Moffatt', description: 'Aesthetic, free-spirited, diverse soundscapes', imageUrl: '/celebs/ariane.jpeg' },
    { name: 'Frida Kahlo', description: 'Emotion through creation', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg/440px-Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg' }
  ],
  ESTP: [
    { name: 'Laurent Duvernay-Tardif', description: 'Immediate impact, bold performance, risk-oriented', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Laurent_Duvernay-Tardif_2017.JPG' },
    { name: 'Madonna', description: 'Immediate impact, bold performance', imageUrl: '/celebs/madona.jpg' },
    { name: 'Han Solo', description: 'Improvisational action', imageUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/be/Han_Solo_depicted_in_promotional_image_for_Star_Wars_%281977%29.jpg/440px-Han_Solo_depicted_in_promotional_image_for_Star_Wars_%281977%29.jpg' }
  ],
  ESFP: [
    { name: 'Sugar Sammy', description: 'Present-focused, expressive, chaotic charm', imageUrl: '/celebs/sugar.jpeg' },
    { name: 'Beyoncé', description: 'Performance mastery', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Beyonc%C3%A9_at_The_Lion_King_European_Premiere_2019.png/440px-Beyonc%C3%A9_at_The_Lion_King_European_Premiere_2019.png' },
    { name: 'Jack Sparrow', description: 'Chaotic charm', imageUrl: '/celebs/jacksparrow.webp' }
  ],
};

// MBTI Group Colors (for Personalities Reveal slide)
export const MBTI_GROUP_COLORS = {
  NT: '#9b59b6', // Analysts - Purple
  NF: '#27ae60', // Diplomats - Green
  SJ: '#3498db', // Sentinels - Blue
  SP: '#f39c12', // Explorers - Yellow/Orange
} as const;

// Get the group code for an MBTI type (e.g., INTJ -> NT)
export function getMBTIGroup(type: MBTIType): keyof typeof MBTI_GROUP_COLORS {
  const n_s = type[1]; // N or S
  const t_f = type[2]; // T or F
  const j_p = type[3]; // J or P

  if (n_s === 'N' && t_f === 'T') return 'NT'; // Analysts
  if (n_s === 'N' && t_f === 'F') return 'NF'; // Diplomats
  if (n_s === 'S' && j_p === 'J') return 'SJ'; // Sentinels
  return 'SP'; // Explorers
}

// Get the color for an MBTI type based on its group
export function getGroupColor(type: MBTIType): string {
  return MBTI_GROUP_COLORS[getMBTIGroup(type)];
}

// Get group name in French
export function getGroupName(group: keyof typeof MBTI_GROUP_COLORS): string {
  const names = {
    NT: 'Analystes',
    NF: 'Diplomates',
    SJ: 'Sentinelles',
    SP: 'Explorateurs',
  };
  return names[group];
}

// Get group emoji
export function getGroupEmoji(group: keyof typeof MBTI_GROUP_COLORS): string {
  const emojis = {
    NT: '🟣',
    NF: '🟢',
    SJ: '🔵',
    SP: '🟡',
  };
  return emojis[group];
}

// MBTI type images (from /public/mbtis/)
export const MBTI_TYPE_IMAGES: Partial<Record<MBTIType, string>> = {
  ENTJ: '/mbtis/commander.png',
  ENTP: '/mbtis/innovator.png',
  INFP: '/mbtis/Médiatrice.png',
  ENFP: '/mbtis/Inspirateur.png',
  ISFJ: '/mbtis/Défenseure.png',
  ESTJ: '/mbtis/Directrice.png',
  ISFP: '/mbtis/adventurer.png',
  ESFP: '/mbtis/Amuseuse.png',
  ESFJ: '/mbtis/esfj.png',
};

// Get image for MBTI type (returns undefined if not available)
export function getMBTITypeImage(type: MBTIType): string | undefined {
  return MBTI_TYPE_IMAGES[type];
}

// Default avatar colors for participants without photos
export const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
];

export function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

// MBTI Compatibility - "Golden Pairs" and compatibility scores
// Based on cognitive function compatibility
export const MBTI_GOLDEN_PAIRS: Partial<Record<MBTIType, MBTIType[]>> = {
  INTJ: ['ENFP', 'ENTP'],
  INTP: ['ENTJ', 'ENFJ'],
  ENTJ: ['INTP', 'INFP'],
  ENTP: ['INFJ', 'INTJ'],
  INFJ: ['ENTP', 'ENFP'],
  INFP: ['ENTJ', 'ENFJ'],
  ENFJ: ['INFP', 'INTP'],
  ENFP: ['INTJ', 'INFJ'],
  ISTJ: ['ESFP', 'ESTP'],
  ISFJ: ['ESTP', 'ESFP'],
  ESTJ: ['ISFP', 'ISTP'],
  ESFJ: ['ISTP', 'ISFP'],
  ISTP: ['ESFJ', 'ESTJ'],
  ISFP: ['ESTJ', 'ESFJ'],
  ESTP: ['ISFJ', 'ISTJ'],
  ESFP: ['ISTJ', 'ISFJ'],
};

// Get opposite MBTI type (all 4 letters flipped)
export function getOppositeMBTI(type: MBTIType): MBTIType {
  const opposite = type.split('').map((char, i) => {
    if (i === 0) return char === 'I' ? 'E' : 'I';
    if (i === 1) return char === 'N' ? 'S' : 'N';
    if (i === 2) return char === 'T' ? 'F' : 'T';
    return char === 'J' ? 'P' : 'J';
  }).join('');
  return opposite as MBTIType;
}

// Check if two types are "golden pair" compatible
export function areGoldenPair(type1: MBTIType, type2: MBTIType): boolean {
  return MBTI_GOLDEN_PAIRS[type1]?.includes(type2) || false;
}

// Calculate compatibility score (0-100)
export function getCompatibilityScore(type1: MBTIType, type2: MBTIType): number {
  if (type1 === type2) return 85; // Same type - good understanding
  if (areGoldenPair(type1, type2)) return 95; // Golden pair
  if (getOppositeMBTI(type1) === type2) return 60; // Opposites - challenging but growth

  // Count matching dimensions
  let matches = 0;
  for (let i = 0; i < 4; i++) {
    if (type1[i] === type2[i]) matches++;
  }

  // 3 matches = very similar (80), 2 matches = compatible (70), 1 match = different (65)
  return 60 + matches * 8;
}

// Fun compatibility descriptions
export const COMPATIBILITY_VIBES: Record<string, { emoji: string; label: string; description: string }> = {
  golden: { emoji: '⭐', label: 'Dream Team', description: 'Une collaboration naturelle' },
  same: { emoji: '🪞', label: 'Jumeaux', description: 'Même longueur d\'onde' },
  opposite: { emoji: '🧩', label: 'Complémentaires', description: 'Forces opposées = équilibre' },
  similar: { emoji: '🤝', label: 'Bonne Entente', description: 'Beaucoup en commun' },
  different: { emoji: '🌈', label: 'Diversité', description: 'Perspectives différentes' },
};

export function getCompatibilityVibe(type1: MBTIType, type2: MBTIType): keyof typeof COMPATIBILITY_VIBES {
  if (areGoldenPair(type1, type2)) return 'golden';
  if (type1 === type2) return 'same';
  if (getOppositeMBTI(type1) === type2) return 'opposite';

  let matches = 0;
  for (let i = 0; i < 4; i++) {
    if (type1[i] === type2[i]) matches++;
  }
  return matches >= 3 ? 'similar' : 'different';
}

// Award metadata
export const AWARD_METADATA: Record<AwardType, { emoji: string; title: string; description: string }> = {
  most_extroverted: { emoji: '🎉', title: 'Le Plus Extraverti', description: 'Vu comme le plus sociable' },
  most_introverted: { emoji: '🧘', title: 'Le Plus Introverti', description: 'Vu comme le plus réservé' },
  most_intuitive: { emoji: '🔮', title: 'Le Plus Intuitif', description: 'Tête dans les nuages' },
  most_observant: { emoji: '👀', title: 'Le Plus Observateur', description: 'Les pieds sur terre' },
  most_rational: { emoji: '🧠', title: 'Le Plus Rationnel', description: 'Cerveau en acier' },
  most_feeling: { emoji: '❤️', title: 'Le Plus Sensible', description: 'Cœur sur la main' },
  most_organized: { emoji: '📋', title: 'Le Plus Organisé', description: 'Roi/Reine de la planification' },
  most_explorer: { emoji: '🧭', title: "L'Explorateur", description: 'Va où le vent le porte' },
  best_guesser: { emoji: '🎯', title: 'Le Meilleur Devin', description: 'A le mieux cerné les autres' },
  most_mysterious: { emoji: '🔮', title: 'Le Plus Mystérieux', description: 'Impossible à cerner' },
  most_obvious: { emoji: '📖', title: 'Livre Ouvert', description: 'Facile à lire' },
};

// Map category index + side to award type
function getExtremeAwardType(catIdx: number, side: 'left' | 'right'): AwardType {
  const mapping: Record<number, { left: AwardType; right: AwardType }> = {
    0: { left: 'most_introverted', right: 'most_extroverted' },
    1: { left: 'most_intuitive', right: 'most_observant' },
    2: { left: 'most_rational', right: 'most_feeling' },
    3: { left: 'most_organized', right: 'most_explorer' },
  };
  return mapping[catIdx][side];
}

interface AggregatedData {
  [participantId: string]: {
    [category: number]: { mean: number; count: number };
  };
}

// Calculate voter accuracy for Best Guesser award
function calculateVoterAccuracy(
  votes: Vote[],
  participants: Participant[]
): { voterId: string; accuracy: number }[] {
  const voterResults: Record<string, { correct: number; total: number }> = {};

  votes.forEach(vote => {
    const target = participants.find(p => p.id === vote.target_id);
    if (!target) return;

    if (!voterResults[vote.voter_id]) {
      voterResults[vote.voter_id] = { correct: 0, total: 0 };
    }

    const predictedSide = vote.position >= 50 ? 'right' : 'left';
    const actualSide = getActualSide(target.real_mbti, vote.category);

    voterResults[vote.voter_id].total++;
    if (predictedSide === actualSide) {
      voterResults[vote.voter_id].correct++;
    }
  });

  return Object.entries(voterResults)
    .map(([voterId, { correct, total }]) => ({
      voterId,
      accuracy: total > 0 ? correct / total : 0,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);
}

// Calculate perception gaps for Mysterious/Obvious awards
function calculatePerceptionGaps(
  participants: Participant[],
  aggregates: AggregatedData
): { participant: Participant; wrongTraits: number }[] {
  return participants
    .map(p => {
      let wrongTraits = 0;

      for (let catIdx = 0; catIdx < 4; catIdx++) {
        const agg = aggregates[p.id]?.[catIdx];
        if (!agg) continue;

        const predictedSide = agg.mean >= 50 ? 'right' : 'left';
        const actualSide = getActualSide(p.real_mbti, catIdx as CategoryIndex);

        if (predictedSide !== actualSide) {
          wrongTraits++;
        }
      }

      return { participant: p, wrongTraits };
    })
    .sort((a, b) => a.wrongTraits - b.wrongTraits);
}

// Calculate all awards
export function calculateAwards(
  votes: Vote[],
  participants: Participant[],
  aggregates: AggregatedData
): Award[] {
  const awards: Award[] = [];

  // Helper to get random participant as fallback
  const getRandomParticipant = () => participants[Math.floor(Math.random() * participants.length)];

  if (participants.length === 0) return awards;

  // 1. Personality Extremes (8 awards)
  for (let catIdx = 0; catIdx < 4; catIdx++) {
    let highest = { participant: null as Participant | null, mean: -1 };
    let lowest = { participant: null as Participant | null, mean: 101 };

    participants.forEach(p => {
      const agg = aggregates[p.id]?.[catIdx];
      if (agg) {
        if (agg.mean > highest.mean) {
          highest = { participant: p, mean: agg.mean };
        }
        if (agg.mean < lowest.mean) {
          lowest = { participant: p, mean: agg.mean };
        }
      }
    });

    // Left side extreme (low mean) - fallback to random if no data
    const leftType = getExtremeAwardType(catIdx, 'left');
    awards.push({
      type: leftType,
      ...AWARD_METADATA[leftType],
      winner: lowest.participant || getRandomParticipant(),
      value: lowest.participant ? Math.round(100 - lowest.mean) : 50,
    });

    // Right side extreme (high mean) - fallback to random if no data
    const rightType = getExtremeAwardType(catIdx, 'right');
    awards.push({
      type: rightType,
      ...AWARD_METADATA[rightType],
      winner: highest.participant || getRandomParticipant(),
      value: highest.participant ? Math.round(highest.mean) : 50,
    });
  }

  // 2. Best Guesser
  const voterScores = calculateVoterAccuracy(votes, participants);
  const bestGuesser = voterScores.length > 0 ? voterScores[0] : null;
  const bestGuesserWinner = bestGuesser
    ? participants.find(p => p.id === bestGuesser.voterId)
    : null;

  awards.push({
    type: 'best_guesser',
    ...AWARD_METADATA.best_guesser,
    winner: bestGuesserWinner || getRandomParticipant(),
    value: bestGuesser ? Math.round(bestGuesser.accuracy * 100) : 50,
  });

  // 3. Most Mysterious & Most Obvious
  const perceptionGaps = calculatePerceptionGaps(participants, aggregates);
  const mostObvious = perceptionGaps.length > 0 ? perceptionGaps[0] : null;
  const mostMysterious = perceptionGaps.length > 0 ? perceptionGaps[perceptionGaps.length - 1] : null;

  awards.push({
    type: 'most_obvious',
    ...AWARD_METADATA.most_obvious,
    winner: mostObvious?.participant || getRandomParticipant(),
    value: mostObvious ? 4 - mostObvious.wrongTraits : 2,
  });

  awards.push({
    type: 'most_mysterious',
    ...AWARD_METADATA.most_mysterious,
    winner: mostMysterious?.participant || getRandomParticipant(),
    value: mostMysterious?.wrongTraits ?? 2,
  });

  return awards;
}
