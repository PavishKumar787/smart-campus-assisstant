// src/components/ChatBox.tsx
import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, BookOpen, Quote } from "lucide-react";
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
  const [lengthMode, setLengthMode] = useState<"short"|"medium"|"long">("medium");
  const [quizData, setQuizData] = useState<any[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, quizData]);

  const normalizeQuotes = (raw: any): QuoteObj[] => {
    if (!raw) return [];
    if (Array.isArray(raw) && raw.length && typeof raw[0] === "object") return raw.map((q:any) => ({ source: Number(q.source ?? q.source_number ?? 0), text: String(q.text ?? q) }));
    if (Array.isArray(raw)) return raw.map((q:any,i:number) => ({ source: i+1, text: String(q) }));
    if (typeof raw === "string") return [{ source: 1, text: raw }];
    return [];
  };

  const normalizeSources = (raw: any, retrievedSources?: any[]): SourceObj[] => {
    if (!raw && !retrievedSources) return [];
    if (Array.isArray(raw) && raw.length && typeof raw[0] === "object") {
      return raw.map((s:any, i:number) => ({ source_number: Number(s.source_number ?? s.source ?? i+1), title: s.title, page: s.page }));
    }
    if (retrievedSources && Array.isArray(retrievedSources)) {
      return retrievedSources.map((s:any, i:number) => ({ source_number: i+1, title: s.title, page: s.page }));
    }
    return [];
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    const userQ = inputValue.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), type: "user", content: userQ, timestamp: new Date() }]);
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await api.answer(userQ, topK, lengthMode);
      const content = (res?.answer && String(res.answer)) || (res?.raw && String(res.raw)) || "No answer returned";
      const quotes = normalizeQuotes(res?.quotes ?? res?.quoted ?? []);
      const sources = normalizeSources(res?.sources ?? [], res?.retrieved ?? null);
      const suggestions = Array.isArray(res?.study_suggestions ?? res?.suggestions) ? res.study_suggestions ?? res.suggestions : [];

      setMessages(prev => [...prev, {
        id: (Date.now()+1).toString(),
        type: "ai",
        content,
        quotes,
        suggestions,
        sources,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to get answer: " + (err?.message || ""));
      setMessages(prev => [...prev, { id: (Date.now()+2).toString(), type: "ai", content: "Server error while fetching answer.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummary = async () => {
    const lastUser = [...messages].reverse().find(m => m.type === "user")?.content || inputValue;
    if (!lastUser) return toast.info("No question to summarize.");
    setIsLoading(true);
    try {
      const res = await api.summarize({ question: lastUser }, topK, lengthMode);
      const summary = res?.summary ?? res?.raw ?? "No summary returned";
      setMessages(prev => [...prev, { id: (Date.now()+3).toString(), type: "ai", content: String(summary), timestamp: new Date() }]);
    } catch (err:any) {
      console.error(err);
      toast.error("Summary failed: " + (err?.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuiz = async () => {
    const lastUser = [...messages].reverse().find(m => m.type === "user")?.content || inputValue || "generate quiz";
    setIsLoading(true);
    try {
      const res = await api.generateQuiz({ question: lastUser }, "mcq", 5, topK);
      let q = res.quiz ?? res.quiz_raw ?? null;
      if (Array.isArray(q)) {
        setQuizData(q);
      } else if (typeof q === "string") {
        // try parse raw text fallback
        try { q = JSON.parse(q); if (Array.isArray(q)) setQuizData(q); else throw 1; } catch {
          toast.error("Quiz generation produced unstructured output. See console.");
          console.warn("quiz raw:", q);
        }
      } else {
        toast.error("No structured quiz returned.");
        console.warn("quiz response:", res);
      }
    } catch (err:any) {
      console.error(err);
      toast.error("Quiz generation failed: " + (err?.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map(m => (
            <motion.div key={m.id} initial={{ opacity:0, y: 12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className={`flex ${m.type === "user" ? "justify-end":"justify-start"}`}>
              <div className={`max-w-3xl rounded-2xl px-4 py-3 ${m.type==="user" ? "bg-green-500 text-white ml-12" : "bg-gray-100 text-gray-900 mr-12"}`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">{m.type==="user" ? <User className="h-6 w-6" /> : <Bot className="h-6 w-6 text-blue-500" />}</div>
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    {m.type==="ai" && (
                      <div className="mt-3 space-y-2 text-xs">
                        {m.quotes?.length ? (
                          <div className="pl-3 border-l-2 border-blue-300">
                            <div className="font-medium">Quotes</div>
                            {m.quotes.map((q,i)=> <div key={i} className="italic">Source {q.source}: "{q.text}"</div>)}
                          </div>
                        ) : null}
                        {m.suggestions?.length ? (
                          <div className="pl-3 border-l-2 border-green-300">
                            <div className="font-medium">Study suggestions</div>
                            <ul className="list-disc pl-5">
                              {m.suggestions.map((s,i)=> <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        ) : null}
                        {m.sources?.length ? (
                          <div className="pl-3 border-l-2 border-purple-300">
                            <div className="font-medium">Sources</div>
                            <ul className="pl-5">
                              {m.sources.map((s,i)=> <li key={i}>{s.title ?? `Source ${s.source_number}`} {s.page !== undefined ? `— page ${s.page}` : null}</li>)}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && <div className="flex justify-start"><div className="p-3 bg-gray-100 rounded">Thinking...</div></div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 space-y-3">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input placeholder="Ask about your documents..." value={inputValue} onChange={(e)=>setInputValue(e.target.value)} className="flex-1 px-3 py-2 border rounded" />
          <select value={topK} onChange={(e)=>setTopK(Number(e.target.value))} className="px-2 py-2 border rounded">
            <option value={4}>Top 4</option>
            <option value={6}>Top 6</option>
            <option value={8}>Top 8</option>
            <option value={12}>Top 12</option>
          </select>
          <select value={lengthMode} onChange={(e)=>setLengthMode(e.target.value as any)} className="px-2 py-2 border rounded">
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
          <button type="submit" disabled={!inputValue.trim() || isLoading} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2">
            <Send className="h-4 w-4" /> Ask
          </button>
        </form>

        <div className="flex gap-3">
          <button onClick={handleSummary} disabled={isLoading} className="px-3 py-2 bg-gray-100 rounded">Summarize</button>
          <button onClick={handleQuiz} disabled={isLoading} className="px-3 py-2 bg-indigo-600 text-white rounded">Generate Quiz</button>
        </div>

        {quizData && <div className="mt-3"><QuizViewer quiz={quizData} onClose={()=>setQuizData(null)} /></div>}
      </div>
    </div>
  );
};

export default ChatBox;
