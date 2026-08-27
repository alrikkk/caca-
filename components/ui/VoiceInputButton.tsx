"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  className,
  size = "sm",
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript) {
            onTranscript(transcript);
          }
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [onTranscript]);

  if (!isSupported) return null;

  const handleToggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Speech recognition start failed:", err);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleListening}
      className={cn(
        "border-hard flex items-center justify-center transition-all btn-tactile",
        size === "sm" ? "p-1.5 h-8 w-8" : "p-2 h-10 w-10",
        isListening
          ? "bg-red-500 text-white animate-pulse shadow-hard-sm"
          : "bg-white text-ink hover:bg-canvas-subtle",
        className
      )}
      title={isListening ? "Listening... click to stop" : "Click to speak"}
      aria-label={isListening ? "Stop voice input" : "Start voice input"}
    >
      {isListening ? (
        <MicOff className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      ) : (
        <Mic className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      )}
    </button>
  );
};
