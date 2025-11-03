export const runtime = "nodejs";

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * translateWithGemini: gọi Gemini và trả về CHỈ phần text (string).
 * - Trả về "__INVALID_TARGET_LANGUAGE__" nếu model trả chuỗi đó.
 * - Ném Error nếu gọi API thất bại (có thêm message chi tiết).
 */
export default async function translateWithGemini(
  text: string,
  targetLang: string
): Promise<string> {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  const genAI = new GoogleGenerativeAI(
    "AIzaSyCzmWfJh9MFA8heDY0OsALx15svezvXxdo"
  );
  console.log("has key:", !!process.env.NEXT_PUBLIC_GEMINI_API_KEY);

  const modelName = "gemini-2.5-flash";
  console.log("has model:", !!process.env.NEXT_PUBLIC_GEMINI_API_MODEL);

  let model;
  try {
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  } catch (err: any) {
    console.error("Failed to get Gemini model:", {
      modelName,
      errName: err?.name,
      errMessage: err?.message,
    });
    throw new Error("Failed to initialize Gemini model");
  }

  const prompt = `
Bạn là dịch giả chuyên nghiệp, chuyên dịch tự nhiên nhưng giữ nguyên phát âm gần giống nguồn cho tên riêng, từ vay mượn.

TARGET_LANGUAGE="${targetLang}"

TRƯỚC KHI DỊCH — VALIDATE:
- Kiểm tra TARGET_LANGUAGE hợp lệ (tên ngôn ngữ tự nhiên/mã ISO như "English", "tiếng Việt", "en", "vi", v.v.).
- Nếu KHÔNG hợp lệ ➜ Trả về: __INVALID__.
- Nếu HỢP LỆ ➜ Tiếp tục.

NHIỆM VỤ DỊCH: Dịch nội dung giữa <> và <> sang TARGET_LANGUAGE CHÍNH XÁC, TUYỆT ĐỐI tuân thủ:

1) GIỮ NGUYÊN, KHÔNG DỊCH:
   - Tên riêng (Naruto → Naruto, giữ phát âm gốc).
   - Địa danh (Konoha → Konoha).
   - Thẻ HTML, biến, URL, hashtag, @mention, mã code.
   - Nếu mơ hồ ➜ Giữ nguyên.

2) ĐẶC BIỆT CHO TỪ VAY MƯỢN/TÊN RIÊNG:
   - Dịch nghĩa nếu cần, nhưng ưu tiên phiên âm gần phát âm gốc (ví dụ: "karaoke" → "ca-ra-o-ke" trong tiếng Việt, giữ âm thanh).
   - Không thay đổi chính tả gốc trừ khi ngôn ngữ đích yêu cầu chuẩn hóa tự nhiên.

3) ĐẦU RA:
   - Giữ cấu trúc, xuống dòng, khoảng trắng, dấu câu, số, HTML như nguồn.
   - Không thêm/bớt/chú thích.

CHỈ XUẤT: Văn bản dịch (với HTML gốc).

<>
${text}
<>
`.trim();
  try {
    const result = await model.generateContent(prompt);

    // Lấy text an toàn (tùy SDK)
    const out =
      (typeof result?.response?.text === "function"
        ? result.response.text()
        : result?.response?.text) ?? "";

    // đảm bảo là string
    const outStr = String(out ?? "");

    return outStr;
  } catch (err: any) {
    // Log có ích để debug - KHÔNG log API key
    console.error("Gemini API call failed:", {
      modelName,
      name: err?.name,
      message: err?.message,
      status: err?.status ?? err?.response?.status,
      body: err?.response?.body ?? err?.response?.data,
      stack: err?.stack,
    });

    // Nếu backend trả status 404 => báo model/endpoint sai
    const status = err?.status ?? err?.response?.status;
    if (status === 404) {
      throw new Error(
        "Gemini API returned 404 — có thể model id sai hoặc endpoint thay đổi."
      );
    }

    throw new Error("Gemini API error: " + (err?.message ?? "unknown"));
  }
}
