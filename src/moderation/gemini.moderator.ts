// src/moderation/gemini.moderator.ts
import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sanitizeHtml from 'sanitize-html';

export type GeminiModerationOutput = {
  status: 'AI_PASSED' | 'AI_WARN' | 'AI_BLOCK';
  risk_score: number; // 0..100
  labels: string[];   // ['sexual_content', 'violence', ...]
  ai_findings: Array<{
    rule: string;
    excerpt?: string;
    reason?: string;
    policy_refs?: string[];
  }>;
  policy_version: string; // e.g. '1.0.0'
  content_hash?: string;   // optional, nếu bạn có sẵn
};

@Injectable()
export class GeminiModerator {
  private readonly logger = new Logger(GeminiModerator.name);
  private readonly modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  private getModel() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Missing GEMINI_API_KEY');
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: this.modelName });
  }

  /** Chuyển HTML -> plain text đơn giản để model bám nội dung, tránh phá cấu trúc */
  private htmlToText(html: string) {
    const clean = sanitizeHtml(html ?? '', { allowedTags: [], allowedAttributes: {} });
    return clean.replace(/\s+/g, ' ').trim();
  }

  /**
   * Chạy kiểm duyệt với danh sách policy (đã lọc ở service khác) và nội dung chương (HTML).
   * Trả về JSON chuẩn GeminiModerationOutput.
   */
  async check({
    chapterTitle,
    chapterHtml,
    policies,             // array< { title, content, mainType, subCategory, effective_from?, effective_to? }>
    policyVersion = '1.0.0',
  }: {
    chapterTitle: string;
    chapterHtml: string;
    policies: Array<{ title: string; content: string; mainType?: string; subCategory?: string }>;
    policyVersion?: string;
  }): Promise<GeminiModerationOutput> {
    const model = this.getModel();
    const plain = this.htmlToText(chapterHtml || '');

    // Gom policy thành 1 block ngắn gọn
    const policyBlock = policies
      .map((p, idx) => `#${idx + 1}: ${p.title}\n${p.content}`)
      .join('\n\n');

    const systemPrompt = `
Bạn là hệ thống kiểm duyệt nội dung truyện dạng văn bản. Hãy đánh giá nội dung theo policy và trả về JSON **HỢP LỆ** duy nhất, KHÔNG thêm giải thích.

YÊU CẦU NGHIÊM NGẶT:
- Chỉ xuất 1 object JSON, không tiền tố/hậu tố/markdown.
- JSON schema:
{
  "status": "AI_PASSED" | "AI_WARN" | "AI_BLOCK",
  "risk_score": number (0..100),
  "labels": string[],
  "ai_findings": [
    { "rule": string, "excerpt": string, "reason": string, "policy_refs": string[] }
  ],
  "policy_version": string
}
Quy ước:
- AI_PASSED: nội dung phù hợp policy.
- AI_WARN: có dấu hiệu rủi ro nhẹ hoặc cần xem xét thủ công.
- AI_BLOCK: vi phạm rõ ràng.

POLICIES (subCategory=posting, status=Active):
${policyBlock}

NỘI DUNG KIỂM DUYỆT:
Tiêu đề: ${chapterTitle}
Văn bản (đã loại HTML): 
${plain}
    `.trim();

    const result = await model.generateContent(systemPrompt);
    const raw =
      typeof (result as any)?.response?.text === 'function'
        ? (result as any).response.text()
        : (result as any)?.response?.text || '';

    // Cố gắng parse JSON an toàn
    const json = this.safeParseJsonObject(raw);
    if (!json) {
      this.logger.error('Gemini moderation: invalid JSON output', raw);
      throw new Error('Invalid moderation output from model');
    }

    // Validate trường tối thiểu
    const output: GeminiModerationOutput = {
      status: ['AI_PASSED', 'AI_WARN', 'AI_BLOCK'].includes(json.status) ? json.status : 'AI_WARN',
      risk_score: this.clampNumber(json.risk_score, 0, 100, 50),
      labels: Array.isArray(json.labels) ? json.labels.map(String) : [],
      ai_findings: Array.isArray(json.ai_findings) ? json.ai_findings : [],
      policy_version: json.policy_version || policyVersion,
      content_hash: json.content_hash,
    };

    return output;
  }

  private clampNumber(v: any, min: number, max: number, fallback: number) {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.max(min, Math.min(max, n));
    return fallback;
  }

  private safeParseJsonObject(s: string) {
    if (!s) return null;
    // Nếu model có bọc ```json ... ```
    const match = s.match(/```json\s*([\s\S]*?)```/i) || s.match(/```([\s\S]*?)```/i);
    const body = match ? match[1] : s;
    try {
      const parsed = JSON.parse(body);
      return typeof parsed === 'object' && parsed && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}
