'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Home() {
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [roomCode, setRoomCode] = useState('');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      {/* Decorative floating elements */}
      <div className="fixed top-10 left-10 text-4xl opacity-30 animate-float select-none">❄️</div>
      <div className="fixed top-24 right-16 text-3xl opacity-25 animate-float select-none" style={{ animationDelay: '1s' }}>✨</div>
      <div className="fixed bottom-28 left-16 text-3xl opacity-25 animate-float select-none" style={{ animationDelay: '0.5s' }}>🌲</div>
      <div className="fixed bottom-16 right-12 text-4xl opacity-30 animate-float select-none" style={{ animationDelay: '1.5s' }}>❄️</div>
      <div className="fixed top-1/3 left-8 text-2xl opacity-20 animate-drift select-none" style={{ animationDelay: '2s' }}>✨</div>
      <div className="fixed top-1/2 right-8 text-2xl opacity-20 animate-drift select-none" style={{ animationDelay: '3s' }}>🌲</div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center max-w-md w-full"
      >
        {/* Main Glass Card */}
        <motion.div 
          className="glass p-8 md:p-10"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {/* Logo/Title */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 150 }}
            className="mb-6"
          >
            <h1 
              className="text-5xl md:text-6xl font-bold mb-2 tracking-wide"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              <span className="text-gradient">MBTI</span>
            </h1>
            <h2 
              className="text-2xl md:text-3xl text-[var(--foreground-muted)] tracking-widest uppercase"
              style={{ fontFamily: "var(--font-cormorant), serif", fontWeight: 500 }}
            >
              Party Game
            </h2>
          </motion.div>

          {/* Decorative line */}
          <motion.div 
            className="w-24 h-px mx-auto mb-6 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          />

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-[var(--muted-foreground)] mb-10 text-lg italic"
          >
            Devinez les personnalités de vos amis
          </motion.p>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="space-y-4"
          >
            {!showJoinInput ? (
              <>
                {/* Join Game Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowJoinInput(true)}
                  className="btn btn-primary w-full text-lg py-4"
                >
                  <span className="mr-2">❄️</span> Rejoindre une partie
                </motion.button>

                {/* Create Game Button */}
                <Link href="/admin" className="block">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn btn-secondary w-full text-lg py-4"
                  >
                    <span className="mr-2">✨</span> Créer une partie
                  </motion.button>
                </Link>

                {/* View Live Board */}
                <Link href="/board" className="block">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn btn-ghost w-full"
                  >
                    <span className="mr-2">🌲</span> Écran Live
                  </motion.button>
                </Link>
              </>
            ) : (
              <>
                {/* Room Code Input */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="CODE DE LA PARTIE"
                    className="input text-center text-2xl tracking-[0.3em] uppercase font-semibold"
                    maxLength={6}
                    autoFocus
                  />
                  
                  <Link 
                    href={roomCode.length >= 4 ? `/join?code=${roomCode}` : '#'}
                    className="block"
                  >
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn btn-primary w-full text-lg py-4"
                      disabled={roomCode.length < 4}
                      style={{ opacity: roomCode.length < 4 ? 0.5 : 1 }}
                    >
                      Rejoindre <span className="ml-1">→</span>
                    </motion.button>
                  </Link>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowJoinInput(false);
                      setRoomCode('');
                    }}
                    className="btn btn-ghost w-full"
                  >
                    <span className="mr-1">←</span> Retour
                  </motion.button>
                </motion.div>
              </>
            )}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="fixed bottom-6 text-center text-sm text-[var(--muted-foreground)] flex items-center gap-2"
      >
        <span className="opacity-60">❄️</span>
        <span className="tracking-wider">Joyeux Noël 2024</span>
        <span className="opacity-60">❄️</span>
      </motion.footer>
    </main>
  );
}
