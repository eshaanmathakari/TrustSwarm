"use client";

import { Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Metadata } from "next";
import { V0Provider } from "@/lib/v0-context";
import localFont from "next/font/local";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import Widget from "@/components/dashboard/widget";
import Notifications from "@/components/dashboard/notifications";
import { SecurityMetrics } from "@/components/dashboard/security-metrics";
import { FloatingActionButton } from "@/components/elevenlabs/floating-action-button";
import { ChatModal } from "@/components/elevenlabs/chat-modal";
import { useState, useEffect } from "react";

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

const rebelGrotesk = localFont({
  src: "../public/fonts/Rebels-Fett.woff2",
  variable: "--font-rebels",
  display: "swap",
});

const isV0 = process.env["VERCEL_URL"]?.includes("vusercontent.net") ?? false;

// export const metadata: Metadata = {
//   title: {
//     template: "%s – M.O.N.K.Y OS",
//     default: "M.O.N.K.Y OS",
//   },
//   description:
//     "The ultimate OS for rebels. Making the web for brave individuals.",
//   generator: 'v0.app'
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="preload"
          href="/fonts/Rebels-Fett.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${rebelGrotesk.variable} ${robotoMono.variable} antialiased`}
      >
        <V0Provider isV0={isV0}>
          <SidebarProvider>
            {/* Mobile Header - only visible on mobile */}
            <MobileHeader />

            {/* Desktop Layout */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-gap lg:px-sides">
              <div className="hidden lg:block col-span-2 top-0 relative">
                <DashboardSidebar />
              </div>
              <div className="col-span-1 lg:col-span-7">{children}</div>
              <div className="col-span-3 hidden lg:block">
                <div className="space-y-gap py-sides min-h-screen max-h-screen sticky top-0 overflow-clip">
                  <Widget />
                  <Notifications />
                  <SecurityMetrics />
                </div>
              </div>
            </div>
          </SidebarProvider>

          {/* ElevenLabs Integration - Outside layout constraints */}
          {!isChatOpen && (
            <FloatingActionButton 
              onClick={() => setIsChatOpen(true)} 
              isActive={isVoiceActive}
            />
          )}
          <ChatModal 
            open={isChatOpen} 
            onOpenChange={setIsChatOpen}
            onVoiceStateChange={setIsVoiceActive}
          />
        </V0Provider>
      </body>
    </html>
  );
}
