
import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, GameSettings } from '../types';

interface QuestionPanelProps {
  studentName: string;
  question: Question;
  settings: GameSettings;
  onAnswer: (isCorrect: boolean) => void;
}

const QuestionPanel: React.FC<QuestionPanelProps> = ({ studentName, question, settings, onAnswer }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [feedback, setFeedback] = useState<{ correct: boolean, text: string, type: 'success' | 'warning' | 'error' } | null>(null);
  const [attemptedOptions, setAttemptedOptions] = useState<string[]>([]);
  
  const timerRef = useRef<number | null>(null);
  const alarmSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1084/1084-preview.mp3'));

  useEffect(() => {
    setTimeLeft(30);
    setWrongAttempts(0);
    setAttemptedOptions([]);
    setFeedback(null);
    setIsAnswered(false);
    setSelectedOption(null);
    setShowHint(false);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      alarmSound.current.pause();
    };
  }, [question]);

  useEffect(() => {
    if (timeLeft > 0 && !isAnswered) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          if (newTime <= 5 && newTime >= 0) {
            alarmSound.current.currentTime = 0;
            alarmSound.current.volume = 0.5;
            alarmSound.current.play().catch(() => {});
          }
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0 && !isAnswered) {
      setIsAnswered(true);
      setFeedback({ correct: false, text: "Hết thời gian! ⏰ Đáp án đúng là: " + question.answer, type: 'error' });
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, isAnswered]);

  const handleSubmit = () => {
    if (isAnswered || !selectedOption) return;
    
    const isCorrect = selectedOption.toLowerCase() === question.answer.toLowerCase();

    if (isCorrect) {
      setIsAnswered(true);
      setFeedback({ correct: true, text: "Chính xác! ✅", type: 'success' });
      playFeedbackSound(true);
    } else {
      const newWrongAttempts = wrongAttempts + 1;
      setWrongAttempts(newWrongAttempts);
      setAttemptedOptions(prev => [...prev, selectedOption]);

      if (newWrongAttempts < 2) {
        setFeedback({ correct: false, text: "Chưa đúng! Còn 1 cơ hội nữa. 💡", type: 'warning' });
        setSelectedOption(null);
        playFeedbackSound(false);
      } else {
        setIsAnswered(true);
        setFeedback({ correct: false, text: `Rất tiếc! Đáp án đúng là: ${question.answer}`, type: 'error' });
        playFeedbackSound(false);
      }
    }
  };

  const playFeedbackSound = (correct: boolean) => {
    const audio = new Audio(correct 
      ? 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3' 
      : 'https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3' 
    );
    audio.play().catch(() => {});
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full h-full flex flex-col p-4 md:p-5 overflow-hidden border border-white/20 animate-in slide-in-from-right-8 duration-500">
      <div className="flex justify-between items-center mb-2 shrink-0 border-b border-gray-50 pb-2">
        <div>
          <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-0.5">Học sinh đang trả lời</p>
          <h2 className="text-xl md:text-2xl font-black text-gray-800 leading-none">{studentName} 🎯</h2>
        </div>
        <div className="flex items-center space-x-2">
           <div className={`px-2.5 py-1 rounded-xl font-black text-sm md:text-base transition-all shadow-sm ${timeLeft <= 5 ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-200' : 'bg-gray-100 text-gray-700'}`}>
             ⏱️ {timeLeft}s
           </div>
           <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider">TRẮC NGHIỆM</span>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-indigo-100 py-1">
        <div className="bg-indigo-50/50 p-4 md:p-5 rounded-2xl border border-indigo-100 shadow-sm">
          <p className="text-2xl md:text-3xl text-gray-900 font-bold leading-tight">
            {question.text}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {question.options?.map((opt, idx) => {
            const isCorrectOpt = opt.toLowerCase() === question.answer.toLowerCase();
            const isWrongAlready = attemptedOptions.includes(opt);
            const isSelected = selectedOption === opt;
            
            let btnClass = "border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/20";
            if (isSelected) btnClass = "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-50";
            if (isAnswered && isCorrectOpt) btnClass = "border-green-500 bg-green-50 ring-2 ring-green-50";
            if (isWrongAlready) btnClass = "border-red-50 bg-red-50/50 opacity-40";

            return (
              <button
                key={idx}
                disabled={isAnswered || isWrongAlready}
                onClick={() => setSelectedOption(opt)}
                className={`p-3 md:p-4 rounded-xl border-2 transition-all text-left flex items-center space-x-3 text-xl md:text-2xl ${btnClass} cursor-pointer`}
              >
                <span className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-lg font-black text-base
                  ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}
                  ${isAnswered && isCorrectOpt ? 'bg-green-600 text-white' : ''}
                  ${isWrongAlready ? 'bg-red-400 text-white' : ''}
                `}>
                    {String.fromCharCode(65 + idx)}
                </span>
                <span className={`font-semibold text-gray-700 leading-snug break-words`}>{opt}</span>
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className={`p-3 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-400 ${feedback.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : feedback.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            <p className="font-black mb-0.5 text-base md:text-lg">
               {feedback.type === 'success' ? '🌟 Chính xác!' : feedback.type === 'warning' ? '💡 Thử lại nào' : '❌ Sai mất rồi'}
            </p>
            <p className="font-bold text-[13px] md:text-sm leading-relaxed">{feedback.text}</p>
            {isAnswered && (
              <div className="mt-1.5 pt-1.5 border-t border-black/5">
                <p className="text-[11px] md:text-xs italic opacity-90 leading-relaxed font-medium">Giải thích: {question.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100 shrink-0">
        {!isAnswered ? (
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center px-1">
               <button onClick={() => setShowHint(true)} className="text-indigo-600 font-black text-[9px] md:text-[10px] uppercase underline underline-offset-4 cursor-pointer hover:text-indigo-800 transition-colors">
                 {showHint ? `Gợi ý: ${question.hint}` : "✨ Xem gợi ý?"}
               </button>
               {wrongAttempts === 1 && <span className="text-red-500 text-[8px] md:text-[9px] font-black uppercase bg-red-100 px-2 py-0.5 rounded-lg border border-red-200">⚠️ Lần cuối</span>}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!selectedOption}
              className={`w-full py-3 md:py-4 rounded-2xl text-white font-black text-lg md:text-xl transition-all shadow-lg cursor-pointer
                ${!selectedOption ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-100'}
              `}
            >
              CHỐT ĐÁP ÁN 📝
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAnswer(feedback?.correct ?? false)}
            className="w-full bg-gray-900 hover:bg-black text-white font-black py-3 md:py-4 rounded-2xl text-lg md:text-xl transition-all active:scale-95 shadow-xl cursor-pointer"
          >
            TIẾP TỤC VÒNG QUAY 🎡
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionPanel;
