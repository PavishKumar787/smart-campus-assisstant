// src/components/QuizViewer.tsx
import React from "react";

interface Option {
  label: string;
  text: string;
}

interface Q {
  question: string;
  options?: string[]; // A-D
  correct_option?: string; // 'A' etc
  explanation?: string;
}

const QuizViewer: React.FC<{ quiz: Q[]; onClose?: () => void }> = ({ quiz, onClose }) => {
  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">Generated Quiz</h3>
        <div>
          {onClose && <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Close</button>}
        </div>
      </div>
      <div className="space-y-4">
        {quiz.map((q, i) => (
          <div key={i} className="p-3 border rounded">
            <div className="font-medium">{i + 1}. {q.question}</div>
            {q.options && q.options.length > 0 && (
              <ul className="mt-2 list-disc list-inside text-sm">
                {q.options.map((opt, idx) => (
                  <li key={idx}>{String.fromCharCode(65 + idx)}. {opt}</li>
                ))}
              </ul>
            )}
            {q.explanation && <div className="mt-2 text-xs text-gray-600">Explanation: {q.explanation}</div>}
            {q.correct_option && <div className="mt-1 text-xs text-green-600">Correct: {q.correct_option}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuizViewer;
