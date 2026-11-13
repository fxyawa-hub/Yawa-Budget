import React, { useState, useRef, useEffect } from "react";
import { Send, Mic } from "lucide-react";
import { Button } from "../common/Button";

interface ChatInputProps {
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  onMicrophoneError?: (errorText: string | null) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  onMicrophoneError,
}) => {
  const [prompt, setPrompt] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const currentTranscriptRef = useRef<string>("");

  // Check browser speech support
  const isSpeechSupported =
    typeof window !== "undefined" &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const sampleQuestions = [
    "How much have I spent on food?",
    "Am I close to any limit?",
    "Where can I cut ₦10,000?",
  ];

  // Stop recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const toggleListening = () => {
    if (isLoading || !isSpeechSupported) return;

    // If currently listening, tap again to stop and send
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      return;
    }

    onMicrophoneError?.(null);

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    try {
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      // Rule 1: Listen ONCE using webkitSpeechRecognition
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-NG";

      currentTranscriptRef.current = "";

      recognition.onstart = () => {
        setIsListening(true);
      };

      // Rule 2: Text field fills with live words as user speaks
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        currentTranscriptRef.current = transcript;
        setPrompt(transcript);
      };

      recognition.onerror = (event: any) => {
        // Fall back to "en-US" if "en-NG" is not supported
        if (event.error === "language-not-supported" && recognition.lang !== "en-US") {
          recognition.lang = "en-US";
          try {
            recognition.start();
            return;
          } catch {}
        }

        // Rule 3: Microphone blocked handling
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          onMicrophoneError?.("Microphone is blocked. Allow it in the address bar and try again.");
        }

        setIsListening(false);
      };

      // Rule 2: When user stops speaking (or taps button again), send automatically
      recognition.onend = () => {
        setIsListening(false);
        const finalQuestion = currentTranscriptRef.current.trim();
        if (finalQuestion) {
          setPrompt("");
          currentTranscriptRef.current = "";
          onSendMessage(finalQuestion);
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      setIsListening(false);
    }

    const question = prompt.trim();
    setPrompt("");
    currentTranscriptRef.current = "";
    await onSendMessage(question);
  };

  const handleSelectSample = async (q: string) => {
    if (isLoading || isListening) return;
    await onSendMessage(q);
  };

  return (
    <div className="space-y-3">
      {/* Sample Question Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0">
          Sample queries:
        </span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading || isListening}
            onClick={() => handleSelectSample(q)}
            className="text-[11px] font-mono px-2 py-0.5 rounded-xs bg-[var(--bg-base)] hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] shrink-0 transition-colors disabled:opacity-50 cursor-pointer"
          >
            &ldquo;{q}&rdquo;
          </button>
        ))}
      </div>

      {/* Input Field Form */}
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2">
          <input
            id="ask-yawabudget-input"
            type="text"
            placeholder={
              isListening
                ? "Listening... speak now"
                : "Ask about spending, limits, or ledger history..."
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            className="flex-1 min-w-0 rounded-xs border border-[var(--border-color)] bg-[var(--bg-base)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:outline-none focus:border-[var(--text-primary)] disabled:opacity-50"
          />

          {/* Rule 1 & 2: Single microphone button next to Send button */}
          {isSpeechSupported && (
            <button
              id="ask-speech-mic-btn"
              type="button"
              onClick={toggleListening}
              disabled={isLoading}
              title={isListening ? "Listening... Tap to send" : "Tap to speak question"}
              aria-label={isListening ? "Listening, tap to send" : "Tap to speak"}
              className={`h-9 px-3 text-xs font-mono rounded-xs border transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 select-none ${
                isListening
                  ? "border-[var(--accent-lime)] bg-[var(--accent-lime)] text-[var(--accent-lime-text)] font-semibold"
                  : "border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]"
              }`}
            >
              {isListening ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-lime-text)] animate-ping" />
                  <span>Listening</span>
                </>
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          <Button
            id="ask-yawabudget-send-btn"
            type="submit"
            isLoading={isLoading}
            disabled={!prompt.trim() || isLoading || isListening}
            size="sm"
            className="h-9 px-3 shrink-0"
            rightIcon={<Send className="w-3 h-3" />}
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
};
