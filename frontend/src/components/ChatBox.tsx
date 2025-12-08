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
  const [lengthMode, setLengthMode] = useState<"short" | "medium" | "long">("medium");
  const [quizData, setQuizData] = useState<any[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, quizData]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userQ = inputValue.trim();
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), type: "user", content: userQ, timestamp: new Date() }
    ]);

    setInputValue("");
    setIsLoading(true);

    try {
      const res = await api.answer(userQ, topK, lengthMode);
      const content = res?.answer || "No answer returned";

      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), type: "ai", content, timestamp: new Date() }
      ]);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to get answer");
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 2).toString(), type: "ai", content: "Server error.", timestamp: new Date() }
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
    const res = await api.generateQuiz({ question: lastUser }, "mcq", 5, topK);

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
    <div className="flex flex-col h-full max-w-4xl mx-auto
                    bg-white text-slate-900
                    dark:bg-slate-900 dark:text-slate-100 rounded-lg">

      {/* CHAT MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map(m => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${m.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-3xl rounded-2xl px-4 py-3 transition
                ${
                  m.type === "user"
                    ? "bg-green-600 text-white ml-12"
                    : "bg-gray-100 text-slate-900 mr-12 dark:bg-slate-800 dark:text-slate-100"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {m.type === "user" ? (
                      <User className="h-6 w-6" />
                    ) : (
                      <Bot className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <div className="flex justify-start">
            <div className="p-3 rounded bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200">
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className="border-t p-4 space-y-3
                      border-slate-200 dark:border-slate-700
                      bg-slate-50 dark:bg-slate-800">

        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            placeholder="Ask about your documents..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 px-3 py-2 border rounded transition
                       bg-white text-slate-900 border-slate-300
                       dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
          />

          <select
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            className="px-2 py-2 border rounded transition
                       bg-white text-slate-900 border-slate-300
                       dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
          >
            <option value={4}>Top 4</option>
            <option value={6}>Top 6</option>
            <option value={8}>Top 8</option>
            <option value={12}>Top 12</option>
          </select>

          <select
            value={lengthMode}
            onChange={(e) => setLengthMode(e.target.value as any)}
            className="px-2 py-2 border rounded transition
                       bg-white text-slate-900 border-slate-300
                       dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600"
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>

          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 rounded flex items-center gap-2 transition
                       bg-blue-600 hover:bg-blue-700 text-white
                       disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> Ask
          </button>
        </form>

       {/* ACTION BUTTONS */}
      <div className="flex gap-3">
        <button
          onClick={handleSummary}
          disabled={isLoading}
          className="px-3 py-2 rounded transition
                    bg-gray-200 text-slate-900
                    dark:bg-slate-700 dark:text-slate-100
                    disabled:opacity-60"
        >
          Summarize
        </button>

        <button
          onClick={handleQuiz}
          disabled={isLoading}
          className="px-3 py-2 rounded transition
                    bg-indigo-600 hover:bg-indigo-700 text-white
                    disabled:opacity-60"
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
