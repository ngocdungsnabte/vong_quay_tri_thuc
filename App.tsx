
import React, { useState, useCallback, useMemo } from 'react';
import { processInputData } from './services/geminiService';
import { Student, Question, GameSettings } from './types';
import Wheel from './components/Wheel';
import QuestionPanel from './components/QuestionPanel';
import * as mammoth from "https://esm.sh/mammoth@1.8.0";
import * as pdfjs from "https://esm.sh/pdfjs-dist@4.10.38";

// Cấu hình worker cho PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

const App: React.FC = () => {
  const [phase, setPhase] = useState<'setup' | 'game'>('setup');
  const [loading, setLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  
  // Inputs
  const [lessonText, setLessonText] = useState('');
  const [studentInput, setStudentInput] = useState('');
  const [lessonImages, setLessonImages] = useState<string[]>([]);
  const [studentImages, setStudentImages] = useState<string[]>([]);
  
  // Game State
  const [students, setStudents] = useState<Student[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [settings, setSettings] = useState<GameSettings>({
    showHints: true,
    showCorrectAnswers: true,
    difficulty: 'medium',
    maxQuestions: 15
  });

  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  const availableStudents = useMemo(() => students.filter(s => !s.isParticipated), [students]);

  // Tính toán số lượng học sinh từ input để hiển thị real-time
  const inputStudentCount = useMemo(() => {
    if (!studentInput.trim()) return 0;
    return studentInput
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0 && !n.includes('[---') && !n.includes('---]'))
      .length;
  }, [studentInput]);

  const extractPdfText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => (item as any).str).join(" ");
        fullText += pageText + "\n";
      }
      return fullText;
    } catch (error) {
      console.error("PDF Extraction Error:", error);
      return "[Lỗi trích xuất nội dung PDF]";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'lesson' | 'student') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsProcessingFile(true);
    const fileList: File[] = Array.from(files);

    try {
      for (const file of fileList) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const marker = `\n[--- Đã đính kèm ảnh: ${file.name} ---]\n`;
            if (type === 'lesson') {
              setLessonImages(prev => [...prev, result]);
              setLessonText(prev => prev + marker);
            } else {
              setStudentImages(prev => [...prev, result]);
              setStudentInput(prev => prev + marker);
            }
          };
          reader.readAsDataURL(file);
        } 
        else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          const content = `\n[--- Nội dung từ tệp Word: ${file.name} ---]\n${result.value}\n`;
          if (type === 'lesson') setLessonText(prev => prev + content);
          else setStudentInput(prev => prev + content);
        }
        else if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const extractedText = await extractPdfText(arrayBuffer);
          const content = `\n[--- Nội dung từ tệp PDF: ${file.name} ---]\n${extractedText}\n`;
          if (type === 'lesson') setLessonText(prev => prev + content);
          else setStudentInput(prev => prev + content);
        }
        else {
          const content = await file.text();
          const formattedContent = `\n[--- Nội dung từ tệp văn bản: ${file.name} ---]\n${content}\n`;
          if (type === 'lesson') setLessonText(prev => prev + formattedContent);
          else setStudentInput(prev => prev + formattedContent);
        }
      }
    } catch (error) {
      console.error("File processing error:", error);
      alert("Có lỗi xảy ra khi xử lý tệp. Vui lòng thử lại!");
    } finally {
      setIsProcessingFile(false);
      e.target.value = ''; 
    }
  };

  const handleStartGame = async () => {
    const hasLesson = lessonText.trim() !== '' || lessonImages.length > 0;
    if (!hasLesson) {
      alert("Vui lòng cung cấp nội dung bài học!");
      return;
    }
    
    setLoading(true);
    try {
      const allImages = [...lessonImages, ...studentImages];
      const result = await processInputData(lessonText, studentInput, settings.maxQuestions, allImages);
      
      let rawStudentNames: string[] = [];
      if (studentInput.trim()) {
        rawStudentNames = studentInput
          .split('\n')
          .map(n => n.trim())
          .filter(n => n.length > 0 && !n.includes('[---') && !n.includes('---]'));
      }
      
      result.students.forEach(name => {
        if (!rawStudentNames.includes(name.trim()) && name.trim().length > 0) {
          rawStudentNames.push(name.trim());
        }
      });

      if (rawStudentNames.length === 0) {
        alert("Không tìm thấy danh sách học sinh. Vui lòng nhập tên học sinh!");
        setLoading(false);
        return;
      }

      const formattedStudents: Student[] = rawStudentNames.map((name, i) => ({
        id: `s-${i}-${Date.now()}`,
        name: name,
        isParticipated: false
      }));

      setStudents(formattedStudents);
      setQuestions(result.questions);
      setPhase('game');
    } catch (error: any) {
      console.error(error);
      alert("Lỗi AI: " + (error.message || "Không thể khởi tạo trò chơi."));
    } finally {
      setLoading(false);
    }
  };

  const handleSpinStart = () => {
    if (availableStudents.length === 0) return;
    if (questions.length === 0) {
        alert("Đã hết câu hỏi ôn tập!");
        return;
    }
    setSelectedStudent(null);
    setCurrentQuestion(null);
    setIsSpinning(true);
  };

  const handleSpinEnd = (student: Student) => {
    setIsSpinning(false);
    setSelectedStudent(student);
    if (questions.length > 0) {
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
      setCurrentQuestion(randomQuestion);
    }
  };

  const handleAnswerResult = () => {
    if (selectedStudent) {
      setStudents(prev => prev.map(s => 
        s.id === selectedStudent.id ? { ...s, isParticipated: true } : s
      ));
    }
    if (currentQuestion) {
      setQuestions(prev => prev.filter(q => q.id !== currentQuestion.id));
    }
    setSelectedStudent(null);
    setCurrentQuestion(null);
  };

  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-5xl bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-indigo-600 p-8 text-white text-center relative">
            <h1 className="text-4xl font-black mb-2 tracking-tight uppercase">VÒNG QUAY TRI THỨC 🎡</h1>
            <p className="text-indigo-100 text-lg opacity-90">Hệ thống ôn tập Tin học 10 tích hợp AI</p>
            {isProcessingFile && (
              <div className="absolute top-2 right-4 bg-yellow-400 text-indigo-900 text-[10px] font-black px-3 py-1 rounded-full animate-bounce">
                ĐANG XỬ LÝ FILE...
              </div>
            )}
          </div>

          <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <span className="bg-indigo-100 text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center mr-3 shadow-sm">1</span> 
                Nội dung ôn tập
              </h2>
              <textarea 
                placeholder="Nhập nội dung bài học hoặc tải tệp lên. AI sẽ tự động trích xuất kiến thức để tạo câu hỏi..."
                className="w-full h-56 p-5 border-2 border-gray-100 rounded-3xl focus:border-indigo-500 transition-all outline-none resize-none text-base leading-relaxed"
                value={lessonText}
                onChange={(e) => setLessonText(e.target.value)}
              />
              <div className="relative group">
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,.txt,.docx,.pdf" 
                  onChange={(e) => handleFileUpload(e, 'lesson')} 
                  className="block w-full text-sm text-gray-500 file:py-3 file:px-6 file:rounded-full file:bg-indigo-100 file:text-indigo-700 file:font-black file:border-0 cursor-pointer file:cursor-pointer hover:file:bg-indigo-200 transition-all" 
                />
                <p className="text-xs text-gray-400 mt-2 ml-2 italic font-medium">* Hỗ trợ PDF, Word, Ảnh (Chụp trang sách), Text</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <span className="bg-purple-100 text-purple-600 w-10 h-10 rounded-xl flex items-center justify-center mr-3 shadow-sm">2</span> 
                Danh sách học sinh tham gia <span className="ml-2 text-indigo-600 text-lg font-black bg-indigo-50 px-3 py-1 rounded-xl">({inputStudentCount})</span>
              </h2>
              <textarea 
                placeholder="Nhập tên các học sinh (mỗi người một dòng) hoặc tải danh sách tệp lên..."
                className="w-full h-56 p-5 border-2 border-gray-100 rounded-3xl focus:border-purple-500 transition-all outline-none resize-none text-base leading-relaxed"
                value={studentInput}
                onChange={(e) => setStudentInput(e.target.value)}
              />
              <div className="relative group">
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,.txt,.docx,.pdf" 
                  onChange={(e) => handleFileUpload(e, 'student')} 
                  className="block w-full text-sm text-gray-500 file:py-3 file:px-6 file:rounded-full file:bg-purple-100 file:text-purple-700 file:font-black file:border-0 cursor-pointer file:cursor-pointer hover:file:bg-purple-200 transition-all" 
                />
                <p className="text-xs text-gray-400 mt-2 ml-2 italic font-medium">* Hỗ trợ danh sách tệp hoặc ảnh chụp danh sách lớp</p>
              </div>
            </div>
          </div>

          <div className="px-10 pb-6">
            <div className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
               <div className="flex items-center space-x-4">
                 <div className="bg-white p-3 rounded-2xl shadow-sm text-3xl">🧠</div>
                 <div>
                   <p className="font-black text-gray-800 text-lg">Số lượng câu hỏi AI</p>
                   <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Tối đa 50 câu cho mỗi lượt ôn tập</p>
                 </div>
               </div>
               <div className="flex items-center space-x-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm scale-110">
                 <button 
                  onClick={() => setSettings(prev => ({...prev, maxQuestions: Math.max(1, prev.maxQuestions - 1)}))}
                  className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all font-black text-xl cursor-pointer"
                 >-</button>
                 <input 
                  type="number" 
                  value={settings.maxQuestions}
                  onChange={(e) => setSettings(prev => ({...prev, maxQuestions: parseInt(e.target.value) || 1}))}
                  className="w-14 text-center font-black text-indigo-600 outline-none text-xl"
                 />
                 <button 
                  onClick={() => setSettings(prev => ({...prev, maxQuestions: Math.min(50, prev.maxQuestions + 1)}))}
                  className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-all font-black text-xl cursor-pointer"
                 >+</button>
               </div>
            </div>
          </div>

          <div className="p-10 pt-0">
             <button 
              onClick={handleStartGame} 
              disabled={loading || isProcessingFile} 
              className={`w-full py-6 rounded-3xl text-white font-black text-2xl transition-all active:scale-95 cursor-pointer shadow-2xl ${loading || isProcessingFile ? 'bg-gray-400 cursor-wait' : 'bg-gradient-to-r from-indigo-600 to-indigo-800 hover:brightness-110 shadow-indigo-200'}`}
            >
              {loading ? "AI ĐANG SOẠN CÂU HỎI..." : isProcessingFile ? "ĐANG XỬ LÝ DỮ LIỆU TỆP..." : "BẮT ĐẦU NGAY 🚀"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-2 md:p-4 bg-gradient-to-br from-indigo-950 via-purple-950 to-black overflow-hidden">
      <header className="flex justify-between items-center mb-2 shrink-0 h-12">
        <button onClick={() => setPhase('setup')} className="bg-white/10 text-white px-4 py-1.5 rounded-xl text-xs font-black backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all flex items-center cursor-pointer shadow-lg h-full">
          <span className="mr-2">←</span> CÀI ĐẶT
        </button>
        <div className="flex-1 px-4 flex justify-end h-full">
          <div className="bg-indigo-600/90 text-white px-4 py-1 rounded-full text-[10px] md:text-xs font-black shadow-xl backdrop-blur-md flex items-center space-x-3 md:space-x-5 border border-white/10 h-full">
            <span className="flex items-center"><span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse"></span>LỚP: {students.length}</span>
            <span className="opacity-30 font-thin">|</span>
            <span>HS CHƯA QUAY: {availableStudents.length}</span>
            <span className="opacity-30 font-thin">|</span>
            <span className="text-yellow-400 uppercase">CÂU HỎI: {questions.length}</span>
          </div>
        </div>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-center overflow-hidden min-h-0 py-2">
        <div className="lg:col-span-5 flex flex-col items-center justify-center h-full relative">
           {availableStudents.length > 0 ? (
             <div className="flex flex-col items-center justify-center h-full w-full">
               <h1 className="text-2xl md:text-4xl lg:text-4xl font-black text-yellow-400 uppercase tracking-tighter text-center mb-4 drop-shadow-lg animate-in fade-in slide-in-from-top-4 duration-700 whitespace-nowrap">
                 VÒNG QUAY TRI THỨC
               </h1>
               <div className="scale-75 md:scale-90 lg:scale-100 transition-transform duration-500">
                 <Wheel students={availableStudents} spinning={isSpinning} onSpinEnd={handleSpinEnd} />
               </div>
               <button
                disabled={isSpinning || !!selectedStudent || questions.length === 0}
                onClick={handleSpinStart}
                className={`mt-6 px-12 py-4 rounded-full text-2xl font-black shadow-2xl transition-all transform active:scale-95 border-b-8 cursor-pointer
                  ${(isSpinning || !!selectedStudent || questions.length === 0) ? 'bg-gray-600 border-gray-800 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-orange-700 hover:-translate-y-1 hover:brightness-110'}
                `}
              >
                {isSpinning ? "ĐANG QUAY..." : questions.length === 0 ? "HẾT CÂU HỎI" : "QUAY NGAY! 🎡"}
              </button>
             </div>
           ) : (
              <div className="text-center p-8 bg-white/5 rounded-[3rem] border border-white/10 backdrop-blur-xl animate-in fade-in zoom-in duration-700 shadow-2xl">
                 <div className="text-8xl mb-4 animate-bounce">🏆</div>
                 <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">XUẤT SẮC HOÀN THÀNH!</h2>
                 <p className="text-indigo-200 text-base mb-6 font-bold opacity-80">Tất cả học sinh đã vượt qua các thử thách.</p>
                 <button onClick={() => setPhase('setup')} className="bg-white text-indigo-900 px-8 py-3 rounded-2xl font-black text-lg hover:bg-indigo-50 transition-all shadow-2xl cursor-pointer active:scale-95">BẮT ĐẦU MỚI</button>
              </div>
           )}
        </div>

        <div className="lg:col-span-7 h-full flex flex-col min-h-0 overflow-hidden">
          {selectedStudent && currentQuestion ? (
            <QuestionPanel
              studentName={selectedStudent.name}
              question={currentQuestion}
              settings={settings}
              onAnswer={handleAnswerResult}
            />
          ) : (
            <div className={`flex-grow bg-white/5 rounded-[3rem] border-2 border-dashed flex flex-col items-center justify-center text-center p-6 backdrop-blur-md transition-all duration-700 ${questions.length === 0 && availableStudents.length > 0 ? 'border-yellow-400/50 bg-yellow-400/10' : 'border-white/10'}`}>
               <div className={`w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 text-5xl animate-pulse shadow-inner ${questions.length === 0 && availableStudents.length > 0 ? 'text-yellow-400 shadow-yellow-500/20' : 'text-indigo-400 shadow-indigo-500/20'}`}>
                {questions.length === 0 && availableStudents.length > 0 ? "✨" : "🎯"}
               </div>
               
               <h3 className={`uppercase tracking-[0.2em] mb-4 transition-all duration-700 font-black 
                 ${questions.length === 0 && availableStudents.length > 0 
                   ? 'text-3xl text-yellow-400 drop-shadow-lg' 
                   : 'text-2xl text-white/40'}`}>
                 {questions.length === 0 && availableStudents.length > 0 ? "TẢI THÊM NỘI DUNG" : "CHỜ LƯỢT TIẾP THEO"}
               </h3>
               
               <p className={`max-w-md transition-all duration-700 font-bold leading-relaxed
                 ${questions.length === 0 && availableStudents.length > 0 
                   ? 'text-lg text-white opacity-90' 
                   : 'text-sm text-white/30'}`}>
                 {questions.length === 0 && availableStudents.length > 0 
                   ? "Tất cả câu hỏi đã hết. Hãy quay lại phần cài đặt để cập nhật bài học mới!" 
                   : "Vui lòng nhấn QUAY NGAY để bắt đầu ôn tập. Chúc các bạn may mắn!"}
               </p>
               
               {questions.length === 0 && availableStudents.length > 0 && (
                 <button 
                  onClick={() => setPhase('setup')}
                  className="mt-8 bg-yellow-400 text-indigo-950 px-8 py-3 rounded-2xl font-black hover:bg-yellow-500 transition-all active:scale-95 shadow-2xl text-lg cursor-pointer"
                 >
                   SOẠN THÊM CÂU HỎI 📝
                 </button>
               )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
