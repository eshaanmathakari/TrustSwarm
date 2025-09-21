'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, Loader2, AlertCircle } from 'lucide-react';

interface ConversationState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  hasPermission: boolean;
  conversationStarted: boolean;
  userInput: string;
  queenBeeResponse: string;
  audioUrl: string | null;
  timeoutId: NodeJS.Timeout | null;
  timeRemaining: number;
}

export default function QueenBee() {
  const [state, setState] = useState<ConversationState>({
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    hasPermission: false,
    conversationStarted: false,
    userInput: '',
    queenBeeResponse: '',
    audioUrl: null,
    timeoutId: null,
    timeRemaining: 60
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.timeoutId) clearTimeout(state.timeoutId);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [state.timeoutId]);

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      setState(prev => ({ ...prev, hasPermission: true }));
      
      // Start the conversation flow
      startQueenBeeConversation();
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setState(prev => ({ ...prev, hasPermission: false }));
    }
  };

  const startQueenBeeConversation = async () => {
    setState(prev => ({ ...prev, conversationStarted: true }));
    
    // Generate Queen Bee's initial greeting
    const greeting = "Hi, I'm your queen bee, ask me about trust scores on different events";
    
    // Simulate text-to-speech generation
    setState(prev => ({ ...prev, isProcessing: true }));
    
    try {
      // Call API to generate voice response
      const response = await fetch('/api/queen-bee/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: greeting })
      });
      
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setState(prev => ({ 
          ...prev, 
          queenBeeResponse: greeting,
          audioUrl,
          isProcessing: false,
          isSpeaking: true
        }));
        
        // Play the audio
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
        }
        
        // Start listening for user input after greeting
        setTimeout(() => {
          setState(prev => ({ ...prev, isSpeaking: false }));
          startListening();
        }, 3000);
      }
    } catch (error) {
      console.error('Error generating voice:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const startListening = () => {
    if (!streamRef.current) return;
    
    setState(prev => ({ ...prev, isListening: true, timeRemaining: 60 }));
    
    // Start countdown timer
    intervalRef.current = setInterval(() => {
      setState(prev => {
        if (prev.timeRemaining <= 1) {
          stopListening();
          return { ...prev, timeRemaining: 0 };
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);
    
    // Start recording
    const mediaRecorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = mediaRecorder;
    
    const chunks: BlobPart[] = [];
    
    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(chunks, { type: 'audio/wav' });
      await processUserInput(audioBlob);
    };
    
    mediaRecorder.start();
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && state.isListening) {
      mediaRecorderRef.current.stop();
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setState(prev => ({ ...prev, isListening: false }));
  };

  const processUserInput = async (audioBlob: Blob) => {
    setState(prev => ({ ...prev, isProcessing: true }));
    
    try {
      // Convert speech to text
      const formData = new FormData();
      formData.append('audio', audioBlob, 'user-input.wav');
      
      const response = await fetch('/api/queen-bee/process-input', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        const userText = result.transcript;
        
        setState(prev => ({ ...prev, userInput: userText }));
        
        // Check if user mentioned an event in the database
        const eventResponse = await fetch('/api/queen-bee/find-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: userText })
        });
        
        if (eventResponse.ok) {
          const eventData = await eventResponse.json();
          
          if (eventData.found) {
            // Generate Queen Bee response about the event
            const queenBeeText = `I found information about "${eventData.event.title}". ${eventData.event.description || 'This is an interesting prediction event.'} The current trust score for this event is ${eventData.event.trust_score || 'not available'}. Would you like to know more details?`;
            
            // Generate voice response
            const voiceResponse = await fetch('/api/queen-bee/speak', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: queenBeeText })
            });
            
            if (voiceResponse.ok) {
              const audioBlob = await voiceResponse.blob();
              const audioUrl = URL.createObjectURL(audioBlob);
              
              setState(prev => ({ 
                ...prev, 
                queenBeeResponse: queenBeeText,
                audioUrl,
                isProcessing: false,
                isSpeaking: true
              }));
              
              // Play the response
              if (audioRef.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.play();
              }
              
              // Continue conversation
              setTimeout(() => {
                setState(prev => ({ ...prev, isSpeaking: false }));
                startListening();
              }, 5000);
            }
          } else {
            // No event found
            const noEventText = "I couldn't find that event in our database. Could you try asking about a different event or be more specific?";
            
            const voiceResponse = await fetch('/api/queen-bee/speak', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: noEventText })
            });
            
            if (voiceResponse.ok) {
              const audioBlob = await voiceResponse.blob();
              const audioUrl = URL.createObjectURL(audioBlob);
              
              setState(prev => ({ 
                ...prev, 
                queenBeeResponse: noEventText,
                audioUrl,
                isProcessing: false,
                isSpeaking: true
              }));
              
              if (audioRef.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.play();
              }
              
              setTimeout(() => {
                setState(prev => ({ ...prev, isSpeaking: false }));
                startListening();
              }, 4000);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing user input:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const resetConversation = () => {
    if (state.timeoutId) clearTimeout(state.timeoutId);
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    setState({
      isListening: false,
      isProcessing: false,
      isSpeaking: false,
      hasPermission: false,
      conversationStarted: false,
      userInput: '',
      queenBeeResponse: '',
      audioUrl: null,
      timeoutId: null,
      timeRemaining: 60
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyber-dark via-cyber-darker to-cyber-dark flex flex-col items-center justify-center p-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl md:text-6xl font-bold text-cyber-green mb-4 font-mono">
          Talk to Queen Bee
        </h1>
        <p className="text-cyber-blue text-lg md:text-xl">(Beta)</p>
      </motion.div>

      {/* Main Interface */}
      <div className="flex flex-col items-center space-y-8 max-w-2xl w-full">
        
        {/* Microphone Circle */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          <div className="w-48 h-48 rounded-full border-4 border-cyber-green flex items-center justify-center bg-cyber-dark/50 backdrop-blur-sm">
            <AnimatePresence mode="wait">
              {!state.hasPermission && !state.conversationStarted && (
                <motion.button
                  key="mic-button"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={requestMicrophonePermission}
                  className="w-20 h-20 rounded-full bg-cyber-green flex items-center justify-center text-cyber-dark hover:bg-neon-green transition-colors"
                >
                  <Mic className="w-10 h-10" />
                </motion.button>
              )}
              
              {state.isListening && (
                <motion.div
                  key="listening"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-20 h-20 rounded-full bg-cyber-pink flex items-center justify-center text-cyber-dark animate-pulse"
                >
                  <Mic className="w-10 h-10" />
                </motion.div>
              )}
              
              {state.isProcessing && (
                <motion.div
                  key="processing"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-20 h-20 rounded-full bg-cyber-blue flex items-center justify-center text-cyber-dark"
                >
                  <Loader2 className="w-10 h-10 animate-spin" />
                </motion.div>
              )}
              
              {state.isSpeaking && (
                <motion.div
                  key="speaking"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-20 h-20 rounded-full bg-cyber-green flex items-center justify-center text-cyber-dark"
                >
                  <Volume2 className="w-10 h-10" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Timer */}
          {state.isListening && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-cyber-pink font-mono text-lg"
            >
              {state.timeRemaining}s
            </motion.div>
          )}
        </motion.div>

        {/* Status Messages */}
        <AnimatePresence>
          {!state.hasPermission && !state.conversationStarted && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-cyber-blue text-center"
            >
              Click the microphone to start talking to Queen Bee
            </motion.p>
          )}
          
          {state.conversationStarted && !state.isListening && !state.isProcessing && !state.isSpeaking && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-cyber-green text-center"
            >
              Queen Bee is ready to listen. Ask about any event!
            </motion.p>
          )}
        </AnimatePresence>

        {/* Conversation Display */}
        {(state.userInput || state.queenBeeResponse) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-4"
          >
            {state.userInput && (
              <div className="bg-cyber-blue/20 p-4 rounded-lg border border-cyber-blue/30">
                <p className="text-cyber-blue font-semibold mb-2">You said:</p>
                <p className="text-white">{state.userInput}</p>
              </div>
            )}
            
            {state.queenBeeResponse && (
              <div className="bg-cyber-green/20 p-4 rounded-lg border border-cyber-green/30">
                <p className="text-cyber-green font-semibold mb-2">Queen Bee:</p>
                <p className="text-white">{state.queenBeeResponse}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Reset Button */}
        {state.conversationStarted && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={resetConversation}
            className="px-6 py-2 bg-cyber-pink/20 border border-cyber-pink text-cyber-pink rounded-lg hover:bg-cyber-pink/30 transition-colors"
          >
            Start New Conversation
          </motion.button>
        )}
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onEnded={() => setState(prev => ({ ...prev, isSpeaking: false }))}
        className="hidden"
      />
    </div>
  );
}
