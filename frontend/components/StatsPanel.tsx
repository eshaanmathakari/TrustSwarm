'use client';

import { motion } from 'framer-motion';
import { Wallet, Image, Calendar, TrendingUp, Target, Percent } from 'lucide-react';
import { Brain, Shield, Coins, Network, Trophy } from "lucide-react"


export default function StatsPanel() {
  const statItems = [
    {
      icon: Target,
      label: 'Agents build credibility through consistent, accurate probabilistic forecasts on real events.',
      value: `Prediction-Based Trust`,
      color: 'text-cyber-green',
      bgColor: 'bg-cyber-green/10',
    },
    {
      icon: Network,
      label: 'Agents predict other agents performance, creating a second-order trust graph.',
      value: 'Meta-Prediction Layer',
      color: 'text-cyber-purple',
      bgColor: 'bg-cyber-purple/10',
    },
    {
      icon: Shield,
      label: 'Coral manages secure interactions and payments without assuming trust.',
      value: 'Zero-Trust Orchestration',
      color: 'text-cyber-blue',
      bgColor: 'bg-cyber-blue/10',
    },
    {
      icon: Trophy,
      label: 'NFT certificates of key prediction achievements for auditability and provenance.',
      value: 'Immutable Credentials',
      color: 'text-cyber-orange',
      bgColor: 'bg-cyber-orange/10',
    },
    {
      icon: Brain,
      label: 'Domain-specialist AI agents hosted by authors, powered by cutting-edge models.',
      value: 'Mistral Agents',
      color: 'text-cyber-pink',
      bgColor: 'bg-cyber-pink/10',
    },
    {
      icon: Coins,
      label: 'Stake tokens, buy agent services, or mint NFT certificates with clear monetization.',
      value: 'Marketplace Incentives',
      color: 'text-neon-green',
      bgColor: 'bg-neon-green/10',
    },
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-cyber-darker to-cyber-dark">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 font-mono text-cyber-green">
            CORE_FEATURES.EXE
          </h2>
          <p className="text-lg text-gray-300">
            Revolutionary architecture for trustworthy AI agent interactions
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className={`${item.bgColor} backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-white/5`}>
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-lg ${item.bgColor} mr-3`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <div className="">
                    <div className={`text-xl font-bold font-mono ${item.color}`}>
                      {item.value}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {item.label}
                  </h3>
                </div>

                {/* Animated border */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className={`absolute inset-0 rounded-xl animate-pulse bg-gradient-to-r from-transparent via-white/5 to-transparent`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Progress bar for goal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-12 p-6 bg-gradient-to-r from-cyber-dark to-cyber-darker border border-cyber-green/20 rounded-xl"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-cyber-green">Journey Progress</h3>
            <span className="text-cyber-green font-mono">
              $12.8 / $1000
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${(70/ 1000) * 100}%` }}
              transition={{ duration: 1.5, delay: 0.8 }}
              viewport={{ once: true }}
              className="h-full bg-gradient-to-r from-cyber-green to-neon-green rounded-full relative"
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </motion.div>
          </div>
          <div className="flex justify-between text-sm text-gray-400 mt-2">
            <span>Day 5</span>
            <span>1000 days remaining</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
} 