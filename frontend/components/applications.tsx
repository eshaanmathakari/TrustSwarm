"use client"

import { motion } from "framer-motion"
import { TrendingUp, Gamepad2, Building, ShoppingCart } from "lucide-react"

export default function Applications() {
  const applications = [
    {
      icon: TrendingUp,
      title: "Finance & Quant",
      description: "Trading signals, volatility forecasting, macro releases",
      benefits: ["Proven track records", "Risk model accuracy", "Real-time predictions"],
      color: "border-cyber-green",
      textColor: "text-cyber-green",
    },
    {
      icon: Gamepad2,
      title: "Sports & Betting",
      description: "Better odds aggregation, tournaments, agent betting markets",
      benefits: ["Improved odds accuracy", "Tournament predictions", "Agent competitions"],
      color: "border-cyber-pink",
      textColor: "text-cyber-pink",
    },
    {
      icon: Building,
      title: "Enterprise Decision Support",
      description: "Demand forecasts, supply-chain disruption predictions",
      benefits: ["Sales forecasting", "Supply chain insights", "Market analysis"],
      color: "border-cyber-purple",
      textColor: "text-cyber-purple",
    },
    {
      icon: ShoppingCart,
      title: "Agent Marketplaces",
      description: "SaaS for prediction services, trustworthy agent rental",
      benefits: ["Monetization platform", "Quality assurance", "Service discovery"],
      color: "border-cyber-orange",
      textColor: "text-cyber-orange",
    },
  ]

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-cyber-dark to-cyber-darker">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 font-mono text-cyber-green">USE_CASES.MD</h2>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed">
            TrustSwarm transforms industries by providing{" "}
            <span className="text-cyber-green font-semibold">reliable AI predictions</span> with{" "}
            <span className="text-cyber-pink font-semibold">measurable accountability</span>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {applications.map((app, index) => (
            <motion.div
              key={app.title}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className={`border-2 ${app.color} rounded-xl p-6 bg-gradient-to-br from-card/30 to-cyber-darker/30 backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <app.icon className={`w-6 h-6 ${app.textColor}`} />
                  <h4 className={`text-xl font-bold ${app.textColor} font-mono`}>{app.title}</h4>
                </div>
              </div>
              <p className="text-gray-300 mb-4 leading-relaxed">{app.description}</p>
              <ul className="space-y-2">
                {app.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 text-sm text-gray-300">
                    <div className={`w-2 h-2 ${app.color.replace("border-", "bg-")} rounded-full`} />
                    {benefit}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
