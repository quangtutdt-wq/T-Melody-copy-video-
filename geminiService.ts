
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, SceneJson } from "./types";

const SYSTEM_INSTRUCTION = (style: string) => {
  const isOriginal = style.includes("video gốc") || style.includes("Original Style");
  const styleDescription = isOriginal 
    ? "mô tả chính xác phong cách nghệ thuật, ánh sáng và chất liệu nguyên bản trích xuất trực tiếp từ video gốc"
    : `áp dụng và mô tả theo phong cách: "${style}"`;

  return `Vai trò: Bạn là chuyên gia phân tích video và kỹ sư tạo prompt cho mô hình tạo video AI (Veo 3). Nhiệm vụ của bạn là xem video đầu vào, phân tách nó thành các đoạn nhỏ (mỗi đoạn đúng 8 giây) và tạo ra các file JSON mô tả kỹ thuật chính xác.

YÊU CẦU QUAN TRỌNG VỀ PHONG CÁCH:
- Toàn bộ video phải được phân tích và ${styleDescription}.
- Trường "visual_style" trong mỗi JSON phải bắt đầu bằng việc xác định phong cách này và mở rộng chi tiết kỹ thuật phù hợp.

Quy trình xử lý:
1. Phân đoạn: Chia video thành các segment liên tiếp, mỗi segment dài đúng 8 giây.
2. Phân tích: Quan sát kỹ lưỡng từng khung hình. Chỉ mô tả những gì nhìn thấy và nghe thấy qua lăng kính phong cách yêu cầu.
3. Giữ nhất quán (Consistency): Đặt ID cố định cho nhân vật (CHAR_1, CHAR_2) và bối cảnh (BACKGROUND_1).
4. Định dạng đầu ra:
   - MỖI SCENE PHẢI LÀ MỘT DÒNG JSON DUY NHẤT (VIẾT LIỀN).
   - CÁCH NHAU BỞI MỘT DÒNG TRỐNG GIỮA CÁC SCENE.
`;
};

const GET_USER_PROMPT = (style: string, lastSceneId: number = 0) => {
  const isOriginal = style.includes("video gốc") || style.includes("Original Style");
  const startInstruction = lastSceneId > 0 
    ? `Tiếp tục phân tích từ Scene ${lastSceneId + 1}. Hãy bỏ qua các scene trước đó.`
    : `Bắt đầu phân tích từ Scene 1 (0s).`;

  const styleAction = isOriginal
    ? "phân tích và giữ nguyên phong cách hình ảnh nguyên bản của video"
    : `tái hiện lại nội dung video này theo phong cách "${style}"`;

  return `${startInstruction} Hãy ${styleAction}. Xuất ra JSON theo cấu trúc sau (ĐẢM BẢO MỖI JSON LÀ 1 DÒNG DUY NHẤT).

Mẫu JSON bắt buộc (VIẾT LIỀN TRÊN 1 DÒNG):
{"scene_id":"[Số]","duration_sec":"8","visual_style":"[Mô tả chi tiết Lighting, Shading, Texture...]","character_lock":{"CHAR_1":{"id":"CHAR_1","name":"[Tên]","species":"[Loài]","gender":"[Giới tính]","age":"[Tuổi]","voice_personality":"[Tính cách]","body_build":"[Dáng]","face_shape":"[Mặt]","hair":"[Tóc]","skin_or_fur_color":"[Màu]","signature_feature":"[Đặc điểm]","outfit_top":"[Áo]","outfit_bottom":"[Quần]","helmet_or_hat":"[Mũ]","shoes_or_footwear":"[Giày]","props":"[Đạo cụ]","body_metrics":"u=cm; abs.height=[Height]; cons=no-auto-rescale,lock-proportions","position":"[Vị trí]","orientation":"[Hướng]","pose":"[Tư thế]","foot_placement":"[Chân]","hand_detail":"[Tay]","expression":"[Biểu cảm]","action_flow":{"pre_action":"[Bắt đầu]","main_action":"[Chính]","post_action":"[Kết thúc]"}}},"background_lock":{"BACKGROUND_1":{"id":"BACKGROUND_1","name":"[Bối cảnh]","setting":"[Indoor/Outdoor]","scenery":"[Mô tả]","props":"[Đồ vật]","lighting":"[Ánh sáng]"}},"camera":{"framing":"[Size]","angle":"[Góc]","movement":"[Chuyển động]","focus":"[Tiêu điểm]"},"foley_and_ambience":{"ambience":["[Âm thanh]"],"fx":["[Hiệu ứng]"],"music":"[Nhạc]"},"dialogue":[{"speaker":"CHAR_1","voice":"[Giọng]","language":"vi-VN","line":"[Lời]"}],"lip_sync_director_note":"[Ghi chú]"}`;
};

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function analyzeVideo(file: File, style: string, apiKey: string, model: string, lastSceneId: number = 0): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({ apiKey });
  
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const base64Data = encode(bytes);

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        { inlineData: { mimeType: file.type, data: base64Data } },
        { text: GET_USER_PROMPT(style, lastSceneId) }
      ]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION(style),
      temperature: 0.1,
    }
  });

  const rawText = response.text || "";
  const scenes: SceneJson[] = [];
  
  const lines = rawText.split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.scene_id) {
          scenes.push(parsed as SceneJson);
        }
      } catch (e) {
        const match = trimmed.match(/\{.*\}/);
        if (match) {
          try {
            const parsedMatch = JSON.parse(match[0]);
            if (parsedMatch.scene_id) scenes.push(parsedMatch);
          } catch(e2) {}
        }
      }
    }
  });

  return {
    raw: rawText,
    scenes: scenes
  };
}
