
import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionType } from "../types";

export async function processInputData(
  lessonText: string, 
  studentText: string,
  numQuestions: number = 15,
  images: string[] = []
): Promise<{ questions: Question[], students: string[] }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Bạn là một chuyên gia sư phạm Tin học 10. 
    Nhiệm vụ: Phân tích nội dung bài học và danh sách học sinh để tạo bộ câu hỏi ôn tập trắc nghiệm.

    YÊU CẦU DỮ LIỆU:
    1. "students": Trích xuất họ tên học sinh từ văn bản và hình ảnh.
    2. "questions": Tạo đúng ${numQuestions} câu hỏi TRẮC NGHIỆM (multiple_choice).
       - Mỗi câu hỏi BẮT BUỘC có đúng 4 lựa chọn (A, B, C, D).
       - Nội dung: Tin học 10 (Sách Kết nối tri thức).
       - Cấu trúc JSON: id, text, type (luôn là "multiple_choice"), options (mảng 4 chuỗi), answer (phải khớp chính xác với 1 trong 4 options), hint, explanation.

    Lưu ý: Chỉ trả về JSON. Không giải thích thêm.
  `;

  const contents: any = { 
    parts: [
      { text: prompt }, 
      { text: `NỘI DUNG BÀI HỌC: ${lessonText || "Trống"}` },
      { text: `DANH SÁCH HỌC SINH: ${studentText || "Trống"}` }
    ] 
  };
  
  images.forEach((img) => {
    contents.parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: img.split(',')[1]
      }
    });
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            students: { type: Type.ARRAY, items: { type: Type.STRING } },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  type: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  answer: { type: Type.STRING },
                  hint: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["id", "text", "type", "options", "answer", "hint", "explanation"]
              }
            }
          },
          required: ["questions", "students"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      questions: result.questions || [],
      students: result.students || []
    };
  } catch (e) {
    console.error("Gemini Error:", e);
    throw new Error("Lỗi xử lý dữ liệu từ AI.");
  }
}
