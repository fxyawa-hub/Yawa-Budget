import React, { useState, useEffect } from "react";
import { MessageSquare, User as UserIcon, Volume2, Square } from "lucide-react";
import { ChatMessageItem } from "../../types";

interface ChatMessageProps {
  message: ChatMessageItem;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isAssistant = message.sender === "assistant";
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const isSpeechSynthesisSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    return () => {
      if (isSpeaking && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  const handleToggleSpeech = () => {
    if (!isSpeechSynthesisSupported) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div
      className={`flex items-start gap-3 ${
        isAssistant ? "justify-start" : "justify-end flex-row-reverse"
      }`}
    >
      <div
        className={`w-7 h-7 flex items-center justify-center shrink-0 border rounded-xs ${
          isAssistant
            ? "border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--accent-lime-text)] dark:text-[var(--accent-lime)]"
            : "border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
        }`}
      >
        {isAssistant ? <MessageSquare className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
      </div>

      <div
        className={`max-w-[85%] sm:max-w-xl rounded-xs px-4 py-3 text-xs leading-relaxed border ${
          isAssistant
            ? "bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-primary)]"
            : "bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-primary)]"
        }`}
      >
        <div className="flex items-center justify-between gap-4 mb-1">
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            {isAssistant ? "assistant" : "you"}
          </span>
          <div className="flex items-center gap-2">
            {isAssistant && isSpeechSynthesisSupported && (
              <button
                type="button"
                onClick={handleToggleSpeech}
                title={isSpeaking ? "Stop speaking" : "Read aloud (Text to Speech)"}
                aria-label={isSpeaking ? "Stop speaking" : "Read answer aloud"}
                className={`p-1 rounded-xs transition-colors border cursor-pointer ${
                  isSpeaking
                    ? "border-[var(--accent-lime)] text-[var(--accent-lime-text)] dark:text-[var(--accent-lime)] bg-[var(--accent-lime-subtle)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]"
                }`}
              >
                {isSpeaking ? (
                  <Square className="w-3 h-3 fill-current animate-pulse" />
                ) : (
                  <Volume2 className="w-3 h-3" />
                )}
              </button>
            )}
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              {message.timestamp}
            </span>
          </div>
        </div>

        <p className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[var(--text-primary)]">
          {message.text}
        </p>
      </div>
    </div>
  );
};
