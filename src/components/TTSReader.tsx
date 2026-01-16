"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

type Props = { text: string };

export default function TTSReader({ text }: Props) {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceIndex, setVoiceIndex] = useState<number>(0);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // 1. Thêm state loading
  const [cleanText, setCleanText] = useState<string>(""); // Bắt đầu rỗng
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // === Load danh sách giọng nói ===
  useEffect(() => {
    if (!synth) return;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.onvoiceschanged = load;
  }, [synth]);

  // === Helper: Chia nhỏ text theo câu ===
  // (Lấy logic từ useMemo ra hàm riêng)
  const getChunks = (textToChunk: string) => {
    if (!textToChunk) return [];
    return textToChunk
      .replace(/\s+/g, " ")
      .split(/([.!?…]+)\s+/) // Tách theo dấu câu
      .reduce<string[]>((acc, cur, i, arr) => {
        // Ghép lại câu và dấu câu của nó
        if (i % 2 === 0) {
          const sentence = cur + (arr[i + 1] ? arr[i + 1] + " " : "");
          if (sentence.trim()) acc.push(sentence.trim());
        }
        return acc;
      }, []);
  };

  // === Helper: Gọi Gemini để làm sạch text (CHỈ KHI CẦN) ===
  const cleanAndSetText = async (): Promise<string> => {
    setIsLoading(true);
    let cleanedContent = text; // Dùng text gốc làm fallback

    try {
      // 🚨 FIX BẢO MẬT: LUÔN DÙNG BIẾN MÔI TRƯỜNG 🚨
      const apiKey = "AIzaSyCzmWfJh9MFA8heDY0OsALx15svezvXxdo";
      if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY");
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      // ---------------------------------------------------

      console.log("has key:", !!apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

      const prompt = `
        Bỏ toàn bộ thẻ HTML, biến, URL, hashtag, @mention, và mã code.
        Chỉ giữ lại phần nội dung có thể đọc tự nhiên.
        Text gốc:
        ${text}
      `.trim();
      console.log(prompt);
      const result = await model.generateContent(prompt);
      const out =
        typeof result?.response?.text === "function"
          ? result.response.text()
          : result?.response?.text;

      cleanedContent = String(out || text); // Dùng text gốc nếu Gemini trả về rỗng
    } catch (err) {
      console.error("Gemini clean error:", err);
      // Lỗi, cleanedContent vẫn là text gốc (fallback)
    }

    setCleanText(cleanedContent); // Lưu lại cho các lần nhấn Play sau
    setIsLoading(false);
    return cleanedContent; // Trả về cho lần chạy này
  };

  // === (useEffect gọi Gemini đã bị XÓA) ===

  // === (useMemo cho chunks đã bị XÓA) ===

  // === Điều khiển TTS ===

  // 3. Chuyển speak thành async
  const speak = async () => {
    if (!synth || isLoading) return; // Không chạy nếu đang loading
    stop(); // Dừng mọi thứ đang phát

    let textToSpeak = cleanText;

    // 4. Kiểm tra nếu chưa clean thì mới gọi API
    if (!textToSpeak) {
      textToSpeak = await cleanAndSetText();
    }

    // 5. Tính chunks trực tiếp từ text vừa clean
    const chunks = getChunks(textToSpeak);
    if (!chunks.length) return;

    setPlaying(true);

    chunks.forEach((chunk, idx) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.rate = rate;
      u.pitch = pitch;
      if (voices[voiceIndex]) u.voice = voices[voiceIndex];
      if (idx === chunks.length - 1) {
        u.onend = () => setPlaying(false);
      }
      utterRef.current = u;
      synth.speak(u);
    });
  };

  const pause = () => synth?.speaking && !synth.paused && synth.pause();
  const resume = () => synth?.paused && synth.resume();
  const stop = () => {
    if (!synth) return;
    setPlaying(false);
    synth.cancel();
    utterRef.current = null;
  };

  // === UI ===
  return (
    <div className="flex flex-col gap-3 max-w-xl rounded-2xl border p-4">
      <div className="flex gap-2 items-center">
        {/* 6. Cập nhật UI nút Play */}
        <button
          onClick={speak}
          className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Play"}
        </button>
        <button onClick={pause} className="px-3 py-1 rounded border">
          Pause
        </button>
        <button onClick={resume} className="px-3 py-1 rounded border">
          Resume
        </button>
        <button onClick={stop} className="px-3 py-1 rounded border">
          Stop
        </button>
      </div>

      <label className="text-sm">
        Voice:
        <select
          className="ml-2 border rounded px-2 py-1"
          value={voiceIndex}
          onChange={(e) => setVoiceIndex(Number(e.target.value))}
        >
          {voices.map((v, i) => (
            <option key={v.name + i} value={i}>
              {v.name} {v.lang ? `(${v.lang})` : ""}
            </option>
          ))}
        </select>
      </label>

      {/* ... (Các thanh trượt Rate và Pitch không đổi) ... */}
      <label className="text-sm">
        Rate: {rate.toFixed(1)}
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="w-full"
        />
      </label>
      <label className="text-sm">
        Pitch: {pitch.toFixed(1)}
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={pitch}
          onChange={(e) => setPitch(Number(e.target.value))}
          className="w-full"
        />
      </label>

      {/* 6. Cập nhật UI status text */}
      <p className="text-xs text-gray-500">
        {isLoading
          ? "Processing content..."
          : playing
          ? "Reading…"
          : cleanText
          ? "Ready to read cleaned content."
          : "Press Play to start."}
      </p>
    </div>
  );
}
