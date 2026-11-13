import React, { useState, useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { askYawaBudgetApi, getErrorMessage, IS_DEMO_MODE } from "../api";
import { ChatMessageItem } from "../types";
import { ChatMessage } from "../components/ai/ChatMessage";
import { ChatInput } from "../components/ai/ChatInput";
import { ErrorAlert } from "../components/common/ErrorAlert";

export const AskYawaBudgetPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text: "No yawa! Inquire into your ledger to check category limits, month-to-date spending, or where to cut expenses.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [micBlockedError, setMicBlockedError] = useState<string | null>(null);
  // Rule 6: A small "Read answers aloud" toggle (off by default) that uses speechSynthesis
  const [readAnswersAloud, setReadAnswersAloud] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Read answer aloud helper
  const speakAnswerIfEnabled = useCallback(
    (text: string) => {
      if (!readAnswersAloud || typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Fallback silently
      }
    },
    [readAnswersAloud]
  );

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSendMessage = async (text: string) => {
    setError(null);
    setMicBlockedError(null);
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append user message
    const userMsg: ChatMessageItem = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text,
      timestamp: now,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await askYawaBudgetApi({ question: text });

      const assistantMsg: ChatMessageItem = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speakAnswerIfEnabled(response.answer);
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Failed to get an answer from Yawa Budget. Please try again."
      );
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-4 relative pb-12 md:pb-6">
      {/* Header */}
      <div className="pb-3 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] font-sans">
            Ask Yawa Budget
          </h1>
          <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
            Inquire into your ledger to keep your finances from becoming yawa
          </p>
        </div>

        {/* Rule 6: Read answers aloud toggle */}
        <label className="inline-flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)] cursor-pointer select-none">
          <input
            id="read-answers-aloud-toggle"
            type="checkbox"
            checked={readAnswersAloud}
            onChange={(e) => {
              const enabled = e.target.checked;
              setReadAnswersAloud(enabled);
              if (!enabled && typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
              }
            }}
            className="w-3.5 h-3.5 rounded-xs accent-[var(--accent-lime)] cursor-pointer"
          />
          <span className="text-[var(--text-primary)] font-medium">Read answers aloud</span>
        </label>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Rule 3: Microphone blocked banner */}
      {micBlockedError && (
        <div
          id="mic-blocked-banner"
          className="p-3 bg-[var(--bg-surface)] border border-red-500/40 text-xs text-red-500 rounded-xs font-mono"
        >
          {micBlockedError}
        </div>
      )}

      {/* Main Chat Container */}
      <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col h-[520px]">
        {/* Messages Scroll Area */}
        <div
          id="chat-messages-container"
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[var(--bg-base)]"
        >
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {/* Assistant Loading State */}
          {isLoading && (
            <div className="flex items-start gap-3 justify-start">
              <div className="w-7 h-7 flex items-center justify-center shrink-0 border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--accent-lime-text)] dark:text-[var(--accent-lime)] rounded-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-2.5 rounded-xs">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-lime)] animate-pulse" />
                  Checking active ledger...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Dock Area */}
        <div className="p-3 sm:p-4 border-t border-[var(--border-color)] bg-[var(--bg-surface)]">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onMicrophoneError={(errMsg) => setMicBlockedError(errMsg)}
          />
        </div>
      </div>

      {/* Rule 7: Small note under the chat, only in demo mode */}
      {IS_DEMO_MODE && (
        <p className="text-[11px] font-mono text-[var(--text-muted)] text-center">
          Demo mode, answers use sample data.
        </p>
      )}
    </div>
  );
};
