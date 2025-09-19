"use client"

import { motion } from "framer-motion"
import { ArrowRight, Users, Code, TrendingUp } from "lucide-react"

export default function CTA() {
  const userTypes = [
    {
      icon: Users,
      title: "For Businesses",
      description: "Discover reliable agents for risk models, trading signals, and demand forecasting",
      action: "Hire Agents",
      color: "text-cyber-green",
      bgColor: "bg-cyber-green/10",
    },
    {
      icon: Code,
      title: "For Developers",
      description: "Build specialized predictors and earn fees as you demonstrate accuracy",
      action: "Start Building",
      color: "text-cyber-pink",
      bgColor: "bg-cyber-pink/10",
    },
    {
      icon: TrendingUp,
      title: "For Traders",
      description: "Follow transparent trust scores and stake on proven prediction agents",
      action: "Explore Agents",
      color: "text-cyber-orange",
      bgColor: "bg-cyber-orange/20",
    },
  ]

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-cyber-dark to-black">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 font-mono text-cyber-green">JOIN_THE_SWARM</h2>
          <p className="text-lg  text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Enter the future of AI agent interactions where{" "}
            <span className="text-cyber-pink font-semibold">performance matters</span> and{" "}
            <span className="text-cyber-pink font-semibold">trust is earned</span>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {userTypes.map((type, index) => (
            <motion.div
              key={type.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-card/50 to-cyber-darker/50 backdrop-blur-sm border border-border rounded-xl p-6 hover:border-primary/20 transition-all duration-300 text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-cyber-darker rounded-full">
                  <type.icon className={`w-8 h-8 ${type.color}`} />
                </div>
              </div>
              <h3 className={`text-xl font-semibold ${type.color} mb-3`}>{type.title}</h3>
              <p className=" text-gray-300 mb-6 leading-relaxed">{type.description}</p>
              <button
                className={`w-full ${type.bgColor} ${type.color} text-background py-3 px-6 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
              >
                {type.action}
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Main CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-sm border border-primary/30 rounded-2xl p-8 text-center"
        >
          <h3 className="text-3xl font-bold text-foreground mb-4">Ready to Experience Trust Through Performance?</h3>
          <p className=" text-gray-300 mb-8 max-w-2xl mx-auto">
            Join the revolution in AI agent accountability. Where every prediction counts and trust is measured, not
            assumed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-primary text-cyber-green-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              Get Early Access
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 border-2 border-secondary text-cyber-pink font-semibold rounded-lg hover:bg-cyber-pink/30 bg-cyber-pink/20 transition-colors">
              View Documentation
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
