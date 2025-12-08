// src/components/QuizViewer.tsx
import React, { useState } from "react";

interface Q {
  question: string;
  options?: string[];
  correct_option?: string; // "A" / "B" / ...
  explanation?: string;
}

const QuizViewer: React.FC<{ quiz: Q[]; onClose?: () => void }> = ({
  quiz,
  onClose,
}) => {
  // selectedAnswers[index] = "A" | "B" | ...
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>(
    {}
  );
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const handleSelect = (qIndex: number, optionIndex: number) => {
    if (submitted) return; // lock answers after submit
    const letter = String.fromCharCode(65 + optionIndex); // 65 = "A"
    setSelectedAnswers((prev) => ({ ...prev, [qIndex]: letter }));
  };

  const handleSubmit = () => {
    if (submitted) return;
    if (!quiz.length) return;

    let correctCount = 0;

    quiz.forEach((q, idx) => {
      const correct = (q.correct_option || "").toUpperCase().trim();
      const chosen = (selectedAnswers[idx] || "").toUpperCase().trim();
      if (correct && chosen && correct === chosen) {
        correctCount += 1;
      }
    });

    setScore(correctCount);
    setSubmitted(true);
  };

  const total = quiz.length;
  const unanswered =
    total -
    Object.values(selectedAnswers).filter((v) => v && v.trim().length > 0)
      .length;

  return (
    <div
      className="p-4 rounded-2xl
                 bg-white/5 text-purple-50
                 border border-white/10
                 shadow-[0_14px_40px_rgba(0,0,0,0.6)]"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-purple-50">
            Generated Quiz
          </h3>

          {submitted && score !== null && (
            <p className="text-sm text-purple-100/90">
              Score:{" "}
              <span className="font-semibold text-pink-300">
                {score} / {total}
              </span>
            </p>
          )}

          {!submitted && (
            <p className="text-xs text-purple-200/80">
              Select your answers and click{" "}
              <strong className="text-pink-200">Submit Quiz</strong>.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!submitted && (
            <button
              onClick={handleSubmit}
              className="px-3 py-2 rounded-full text-sm font-medium
                         bg-gradient-to-r from-emerald-500 to-emerald-400
                         hover:brightness-110 text-white
                         shadow-[0_10px_25px_rgba(16,185,129,0.45)]
                         disabled:opacity-60"
              disabled={!quiz.length}
            >
              Submit Quiz
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-sm text-purple-200 hover:text-white transition"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Optional warning if many unanswered */}
      {!submitted && unanswered > 0 && (
        <p className="mb-3 text-xs text-amber-300">
          You have {unanswered} unanswered question
          {unanswered > 1 ? "s" : ""}.
        </p>
      )}

      {/* Questions */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {quiz.map((q, i) => {
          const correct = (q.correct_option || "").toUpperCase().trim();
          const selected = (selectedAnswers[i] || "").toUpperCase().trim();

          return (
            <div
              key={i}
              className="p-3 rounded-xl border
                         border-white/12 bg-white/5"
            >
              <div className="font-medium mb-2 text-purple-50">
                {i + 1}. {q.question}
              </div>

              {/* Options */}
              {q.options && q.options.length > 0 && (
                <ul className="mt-1 space-y-1 text-sm">
                  {q.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx); // A, B, C...
                    const isSelected = selected === letter;
                    const isCorrect = correct === letter;

                    // style based on submission state
                    let optionClasses =
                      "flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer transition text-sm";

                    if (!submitted) {
                      optionClasses +=
                        " bg-white/5 hover:bg-white/10 border border-transparent";
                      if (isSelected) {
                        optionClasses +=
                          " border-pink-400/70 bg-pink-500/10";
                      }
                    } else {
                      // after submit: color by correctness
                      if (isCorrect) {
                        optionClasses +=
                          " bg-emerald-500/20 text-emerald-100 border border-emerald-400/60";
                      } else if (isSelected && !isCorrect) {
                        optionClasses +=
                          " bg-red-500/20 text-red-100 border border-red-400/60";
                      } else {
                        optionClasses +=
                          " bg-white/5 text-purple-50 border border-transparent";
                      }
                    }

                    return (
                      <li
                        key={idx}
                        className={optionClasses}
                        onClick={() => handleSelect(i, idx)}
                      >
                        {/* Radio indicator */}
                        <input
                          type="radio"
                          name={`q-${i}`}
                          checked={isSelected}
                          onChange={() => handleSelect(i, idx)}
                          className="accent-pink-400"
                          disabled={submitted}
                        />
                        <span className="font-semibold">{letter}.</span>
                        <span>{opt}</span>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Feedback – only after submit */}
              {submitted && (
                <div className="mt-2 space-y-1 text-xs">
                  {correct && (
                    <div className="text-emerald-300">
                      Correct answer: <strong>{correct}</strong>
                    </div>
                  )}
                  {q.explanation && (
                    <div className="text-purple-200/80">
                      Explanation: {q.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuizViewer;
