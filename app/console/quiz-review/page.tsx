"use client";

import { useEffect, useState } from "react";
import { HelpCircle, CheckCircle2, XCircle, RotateCcw, Bookmark, History, BarChart3 } from "lucide-react";

interface Question { id: string; topic: string; prompt: string; options: string[]; answer: number; explanation: string; }

const QUIZ: Question[] = [
  { id: "q1", topic: "Injection", prompt: "Which defense best prevents SQL injection?", options: ["Escape HTML", "Parameterized queries", "Disable JS", "Use GET"], answer: 1, explanation: "Parameterized queries keep code and data separate so input can never be executed as SQL." },
  { id: "q2", topic: "Cryptography", prompt: "Which is a memory-hard password hash?", options: ["MD5", "SHA-1", "Argon2", "Base64"], answer: 2, explanation: "Argon2 is designed to be slow and memory-intensive, resisting brute force." },
  { id: "q3", topic: "XSS", prompt: "What mitigates stored XSS?", options: ["CSP + output encoding", "Longer passwords", "Faster servers", "More cookies"], answer: 0, explanation: "Content-Security-Policy and correct output encoding stop injected scripts from running." },
  { id: "q4", topic: "Access Control", prompt: "IDOR is mitigated by?", options: ["CAPTCHA", "Per-object authorization", "Bigger tokens", "HTTPS only"], answer: 1, explanation: "Each request must re-check that the user owns the referenced object." },
  { id: "q5", topic: "Network", prompt: "What does a VPN primarily provide?", options: ["Faster Wi-Fi", "Encrypted tunnel", "Free DNS", "Antivirus"], answer: 1, explanation: "A VPN encrypts traffic between client and gateway over an untrusted network." },
];

interface Attempt { date: string; score: number; total: number; }

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate local value after mount
      if (raw) setValue(JSON.parse(raw) as T);
    } catch { /* ignore */ }
  }, [key]);
  const update = (next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try { localStorage.setItem(key, JSON.stringify(resolved)); } catch { /* ignore */ }
      return resolved;
    });
  };
  return [value, update] as const;
}

function todayKey() { return new Date().toISOString().slice(0, 10); }

export default function QuizReviewPage() {
  const [bookmarks, setBookmarks] = useLocalStorage<string[]>("secdev.quiz.bookmarks", []);
  const [history, setHistory] = useLocalStorage<Attempt[]>("secdev.quiz.history", []);

  const [questions, setQuestions] = useState<Question[]>(QUIZ);
  const [phase, setPhase] = useState<"taking" | "review">("taking");
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const select = (id: string, i: number) => setAnswers((p) => ({ ...p, [id]: i }));
  const toggleBookmark = (id: string) =>
    setBookmarks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = () => {
    const score = questions.filter((q) => answers[q.id] === q.answer).length;
    setHistory((p) => [...p, { date: todayKey(), score, total: questions.length }]);
    setPhase("review");
  };

  const retryIncorrect = () => {
    const wrong = QUIZ.filter((q) => answers[q.id] !== q.answer);
    setQuestions(wrong.length > 0 ? wrong : QUIZ);
    setAnswers({});
    setPhase("taking");
  };

  const restart = () => { setQuestions(QUIZ); setAnswers({}); setPhase("taking"); };

  const score = phase === "review" ? questions.filter((q) => answers[q.id] === q.answer).length : 0;
  const pct = phase === "review" && questions.length ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="w-6 h-6" /> Security Quiz Review
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Answer, then review correct answers and explanations.</p>
        </div>
        {phase === "review" && (
          <button onClick={restart} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            <RotateCcw className="w-4 h-4" /> Restart
          </button>
        )}
      </div>

      {phase === "review" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Score</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{score}/{questions.length} <span className="text-base font-normal text-gray-400">({pct}%)</span></p>
          </div>
          <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center">
            <button onClick={retryIncorrect} disabled={score === questions.length}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <RotateCcw className="w-4 h-4" /> Retry Incorrect
            </button>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, qi) => {
          const chosen = answers[q.id];
          const isReview = phase === "review";
          return (
            <div key={q.id} className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">{q.topic}</span>
                  <span className="text-xs text-gray-400">#{qi + 1}</span>
                </div>
                <button onClick={() => toggleBookmark(q.id)}
                  className={bookmarks.includes(q.id) ? "text-amber-500" : "text-gray-300 dark:text-zinc-600 hover:text-amber-400"}>
                  <Bookmark className={`w-4 h-4 ${bookmarks.includes(q.id) ? "fill-current" : ""}`} />
                </button>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">{q.prompt}</p>
              <div className="mt-3 space-y-1.5">
                {q.options.map((opt, i) => {
                  const isChosen = chosen === i;
                  const isAnswer = q.answer === i;
                  let cls = "border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800";
                  if (isReview && isAnswer) cls = "border-green-300 dark:border-green-500/40 bg-green-50/40 dark:bg-green-500/5";
                  else if (isReview && isChosen && !isAnswer) cls = "border-red-300 dark:border-red-500/40 bg-red-50/40 dark:bg-red-500/5";
                  return (
                    <button key={i} disabled={isReview} onClick={() => select(q.id, i)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left text-sm transition-colors ${cls} ${isReview ? "cursor-default" : ""}`}>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isChosen ? "border-indigo-500 bg-indigo-500" : "border-gray-300 dark:border-zinc-600"}`}>
                        {isChosen && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <span className="text-gray-700 dark:text-zinc-300">{opt}</span>
                      {isReview && isAnswer && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
                      {isReview && isChosen && !isAnswer && <XCircle className="w-4 h-4 text-red-500 ml-auto" />}
                    </button>
                  );
                })}
              </div>
              {isReview && (
                <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                  <p className="text-xs text-gray-500 dark:text-zinc-400">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {phase === "taking" && (
        <button onClick={submit} disabled={Object.keys(answers).length < questions.length}
          className="w-full py-3 text-sm font-medium text-white bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-gray-900 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          Submit & Review
        </button>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><History className="w-4 h-4 text-gray-400" /> Review History</h2>
          <div className="space-y-1.5">
            {[...history].reverse().map((a, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800">
                <span className="text-xs text-gray-400">{a.date}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{a.score}/{a.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
