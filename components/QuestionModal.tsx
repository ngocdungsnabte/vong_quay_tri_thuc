
import React, { useState, useEffect } from 'react';
import { Question, QuestionType, GameSettings } from '../types';

interface QuestionModalProps {
  studentName: string;
  question: Question;
  settings: GameSettings;
  onAnswer: (isCorrect: boolean) => void;
}

const QuestionModal: React.FC<QuestionModalProps> = ({ studentName, question, settings, onAnswer }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean, text: string } | null>(null);

  const handleOptionClick = (opt: string) => {
    if (isAnswered) return;
    setSelectedOption(opt);
  };

  const handleSubmit = () => {
    if (question.type === QuestionType.MULTIPLE_CHOICE || question.type === QuestionType.TRUE_FALSE) {
      if (!selectedOption) return;
      const isCorrect = selectedOption.toLowerCase() === question.answer.toLowerCase();
      setIsAnswered(true);
      setFeedback({
        correct: isCorrect,
        text: isCorrect ? "Tuyệt vời! Bạn trả lời đúng rồi." : `Tiếc quá! Đáp án đúng là: ${question.answer}`
      });
      playFeedbackSound(isCorrect);
    } else {
      // For open-ended/fill-blank, teacher usually evaluates
      setIsAnswered(true);
      setFeedback({
        correct: true,
        text: `Hãy so sánh với đáp án: ${question.answer}`
      });
    }
  };

  const playFeedbackSound = (correct: boolean) => {
    const audio = new Audio(correct 
      ? 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3' // Success
      : 'https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3' // Fail
    );
    audio.play().catch(e => console.log("Audio play blocked"));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 overflow-y-auto max-h-[90vh] animate-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-indigo-700">Lượt của: {studentName} 🎯</h2>
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                {question.type === QuestionType.MULTIPLE_CHOICE ? "Trắc nghiệm" : 
                 question.type === QuestionType.SCENARIO ? "Tình huống" : "Ôn tập"}
            </span>
        </div>

        <p className="text-xl text-gray-800 mb-8 leading-relaxed font-medium">
          {question.text}
        </p>

        {question.options && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {question.options.map((opt, idx) => (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleOptionClick(opt)}
                className={`p-4 rounded-xl border-2 transition-all text-left flex items-start space-x-3
                  ${selectedOption === opt ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}
                  ${isAnswered && opt.toLowerCase() === question.answer.toLowerCase() ? 'border-green-500 bg-green-50' : ''}
                  ${isAnswered && selectedOption === opt && opt.toLowerCase() !== question.answer.toLowerCase() ? 'border-red-500 bg-red-50' : ''}
                `}
              >
                <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold">
                    {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-gray-700">{opt}</span>
              </button>
            ))}
          </div>
        )}

        {!isAnswered ? (
          <div className="flex flex-col space-y-4">
             {settings.showHints && (
                <button 
                  onClick={() => setShowHint(true)}
                  className="text-indigo-600 font-semibold underline decoration-dotted underline-offset-4"
                >
                    {showHint ? `Gợi ý: ${question.hint}` : "Xem gợi ý?"}
                </button>
             )}
             <button
               onClick={handleSubmit}
               className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/50"
             >
               Kiểm tra đáp án
             </button>
          </div>
        ) : (
          <div className="space-y-6">
             <div className={`p-6 rounded-2xl ${feedback?.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <p className="text-lg font-bold mb-2">{feedback?.text}</p>
                <p className="text-sm italic opacity-80">{question.explanation}</p>
             </div>
             <button
               onClick={() => onAnswer(feedback?.correct ?? false)}
               className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 rounded-xl transition-all"
             >
               Tiếp tục lượt mới
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionModal;
