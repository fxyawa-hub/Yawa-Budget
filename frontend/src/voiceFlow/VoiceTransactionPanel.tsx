import React, { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";
import {
  categorizeTransactionApi,
  getErrorMessage,
  IS_DEMO_MODE,
} from "../api";
import { CreateTransactionPayload, Transaction } from "../types";
import {
  VoiceCategory,
  VoiceTransactionType,
  detectType,
  formatFriendlyDateLabel,
  formatLocalDate,
  inferDemoCategory,
  matchSpokenCategory,
  parseAmount,
  parseConfirmationIntent,
  parseDate,
  parseDateStepAnswer,
  parseInitialUtterance,
} from "./parsers";

export function isVoiceFlowSupported(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

type StatusWord = "Listening" | "Speaking" | "Saving";

type FlowStep =
  | "ASK_DESCRIPTION"
  | "ASK_AMOUNT"
  | "ASK_DATE"
  | "ASK_DATE_WHICH"
  | "ASK_CATEGORY"
  | "RESOLVE_CATEGORY"
  | "CONFIRM"
  | "SAVING"
  | "ANYTHING_ELSE"
  | "BLOCKED"
  | "CLOSED";

interface TransactionSlots {
  description: string | null;
  amount: number | null;
  date: string | null;
  type: VoiceTransactionType;
  category: string | null;
}

interface VoiceTransactionPanelProps {
  onSaveTransaction: (payload: CreateTransactionPayload) => Promise<Transaction | void>;
  onClose: () => void;
  onTypeInstead: () => void;
}

const INITIAL_SLOTS: TransactionSlots = {
  description: null,
  amount: null,
  date: null,
  type: "EXPENSE",
  category: null,
};

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  return (
    voices.find((v) => v.lang === "en-NG") ||
    voices.find((v) => v.lang === "en-GB") ||
    voices.find((v) => v.lang === "en-US") ||
    voices.find((v) => v.lang.toLowerCase().startsWith("en")) ||
    null
  );
}

export const VoiceTransactionPanel: React.FC<VoiceTransactionPanelProps> = ({
  onSaveTransaction,
  onClose,
  onTypeInstead,
}) => {
  const [statusWord, setStatusWord] = useState<StatusWord>("Speaking");
  const [yawaCaption, setYawaCaption] = useState<string>("What did you spend on?");
  const [userLiveLine, setUserLiveLine] = useState<string>("");
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for stable single SpeechRecognition lifecycle & conversation state machine
  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef<boolean>(true);
  const isRunningRef = useRef<boolean>(false);
  const stepRef = useRef<FlowStep>("ASK_DESCRIPTION");
  const slotsRef = useRef<TransactionSlots>({ ...INITIAL_SLOTS });
  const editingSingleFieldRef = useRef<boolean>(false);

  const noSpeechCountRef = useRef<number>(0);
  const amountRetryCountRef = useRef<number>(0);
  const dateRetryCountRef = useRef<number>(0);
  const confirmRetryCountRef = useRef<number>(0);

  const finalTranscriptRef = useRef<string>("");
  const interimTranscriptRef = useRef<string>("");
  const pendingLangRetryRef = useRef<boolean>(false);

  const listenDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anythingElseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSaveRef = useRef(onSaveTransaction);
  onSaveRef.current = onSaveTransaction;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const clearAllTimers = useCallback(() => {
    if (listenDelayTimerRef.current) {
      clearTimeout(listenDelayTimerRef.current);
      listenDelayTimerRef.current = null;
    }
    if (anythingElseTimerRef.current) {
      clearTimeout(anythingElseTimerRef.current);
      anythingElseTimerRef.current = null;
    }
    if (speechFallbackTimerRef.current) {
      clearTimeout(speechFallbackTimerRef.current);
      speechFallbackTimerRef.current = null;
    }
  }, []);

  const teardownVoice = useCallback(() => {
    isActiveRef.current = false;
    clearAllTimers();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore synthesis cancel errors
      }
    }

    const rec = recognitionRef.current;
    if (rec && isRunningRef.current) {
      try {
        rec.abort();
      } catch {
        // Ignore abort errors
      }
    }
  }, [clearAllTimers]);

  const stopAndClose = useCallback(() => {
    teardownVoice();
    onCloseRef.current();
  }, [teardownVoice]);

  const startRecognitionNow = useCallback(() => {
    if (!isActiveRef.current || stepRef.current === "BLOCKED" || stepRef.current === "CLOSED") {
      return;
    }
    const rec = recognitionRef.current;
    if (!rec || isRunningRef.current) return;

    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    setUserLiveLine("");
    setStatusWord("Listening");

    try {
      rec.start();
    } catch {
      // If start fails because already started or unsupported, ignore safely
    }
  }, []);

  const speakAndThen = useCallback(
    (text: string, onDone: () => void) => {
      if (!isActiveRef.current) return;

      clearAllTimers();
      setYawaCaption(text);
      setStatusWord("Speaking");

      // Ensure recognition is not running while Yawa speaks
      if (recognitionRef.current && isRunningRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }

      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        listenDelayTimerRef.current = setTimeout(() => {
          if (isActiveRef.current) onDone();
        }, 300);
        return;
      }

      let finished = false;
      const finishSpeaking = () => {
        if (finished) return;
        finished = true;
        if (speechFallbackTimerRef.current) {
          clearTimeout(speechFallbackTimerRef.current);
          speechFallbackTimerRef.current = null;
        }
        if (!isActiveRef.current) return;
        // Wait 300ms after utterance ends before starting recognition
        listenDelayTimerRef.current = setTimeout(() => {
          if (isActiveRef.current) onDone();
        }, 300);
      };

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = pickEnglishVoice();
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } else {
          utterance.lang = "en-NG";
        }
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = finishSpeaking;
        utterance.onerror = finishSpeaking;

        // Safety fallback in case browser speechSynthesis stalls without firing onend
        const approxDurationMs = Math.max(2500, text.length * 95);
        speechFallbackTimerRef.current = setTimeout(finishSpeaking, approxDurationMs);

        window.speechSynthesis.speak(utterance);
      } catch {
        finishSpeaking();
      }
    },
    [clearAllTimers]
  );

  const askStep = useCallback(
    (step: FlowStep, promptText: string) => {
      if (!isActiveRef.current) return;
      stepRef.current = step;

      speakAndThen(promptText, () => {
        if (!isActiveRef.current) return;
        startRecognitionNow();

        if (step === "ANYTHING_ELSE") {
          anythingElseTimerRef.current = setTimeout(() => {
            if (isActiveRef.current && stepRef.current === "ANYTHING_ELSE") {
              stopAndClose();
            }
          }, 6000);
        }
      });
    },
    [speakAndThen, startRecognitionNow, stopAndClose]
  );

  const proceedToNextMissingSlotOrConfirm = useCallback(async () => {
    if (!isActiveRef.current) return;
    const slots = slotsRef.current;

    if (!slots.description) {
      editingSingleFieldRef.current = false;
      askStep("ASK_DESCRIPTION", "What did you spend on?");
      return;
    }

    if (!slots.amount || slots.amount <= 0) {
      amountRetryCountRef.current = 0;
      editingSingleFieldRef.current = false;
      askStep("ASK_AMOUNT", "How much?");
      return;
    }

    if (!slots.date) {
      dateRetryCountRef.current = 0;
      editingSingleFieldRef.current = false;
      askStep("ASK_DATE", "Today?");
      return;
    }

    // Step 5: Resolve category if missing
    if (!slots.category) {
      stepRef.current = "RESOLVE_CATEGORY";
      if (IS_DEMO_MODE) {
        slots.category = inferDemoCategory(slots.description);
      } else {
        try {
          const res = await categorizeTransactionApi({
            description: slots.description,
            amount: slots.amount,
          });
          if (!isActiveRef.current) return;
          slots.category = res.suggestedCategory || "Other";
        } catch {
          if (!isActiveRef.current) return;
          slots.category = inferDemoCategory(slots.description);
        }
      }
    }

    // Step 6: Confirm out loud
    confirmRetryCountRef.current = 0;
    const friendlyDate = formatFriendlyDateLabel(slots.date);
    const formattedAmount = `${slots.amount.toLocaleString()} naira`;
    const confirmSentence = `Add ${slots.description}, ${formattedAmount}, ${slots.category}, ${friendlyDate}. Save it?`;
    askStep("CONFIRM", confirmSentence);
  }, [askStep]);

  const executeSave = useCallback(async () => {
    if (!isActiveRef.current) return;
    const slots = slotsRef.current;
    if (!slots.description || !slots.amount || slots.amount <= 0 || !slots.date) {
      return;
    }

    stepRef.current = "SAVING";
    setStatusWord("Saving");
    setYawaCaption("Saving transaction...");
    setErrorMessage(null);

    try {
      await onSaveRef.current({
        amount: slots.amount,
        description: slots.description,
        date: slots.date,
        category: slots.category || "Other",
        type: slots.type,
      });

      if (!isActiveRef.current) return;

      speakAndThen("Saved.", () => {
        if (!isActiveRef.current) return;
        // Reset slots for next potential item
        slotsRef.current = { ...INITIAL_SLOTS };
        editingSingleFieldRef.current = false;
        noSpeechCountRef.current = 0;
        askStep("ANYTHING_ELSE", "Anything else?");
      });
    } catch (err) {
      if (!isActiveRef.current) return;
      const msg = getErrorMessage(err, "Could not save transaction.");
      setErrorMessage(msg);
      speakAndThen("Could not save that transaction.", () => {
        if (!isActiveRef.current) return;
        setStatusWord("Speaking");
      });
    }
  }, [askStep, speakAndThen]);

  const handleUserUtterance = useCallback(
    (spokenText: string) => {
      if (!isActiveRef.current) return;
      const trimmed = spokenText.trim();
      if (!trimmed) return;

      const currentStep = stepRef.current;
      const slots = slotsRef.current;

      // Global cancel/stop phrases during conversation
      if (
        currentStep !== "CONFIRM" &&
        currentStep !== "ASK_DATE" &&
        currentStep !== "ANYTHING_ELSE" &&
        /^(cancel|stop|never mind|nevermind|quit|exit)$/i.test(trimmed)
      ) {
        speakAndThen("Cancelled.", () => stopAndClose());
        return;
      }

      if (currentStep === "ASK_DESCRIPTION") {
        if (editingSingleFieldRef.current) {
          slots.description = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
          slots.type = detectType(trimmed);
          slots.category = null; // Re-categorize updated description
          editingSingleFieldRef.current = false;
          void proceedToNextMissingSlotOrConfirm();
          return;
        }

        // Step 8: Multi-slot extraction from first answer
        const parsed = parseInitialUtterance(trimmed);
        slots.description =
          parsed.description || trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        slots.type = parsed.type;
        if (parsed.amount !== null && parsed.amount > 0) {
          slots.amount = parsed.amount;
        }
        if (parsed.date !== null) {
          slots.date = parsed.date;
        }
        void proceedToNextMissingSlotOrConfirm();
        return;
      }

      if (currentStep === "ASK_AMOUNT") {
        const parsedAmount = parseAmount(trimmed);
        if (parsedAmount !== null && parsedAmount > 0) {
          slots.amount = parsedAmount;
          amountRetryCountRef.current = 0;
          editingSingleFieldRef.current = false;
          void proceedToNextMissingSlotOrConfirm();
          return;
        }

        if (amountRetryCountRef.current === 0) {
          amountRetryCountRef.current = 1;
          askStep("ASK_AMOUNT", "I didn't get the amount. How much?");
          return;
        }

        speakAndThen("I couldn't get the amount. Let's stop here.", () => stopAndClose());
        return;
      }

      if (currentStep === "ASK_DATE") {
        const ans = parseDateStepAnswer(trimmed);
        if (ans.status === "resolved" && ans.date) {
          slots.date = ans.date;
          dateRetryCountRef.current = 0;
          editingSingleFieldRef.current = false;
          void proceedToNextMissingSlotOrConfirm();
          return;
        }

        if (ans.status === "ask_which_day") {
          dateRetryCountRef.current = 0;
          askStep("ASK_DATE_WHICH", "Which day?");
          return;
        }

        if (dateRetryCountRef.current === 0) {
          dateRetryCountRef.current = 1;
          askStep("ASK_DATE", "Say yes for today, or tell me the day.");
          return;
        }

        // Default cleanly to today if still ambiguous after retry
        slots.date = formatLocalDate(new Date());
        void proceedToNextMissingSlotOrConfirm();
        return;
      }

      if (currentStep === "ASK_DATE_WHICH") {
        const parsedDate = parseDate(trimmed);
        if (parsedDate.date) {
          slots.date = parsedDate.date;
          dateRetryCountRef.current = 0;
          editingSingleFieldRef.current = false;
          void proceedToNextMissingSlotOrConfirm();
          return;
        }

        if (dateRetryCountRef.current === 0) {
          dateRetryCountRef.current = 1;
          askStep("ASK_DATE_WHICH", "Say today, yesterday, or a weekday.");
          return;
        }

        speakAndThen("I didn't get the day. Let's stop here.", () => stopAndClose());
        return;
      }

      if (currentStep === "ASK_CATEGORY") {
        const matched: VoiceCategory | null = matchSpokenCategory(trimmed);
        if (matched) {
          slots.category = matched;
          editingSingleFieldRef.current = false;
          void proceedToNextMissingSlotOrConfirm();
          return;
        }

        if (dateRetryCountRef.current === 0) {
          dateRetryCountRef.current = 1;
          askStep(
            "ASK_CATEGORY",
            "Choose Food, Transport, Bills, Shopping, Entertainment, or Other."
          );
          return;
        }

        slots.category = "Other";
        void proceedToNextMissingSlotOrConfirm();
        return;
      }

      if (currentStep === "CONFIRM") {
        const intent = parseConfirmationIntent(trimmed);

        if (intent === "yes") {
          void executeSave();
          return;
        }

        if (intent === "no") {
          speakAndThen("Okay, not saved.", () => stopAndClose());
          return;
        }

        if (intent === "change_amount") {
          slots.amount = null;
          amountRetryCountRef.current = 0;
          editingSingleFieldRef.current = true;
          askStep("ASK_AMOUNT", "How much?");
          return;
        }

        if (intent === "change_date") {
          slots.date = null;
          dateRetryCountRef.current = 0;
          editingSingleFieldRef.current = true;
          askStep("ASK_DATE", "Today?");
          return;
        }

        if (intent === "change_description") {
          slots.description = null;
          slots.category = null;
          editingSingleFieldRef.current = true;
          askStep("ASK_DESCRIPTION", "What did you spend on?");
          return;
        }

        if (intent === "change_category") {
          dateRetryCountRef.current = 0;
          editingSingleFieldRef.current = true;
          askStep(
            "ASK_CATEGORY",
            "Which category? Food, Transport, Bills, Shopping, Entertainment, or Other."
          );
          return;
        }

        if (confirmRetryCountRef.current === 0) {
          confirmRetryCountRef.current = 1;
          askStep("CONFIRM", "Say yes to save, no to cancel, or what to change.");
          return;
        }

        speakAndThen("Okay, not saved.", () => stopAndClose());
        return;
      }

      if (currentStep === "ANYTHING_ELSE") {
        if (/^(no|nope|nothing|done|i'm good|im good|that's all|thats all|stop|cancel)\b/i.test(trimmed)) {
          stopAndClose();
          return;
        }

        if (/^(yes|yeah|yep|yup|one more|another)\b/i.test(trimmed) && trimmed.split(/\s+/).length <= 3) {
          slotsRef.current = { ...INITIAL_SLOTS };
          askStep("ASK_DESCRIPTION", "What did you spend on?");
          return;
        }

        // User already spoke the next transaction directly
        const parsed = parseInitialUtterance(trimmed);
        slotsRef.current = {
          description:
            parsed.description || trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
          amount: parsed.amount,
          date: parsed.date,
          type: parsed.type,
          category: null,
        };
        void proceedToNextMissingSlotOrConfirm();
      }
    },
    [askStep, executeSave, proceedToNextMissingSlotOrConfirm, speakAndThen, stopAndClose]
  );

  const handleUserUtteranceRef = useRef(handleUserUtterance);
  handleUserUtteranceRef.current = handleUserUtterance;

  // Initialize ONE SpeechRecognition instance on mount and start first prompt
  useEffect(() => {
    isActiveRef.current = true;
    slotsRef.current = { ...INITIAL_SLOTS };
    stepRef.current = "ASK_DESCRIPTION";
    noSpeechCountRef.current = 0;
    amountRetryCountRef.current = 0;
    dateRetryCountRef.current = 0;
    confirmRetryCountRef.current = 0;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      stepRef.current = "BLOCKED";
      setBlockedMessage("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "en-NG";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      isRunningRef.current = true;
      if (isActiveRef.current) {
        setStatusWord("Listening");
      }
    };

    recognition.onresult = (event: any) => {
      if (!isActiveRef.current) return;

      // Clear 6s "Anything else?" auto-close once user starts speaking
      if (anythingElseTimerRef.current) {
        clearTimeout(anythingElseTimerRef.current);
        anythingElseTimerRef.current = null;
      }

      let finalPart = "";
      let interimPart = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript || "";
        if (result.isFinal) {
          finalPart += `${text} `;
        } else {
          interimPart += `${text} `;
        }
      }

      const finalClean = finalPart.trim();
      const interimClean = interimPart.trim();
      if (finalClean) {
        finalTranscriptRef.current = finalClean;
      }
      interimTranscriptRef.current = interimClean;
      setUserLiveLine((finalClean || interimClean).trim());
    };

    recognition.onerror = (event: any) => {
      const code = event?.error;

      // Ignore "aborted" completely
      if (code === "aborted") {
        return;
      }

      if (code === "language-not-supported" && recognition.lang !== "en-US") {
        recognition.lang = "en-US";
        pendingLangRetryRef.current = true;
        return;
      }

      if (code === "not-allowed" || code === "service-not-allowed") {
        stepRef.current = "BLOCKED";
        setBlockedMessage("Microphone is blocked. Allow it in the address bar and try again.");
        clearAllTimers();
        return;
      }

      if (code === "audio-capture") {
        stepRef.current = "BLOCKED";
        setBlockedMessage("Microphone is unavailable. Connect one and try again.");
        clearAllTimers();
        return;
      }

      // "no-speech" and other transient end events are handled in onend
    };

    recognition.onend = () => {
      isRunningRef.current = false;

      if (anythingElseTimerRef.current) {
        clearTimeout(anythingElseTimerRef.current);
        anythingElseTimerRef.current = null;
      }

      if (!isActiveRef.current || stepRef.current === "BLOCKED" || stepRef.current === "CLOSED") {
        return;
      }

      if (pendingLangRetryRef.current) {
        pendingLangRetryRef.current = false;
        listenDelayTimerRef.current = setTimeout(() => {
          startRecognitionNow();
        }, 150);
        return;
      }

      const spoken = (finalTranscriptRef.current || interimTranscriptRef.current).trim();
      finalTranscriptRef.current = "";
      interimTranscriptRef.current = "";

      if (!spoken) {
        if (stepRef.current === "ANYTHING_ELSE") {
          stopAndClose();
          return;
        }

        if (noSpeechCountRef.current === 0) {
          noSpeechCountRef.current = 1;
          const retryQuestionMap: Record<FlowStep, string> = {
            ASK_DESCRIPTION: "What did you spend on?",
            ASK_AMOUNT: "How much?",
            ASK_DATE: "Today?",
            ASK_DATE_WHICH: "Which day?",
            ASK_CATEGORY: "Which category?",
            CONFIRM: "Save it?",
            RESOLVE_CATEGORY: "Save it?",
            SAVING: "Save it?",
            ANYTHING_ELSE: "Anything else?",
            BLOCKED: "",
            CLOSED: "",
          };
          const q = retryQuestionMap[stepRef.current] || "What did you spend on?";
          askStep(stepRef.current, `I didn't catch that. ${q}`);
          return;
        }

        speakAndThen("I didn't catch that. Let's stop here.", () => {
          stopAndClose();
        });
        return;
      }

      noSpeechCountRef.current = 0;
      handleUserUtteranceRef.current(spoken);
    };

    // Start first question immediately after user tap opened the panel
    askStep("ASK_DESCRIPTION", "What did you spend on?");

    return () => {
      teardownVoice();
      recognitionRef.current = null;
    };
  }, [askStep, clearAllTimers, speakAndThen, startRecognitionNow, stopAndClose, teardownVoice]);

  const handleTypeInsteadClick = () => {
    teardownVoice();
    onTypeInstead();
  };

  return (
    <div
      id="voice-transaction-panel"
      role="dialog"
      aria-label="Talk to Yawa"
      className="fixed bottom-16 md:bottom-6 inset-x-3 md:inset-x-auto md:right-6 md:w-[400px] z-40 border border-[var(--border-color)] bg-[var(--bg-surface)] p-4"
    >
      {/* Top Row: One Status Word + Close */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
        <span
          id="voice-flow-status"
          className="text-xs font-mono uppercase tracking-wider text-[var(--text-primary)] font-semibold"
        >
          {blockedMessage ? "Blocked" : statusWord}
        </span>

        <button
          type="button"
          onClick={stopAndClose}
          aria-label="Close voice panel"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body: Blocked notice OR Yawa caption + live user transcript */}
      <div className="py-3 space-y-2">
        {blockedMessage ? (
          <p id="voice-flow-blocked" className="text-sm text-[var(--alert-red)] leading-snug">
            {blockedMessage}
          </p>
        ) : (
          <>
            <p
              id="voice-flow-caption"
              className="text-sm font-medium text-[var(--text-primary)] leading-snug"
            >
              {yawaCaption}
            </p>
            <p
              id="voice-flow-transcript"
              className="text-xs font-mono text-[var(--text-secondary)] min-h-[18px] break-words"
            >
              {userLiveLine ? userLiveLine : statusWord === "Listening" ? "..." : ""}
            </p>
          </>
        )}

        {errorMessage && (
          <p className="text-xs text-[var(--alert-red)] pt-1">{errorMessage}</p>
        )}
      </div>

      {/* Footer: Type instead link + Cancel button */}
      <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between gap-3">
        <button
          id="voice-flow-type-instead"
          type="button"
          onClick={handleTypeInsteadClick}
          className="text-xs font-sans text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2 cursor-pointer"
        >
          Type instead
        </button>

        <button
          id="voice-flow-cancel"
          type="button"
          onClick={stopAndClose}
          className="px-3 py-1.5 text-xs font-sans font-medium border border-[var(--border-color)] bg-[var(--bg-base)] text-[var(--text-primary)] hover:border-[var(--text-primary)] rounded-sm transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
