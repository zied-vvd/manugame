'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ALL_MBTI_TYPES, MBTI_CELEBRITIES, MBTI_DESCRIPTIONS } from '@/lib/constants';

export default function CelebritiesPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-6 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <button
            onClick={() => router.push('/admin')}
            className="btn btn-ghost mb-4"
          >
            ← Retour Admin
          </button>
          <h1 
            className="text-5xl font-bold text-gradient mb-4"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Répertoire des Célébrités
          </h1>
          <p className="text-[var(--muted-foreground)] max-w-2xl mx-auto">
            Voici les célébrités et personnages associés à chaque type MBTI dans le jeu.
          </p>
        </motion.div>

        {/* MBTI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ALL_MBTI_TYPES.map((type, index) => (
            <motion.div
              key={type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="glass p-6 flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-[var(--secondary)]">{type}</h2>
                <span className="text-xs font-medium px-2 py-1 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
                  {MBTI_DESCRIPTIONS[type]}
                </span>
              </div>

              <div className="space-y-4 flex-1">
                {MBTI_CELEBRITIES[type].map((celeb) => (
                  <div key={celeb.name} className="flex gap-3 group">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-[var(--glass-border)] group-hover:border-[var(--secondary)] transition-colors">
                      <img
                        src={celeb.imageUrl}
                        alt={celeb.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h3 className="text-sm font-semibold leading-tight">{celeb.name}</h3>
                      <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-tight mt-1">
                        {celeb.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}


