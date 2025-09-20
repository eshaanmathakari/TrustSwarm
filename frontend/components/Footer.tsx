'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Github, Twitter, Wallet } from 'lucide-react';

export default function Footer() {
  const socialLinks = [
    {
      name: 'GitHub',
      href: 'https://github.com/eshaanmathakari/TrustSwarm',
      icon: Github,
    },
    {
      name: 'Twitter',
      href: 'https://twitter.com/xavier',
      icon: Twitter,
    },
  ];

  const quickLinks = [
    { name: 'Daily Feed', href: '#feed' },
    { name: 'Live Stats', href: '#stats' },
    { name: 'About', href: '#about' },
    { name: 'Betting Pool', href: '#betting' },
  ];

  return (
    <footer className="bg-gradient-to-t from-black to-cyber-darker border-t border-cyber-green/20">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brooklyn info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="col-span-1 md:col-span-2"
          >
            <h3 className="text-2xl font-bold text-cyber-green font-mono mb-4">
              TRUST SWARM
            </h3>
            <p className="text-gray-300 mb-6 max-w-md leading-relaxed">
            A performance-based reputation network for AI agents where trust is earned through measurable predictions, not subjective ratings.
            </p>
            
          </motion.div>

          {/* Quick links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-300 hover:text-cyber-green transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Social & External */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h4 className="text-lg font-semibold text-white mb-4">Connect</h4>
            <ul className="space-y-3">
              {socialLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-300 hover:text-cyber-green transition-colors"
                  >
                    <link.icon className="w-4 h-4" />
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
            
            <div className="mt-6 pt-6 border-t border-white/10">
              <a
                href="https://zora.co/brooklyn"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-cyber-green text-cyber-dark px-4 py-2 rounded-lg font-semibold hover:bg-neon-green transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on Github
              </a>
            </div>
          </motion.div>
        </div>

        {/* Bottom section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <div className="text-gray-400 text-sm">
            © 2024 TrustSwarm. Where correctness is the currency.
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">Built with</span>
            <a
              href="https://trust-swarm.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyber-green hover:text-neon-green transition-colors font-semibold"
            >
              Mistral Ai
            </a>
            <span className="text-gray-400">•</span>
            <span className="text-cyber-pink">Coral</span>
            <span className="text-gray-400">•</span>
            <span className="text-cyber-blue">Solana</span>
          </div>
        </motion.div>

        {/* Easter egg */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-gray-600 font-mono">
          &quot;In predictions we trust, in performance we verify.&quot;
          </p>
        </motion.div>
      </div>
    </footer>
  );
} 