"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
}

export interface UseVoiceAssistantProps {
  apiKey?: string;
  voiceId?: string;
  onTranscript?: (transcript: string) => void;
  onResponse?: (response: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceAssistant({
  apiKey,
  voiceId = "21m00Tcm4TlvDq8ikWAM", // Default voice
  onTranscript,
  onResponse,
  onError,
}: UseVoiceAssistantProps = {}) {
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    transcript: "",
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const apiKeyRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const startTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store API key
  useEffect(() => {
    apiKeyRef.current = apiKey || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || null;
  }, [apiKey]);

  // Initialize speech recognition
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setState(prev => ({ ...prev, isListening: true, error: null }));
      };

      recognition.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const fullTranscript = finalTranscript || interimTranscript;
        setState(prev => ({ ...prev, transcript: fullTranscript }));
        
        if (finalTranscript && onTranscript) {
          onTranscript(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        // Don't show error for aborted recognition as it's often intentional
        if (event.error === 'aborted') {
          setState(prev => ({ ...prev, isListening: false }));
          return;
        }
        
        const errorMessage = `Speech recognition error: ${event.error}`;
        setState(prev => ({ 
          ...prev, 
          error: errorMessage, 
          isListening: false 
        }));
        if (onError) {
          onError(errorMessage);
        }
      };

      recognition.onend = () => {
        setState(prev => ({ ...prev, isListening: false }));
      };

      recognitionRef.current = recognition;
      isInitializedRef.current = true;
    } else {
      const errorMessage = "Speech recognition not supported in this browser";
      setState(prev => ({ ...prev, error: errorMessage }));
      if (onError) {
        onError(errorMessage);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
      }
    };
  }, [onTranscript, onError]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) return;
    
    // Clear any existing timeout
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
    }

    // If already listening, don't start again
    if (state.isListening) {
      return;
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setState(prev => ({ ...prev, transcript: "", error: null }));
      
      // Add small delay to prevent overlapping
      startTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current && !state.isListening) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Recognition may already be running
            console.log("Recognition start error (likely already running):", e);
          }
        }
      }, 100);
    } catch (error) {
      const errorMessage = "Microphone access denied";
      setState(prev => ({ ...prev, error: errorMessage }));
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [state.isListening, onError]);

  const stopListening = useCallback(() => {
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!apiKeyRef.current) {
      const errorMessage = "ElevenLabs API key not provided";
      setState(prev => ({ ...prev, error: errorMessage }));
      if (onError) {
        onError(errorMessage);
      }
      return;
    }

    try {
      setState(prev => ({ ...prev, isSpeaking: true, isProcessing: true }));

      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      // Call ElevenLabs API directly
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKeyRef.current,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setState(prev => ({ ...prev, isSpeaking: false }));
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        const errorMessage = "Audio playback error";
        setState(prev => ({ 
          ...prev, 
          isSpeaking: false, 
          error: errorMessage 
        }));
        if (onError) {
          onError(errorMessage);
        }
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };

      setState(prev => ({ ...prev, isProcessing: false }));
      await audio.play();
      
      if (onResponse) {
        onResponse(text);
      }
    } catch (error) {
      const errorMessage = `Text-to-speech error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setState(prev => ({ 
        ...prev, 
        isSpeaking: false, 
        isProcessing: false, 
        error: errorMessage 
      }));
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [voiceId, onResponse, onError]);

  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setState(prev => ({ ...prev, isSpeaking: false }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearError,
    isSupported: !!recognitionRef.current && !!apiKeyRef.current,
  };
}