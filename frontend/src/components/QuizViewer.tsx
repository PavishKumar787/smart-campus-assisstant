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
      className="p-4 rounded shadow
                 bg-white text-slate-900
                 dark:bg-slate-900 dark:text-slate-100"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Generated Quiz</h3>
          {submitted && score !== null && (
            <p className="text-sm">
              Score:{" "}
              <span className="font-semibold">
                {score} / {total}
              </span>
            </p>
          )}
          {!submitted && (
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Select your answers and click <strong>Submit Quiz</strong>.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!submitted && (
            <button
              onClick={handleSubmit}
              className="px-3 py-2 rounded text-sm
                         bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!quiz.length}
            >
              Submit Quiz
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700
                         dark:text-slate-400 dark:hover:text-slate-200"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Optional warning if many unanswered */}
      {!submitted && unanswered > 0 && (
        <p className="mb-3 text-xs text-amber-500">
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
              className="p-3 border rounded
                         border-slate-200 dark:border-slate-700"
            >
              <div className="font-medium mb-2">
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
                      "flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition";

                    if (!submitted) {
                      optionClasses +=
                        " bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700";
                      if (isSelected) {
                        optionClasses +=
                          " ring-1 ring-blue-500 dark:ring-blue-400";
                      }
                    } else {
                      // after submit: color by correctness
                      if (isCorrect) {
                        optionClasses +=
                          " bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200";
                      } else if (isSelected && !isCorrect) {
                        optionClasses +=
                          " bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200";
                      } else {
                        optionClasses +=
                          " bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100";
                      }
                    }

                    return (
                      <li
                        key={idx}
                        className={optionClasses}
                        onClick={() => handleSelect(i, idx)}
                      >
                        {/* “Checkbox” / radio indicator */}
                        <input
                          type="radio"
                          name={`q-${i}`}
                          checked={isSelected}
                          onChange={() => handleSelect(i, idx)}
                          className="accent-blue-600"
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
                    <div className="text-emerald-600 dark:text-emerald-400">
                      Correct answer: <strong>{correct}</strong>
                    </div>
                  )}
                  {q.explanation && (
                    <div className="text-gray-600 dark:text-slate-400">
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
