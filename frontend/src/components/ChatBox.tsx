// src/components/ChatBox.tsx
import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import api from "../lib/api";
import QuizViewer from "./QuizViewer";

type QuoteObj = { source: number; text: string };
type SourceObj = { source_number: number; title?: string; page?: number };

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  quotes?: QuoteObj[];
  suggestions?: string[];
  sources?: SourceObj[];
  timestamp: Date;
}

const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [topK, setTopK] = useState<number>(8);
  const [lengthMode, setLengthMode] = useState<"short" | "medium" | "long">(
    "medium"
  );
  const [quizData, setQuizData] = useState<any[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, quizData]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userQ = inputValue.trim();
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "user",
        content: userQ,
        timestamp: new Date(),
      },
    ]);

    setInputValue("");
    setIsLoading(true);

    try {
      const res = await api.answer(userQ, topK, lengthMode);
      const content = res?.answer || "No answer returned";

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "ai",
          content,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to get answer");
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          type: "ai",
          content: "Server error.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummary = async () => {
    const lastUser =
      [...messages].reverse().find((m) => m.type === "user")?.content ||
      inputValue;

    if (!lastUser) return toast.info("No question to summarize.");

    setIsLoading(true);
    try {
      const res = await api.summarize({ question: lastUser }, topK, lengthMode);
      const summary = res?.summary ?? res?.raw ?? "No summary returned";

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 3).toString(),
          type: "ai",
          content: String(summary),
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      console.error(err);
      toast.error("Summary failed: " + (err?.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuiz = async () => {
    const lastUser =
      [...messages].reverse().find((m) => m.type === "user")?.content ||
      inputValue ||
      "generate quiz";

    setIsLoading(true);
    try {
      const res = await api.generateQuiz(
        { question: lastUser },
        "mcq",
        5,
        topK
      );

      let q = res?.quiz ?? res?.quiz_raw ?? null;

      if (Array.isArray(q)) {
        setQuizData(q);
      } else if (typeof q === "string") {
        try {
          const parsed = JSON.parse(q);
          if (Array.isArray(parsed)) {
            setQuizData(parsed);
          } else {
            throw new Error("Invalid quiz format");
          }
        } catch {
          toast.error("Quiz generation produced invalid format.");
          console.warn("quiz raw:", q);
        }
      } else {
        toast.error("No structured quiz returned.");
        console.warn("quiz response:", res);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Quiz generation failed: " + (err?.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto rounded-2xl">
      {/* CHAT MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${
                m.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-3xl px-4 py-3 rounded-2xl shadow-sm transition
                ${
                  m.type === "user"
                    ? "ml-12 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 text-white shadow-[0_12px_30px_rgba(236,72,153,0.45)]"
                    : "mr-12 bg-white/10 border border-white/10 text-purple-50 dark:bg-slate-900/60 dark:border-slate-700"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {m.type === "user" ? (
                      <User className="h-5 w-5" />
                    ) : (
                      <Bot className="h-5 w-5 text-pink-300" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {m.content}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs
                           bg-white/10 border border-white/15 text-purple-100">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div
        className="border-t border-white/10 bg-white/5 dark:bg-slate-900/70
                   backdrop-blur-xl px-4 py-4 space-y-3 rounded-b-2xl"
      >
        {/* Top row: input + controls + ask */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full border border-white/15 bg-black/20">
            <input
              placeholder="Ask about your documents..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 bg-transparent text-sm text-purple-50 placeholder:text-purple-200/60
                         outline-none border-none"
            />

            <select
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="px-2 py-1 rounded-full text-[11px] border border-white/20
                         bg-white/10 text-purple-50 outline-none"
            >
              <option value={4}>Top 4</option>
              <option value={6}>Top 6</option>
              <option value={8}>Top 8</option>
              <option value={12}>Top 12</option>
            </select>

            <select
              value={lengthMode}
              onChange={(e) => setLengthMode(e.target.value as any)}
              className="px-2 py-1 rounded-full text-[11px] border border-white/20
                         bg-white/10 text-purple-50 outline-none"
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="md:w-auto w-full px-4 py-2.5 rounded-full flex items-center justify-center gap-2 text-sm font-semibold
                       bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500
                       hover:brightness-110 text-white shadow-[0_12px_30px_rgba(236,72,153,0.45)]
                       disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            <Send className="h-4 w-4" /> Ask
          </button>
        </form>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap gap-3 text-xs">
          <button
            onClick={handleSummary}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-full border border-white/20
                       bg-white/5 text-purple-100 hover:bg-white/10
                       disabled:opacity-60 transition"
          >
            Summarize
          </button>

          <button
            onClick={handleQuiz}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-full text-white text-xs font-medium
                       bg-indigo-500 hover:bg-indigo-400
                       shadow-[0_10px_25px_rgba(129,140,248,0.4)]
                       disabled:opacity-60 transition"
          >
            Generate Quiz
          </button>
        </div>

        {quizData && (
          <div className="mt-3">
            <QuizViewer quiz={quizData} onClose={() => setQuizData(null)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBox;
