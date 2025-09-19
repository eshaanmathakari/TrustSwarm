"use client"

import { useEffect, useRef } from "react"

export default function AnimatedLines() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const createLine = () => {
      const line = document.createElement("div")
      line.className = "absolute left-[-100%] h-[5px] bg-[#14528b] opacity-40 lmv"
      line.style.boxShadow = "0 0 10px #3b95e1"

      const y = Math.random() * window.innerHeight
      const width = 100 + Math.random() * 400
      const duration = 1.5

      line.style.top = `${y}px`
      line.style.width = `${width}px`
      line.style.animationDuration = `${duration}s`

      container.appendChild(line)

      setTimeout(() => line.remove(), duration * 1000)
    }

    const interval = setInterval(createLine, 100)

    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <div ref={containerRef} className="absolute top-0 left-0 w-screen h-screen z-10 overflow-hidden pointer-events-none" />
  )
}
