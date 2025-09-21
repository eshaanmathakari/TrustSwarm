"use client";

import { X, Send, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoiceStateChange?: (isActive: boolean) => void;
}

export function ChatModal({ open, onOpenChange, onVoiceStateChange }: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  
  const {
    isListening,
    isProcessing,
    isSpeaking,
    transcript,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearError,
    isSupported,
  } = useVoiceAssistant({
    onTranscript: (finalTranscript) => {
      if (finalTranscript.trim()) {
        handleSendMessage(finalTranscript);
      }
    },
    onError: (errorMessage) => {
      console.error("Voice assistant error:", errorMessage);
    },
  });

  // Clean up when modal closes
  useEffect(() => {
    if (!open) {
      stopListening();
      stopSpeaking();
    }
  }, [open, stopListening, stopSpeaking]);

  // Notify parent of voice activity state
  useEffect(() => {
    if (onVoiceStateChange) {
      onVoiceStateChange(isListening || isSpeaking || isProcessing);
    }
  }, [isListening, isSpeaking, isProcessing, onVoiceStateChange]);

  const handleSendMessage = (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I heard you say: "${content.trim()}". This is a demo response that will be spoken aloud.`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      speak(assistantMessage.content);
    }, 1000);
  };

  const handleSend = () => {
    if (input.trim()) {
      handleSendMessage(input);
      setInput("");
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "max-w-2xl h-[80vh] flex flex-col p-0",
          "bg-background/80 backdrop-blur-3xl backdrop-saturate-150",
          "border border-border/30 shadow-2xl"
        )}
        showCloseButton={false}
      >
        <DialogHeader className="px-6 py-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">AI Assistant</DialogTitle>
              <DialogDescription className="sr-only">
                AI-powered chat assistant with speech-to-text and text-to-speech capabilities
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className={cn(
                "relative mb-4",
                isListening && "animate-pulse"
              )}>
                <Mic className={cn(
                  "w-12 h-12",
                  isListening ? "text-blue-500" : "opacity-50"
                )} />
                {isListening && (
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping" />
                )}
              </div>
              <p className="text-center mb-2">
                {isListening 
                  ? "Listening... speak now" 
                  : "Start a conversation by clicking the microphone to speak, or by typing below."}
              </p>
              {transcript && (
                <p className="text-sm text-blue-400 italic text-center">
                  "{transcript}"
                </p>
              )}
              {error && (
                <p className="text-sm text-red-400 text-center mt-2">
                  {error}
                </p>
              )}
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-4 py-2 relative",
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-muted text-foreground"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <p className="text-sm flex-1">{message.content}</p>
                    {message.role === "assistant" && isSpeaking && (
                      <Volume2 className="w-4 h-4 text-blue-500 animate-pulse flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border/50 p-4">
          {/* Real-time transcript display */}
          {(isListening && transcript) && (
            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 italic">
                "{transcript}"
              </p>
            </div>
          )}
          
          {/* Error display */}
          {error && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearError}
                  className="h-auto p-1 text-red-700 dark:text-red-300"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? "Listening..." : "Type a message..."}
                disabled={isListening}
                className={cn(
                  "w-full px-4 py-2 pr-12",
                  "bg-background border border-input rounded-full",
                  "focus:outline-none focus:ring-2 focus:ring-blue-600",
                  "text-sm",
                  isListening && "opacity-50 cursor-not-allowed"
                )}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSend}
                disabled={!input.trim() || isListening}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Voice control buttons */}
            <div className="flex gap-2">
              {isSupported && (
                <Button
                  size="icon"
                  variant={isListening ? "destructive" : "default"}
                  onClick={toggleListening}
                  disabled={isProcessing}
                  className={cn(
                    "rounded-full h-10 w-10",
                    isListening 
                      ? "bg-red-600 hover:bg-red-700" 
                      : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {isListening ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
              )}
              
              {isSpeaking && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={stopSpeaking}
                  className="rounded-full h-10 w-10"
                >
                  <VolumeX className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center justify-center mt-2 min-h-[20px]">
            {isListening && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                <span>Listening...</span>
              </div>
            )}
            {isProcessing && !isListening && (
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse" />
                <span>Processing...</span>
              </div>
            )}
            {isSpeaking && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span>Speaking...</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}