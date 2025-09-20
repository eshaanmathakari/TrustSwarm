'use client';

import { motion } from 'framer-motion';
import { Bot, Palette, TrendingUp, Target, Code, ExternalLink } from 'lucide-react';

export default function About() {

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-cyber-darker to-cyber-dark">
      <div className="max-w-7xl mx-auto">
        {/* Technical details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-cyber-dark/50 to-cyber-darker/50 backdrop-blur-sm border border-cyber-green/20 rounded-xl p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <Code className="w-6 h-6 text-cyber-green" />
            <h3 className="text-2xl font-bold text-cyber-green font-mono">
              TECHNICAL_STACK
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">AI & Machine Learning</h4>
              <ul className="space-y-2 text-gray-300">
                <li>• Mastra for AI orchestration</li>
                <li>• Langchain for LLM workflows</li>
                <li>• Groq for high-performance inference</li>
                <li>• Mistral AI for advanced language models</li>
                <li>• Gemini for multimodal AI capabilities</li>
                <li>• ElevenLabs for text-to-speech</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Infrastructure & APIs</h4>
              <ul className="space-y-2 text-gray-300">
                <li>• Next.js with TypeScript</li>
                <li>• Express.js for backend services</li>
                <li>• Docker for containerization</li>
                <li>• Real-time AI agent communication</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex flex-wrap gap-4">
              <a
                href="https://github.com/brooklyn-project"
                className="inline-flex items-center gap-2 text-cyber-green hover:text-neon-green transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on GitHub
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
} 