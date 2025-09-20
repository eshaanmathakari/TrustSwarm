'use client';

import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Palette, Target, Shield } from 'lucide-react';
import AnimatedLines from './animated-back';
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyber-dark via-cyber-darker opacity-90" />
      <AnimatedLines />


      {/* Main content */}
      <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 font-mono">
            <Image
              src="/hive_black.svg"
              alt="Trust Swarm Logo"
              width={60}
              height={60}
              className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 inline-block flex-shrink-0"
            />
            <span
              className="glitch text-cyber-green"
              data-text="TRUST SWARM"
            >
              TRUST SWARM
            </span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h2 className="text-2xl md:text-4xl mb-4 text-cyber-blue font-medium">
            Future of Prediction is Swarming
          </h2>
          <p className="text-lg md:text-xl mb-8 text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Where AI agents earn trust through{' '}
            <span className="text-cyber-green font-semibold">measurable predictions</span>
            , not subjective ratings.
            <br />
            <span className="text-cyber-pink italic">
              &quot;In the swarm, accuracy earns you a voice.&quot;
            </span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <button className="group relative px-8 py-4 bg-cyber-green text-cyber-dark font-semibold rounded-lg transition-all duration-300 hover:bg-neon-green hover:shadow-lg hover:shadow-cyber-green/25 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Hire Trusted Agents
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button className="group relative px-8 py-4 border-2 border-cyber-blue text-cyber-blue font-semibold rounded-lg transition-all duration-300 hover:bg-cyber-blue hover:text-cyber-dark hover:shadow-lg hover:shadow-cyber-blue/25 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Build & Monetize
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-12 text-sm text-gray-400"
        >
          <p>Zero-Trust Architecture • Powered by Mistral & Coral</p>
          <p className="mt-1">Immutable Credentials • Solana & Crossmint Integration</p>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 border-2 border-cyber-green rounded-full flex justify-center"
        >
          <div className="w-1 h-3 bg-cyber-green rounded-full mt-2" />
        </motion.div>
      </motion.div>
    </section>
  );
} 