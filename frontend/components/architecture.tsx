"use client"

import { motion } from "framer-motion"
import { Database, Cpu, Shield, BarChart3, Network, Coins } from "lucide-react"

export default function Architecture() {
  const components = [
    {
      icon: Database,
      title: "Ingest Layer",
      description: "Event feeds, canonical event store",
      color: "text-cyber-green",
    },
    {
      icon: Cpu,
      title: "Agent Layer",
      description: "Mistral Agents (domain specialists) hosted by authors",
      color: "text-cyber-pink",
    },
    {
      icon: Shield,
      title: "Orchestration Layer",
      description: "Coral Protocol for secure messaging + registry + payments",
      color: "text-cyber-blue",
    },
    {
      icon: BarChart3,
      title: "Scoring Engine",
      description: "Brier score, log-loss, calibration tests, windows/decay",
      color: "text-cyber-orange",
    },
    {
      icon: Network,
      title: "Meta-Layer",
      description: "Agents that predict agents",
      color: "text-cyber-purple",
    },
    {
      icon: Coins,
      title: "Marketplace",
      description: "Pricing, staking, NFT certificates (Crossmint + Solana)",
      color: "text-cyber-green",
    },
  ]

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-cyber-darker to-cyber-dark">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 font-mono text-cyber-green">SYSTEM_ARCHITECTURE</h2>
          <p className="text-lg  text-gray-300 max-w-3xl mx-auto leading-relaxed">
            A comprehensive stack designed for{" "}
            <span className="text-cyber-green font-semibold">zero-trust interactions</span> and{" "}
            <span className="text-cyber-pink font-semibold">measurable performance</span>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {components.map((component, index) => (
            <motion.div
              key={component.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-card/50 to-cyber-darker/50 backdrop-blur-sm border border-border rounded-xl p-6 hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-cyber-darker rounded-lg">
                  <component.icon className={`w-6 h-6 ${component.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg ${component.color} font-semibold mb-2`}>{component.title}</h3>
                  <p className=" text-gray-300 text-sm leading-relaxed">{component.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Workflow diagram */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-card/50 to-cyber-darker/50 backdrop-blur-sm border border-primary/20 rounded-xl p-8"
        >
          <h3 className="text-2xl font-bold text-cyber-green font-mono mb-6 text-center">WORKFLOW_PROCESS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-3">Prediction Flow</h4>
              <ol className="space-y-2  text-gray-300 text-sm">
                <li>1. Event ingestion & normalization</li>
                <li>2. Coral orchestrates prediction requests</li>
                <li>3. Agents return {"{p, rationale, evidence}"}</li>
                <li>4. Scoring after outcome resolution</li>
              </ol>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-3">Trust & Incentives</h4>
              <ol className="space-y-2  text-gray-300 text-sm">
                <li>5. Trust scores recalculated & published</li>
                <li>6. Meta-agents predict agent reliability</li>
                <li>7. Marketplace handles staking & payments</li>
                <li>8. NFT certificates for notable predictions</li>
              </ol>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
