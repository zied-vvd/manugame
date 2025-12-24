import { CategoryIndex, MBTIType } from './types';

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

// Default avatar colors for participants without photos
export const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
];

export function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}
