"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Palette,
  ChevronDown,
} from "lucide-react";
import axios from "axios";

export interface NativeRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

// ─── Caret helpers ────────────────────────────────────────────────────────────

/** Save caret as character offset from start of contenteditable */
function saveCaretOffset(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0).cloneRange();
  range.selectNodeContents(el);
  range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
  return range.toString().length;
}

/** Restore caret to character offset inside el */
function restoreCaretOffset(el: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node: Text | null = null;
  let nodeOffset = 0;

  let current: Node | null;
  while ((current = walker.nextNode())) {
    const text = current as Text;
    const len = text.textContent?.length ?? 0;
    if (remaining <= len) {
      node = text;
      nodeOffset = remaining;
      break;
    }
    remaining -= len;
  }

  if (!node && el.childNodes.length > 0) {
    // fallback: place at end
    const last = el.childNodes[el.childNodes.length - 1];
    const range = document.createRange();
    range.selectNodeContents(last);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    return;
  }

  if (node) {
    const range = document.createRange();
    range.setStart(node, nodeOffset);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}

// ─── Strip only spell-error marks, keep plain text ───────────────────────────

function stripSpellMarks(el: HTMLElement) {
  const marks = el.querySelectorAll("mark.spell-error");
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });
}

// ─── Spell highlight (offset-based on plain text) ────────────────────────────

interface SpellError {
  word: string;
  offset: number;
  length: number;
  suggestions: string[];
}

function applySpellHighlights(el: HTMLElement, errors: SpellError[]) {
  // 1. Remove existing marks without losing caret (strip first, re-calc later)
  stripSpellMarks(el);
  if (errors.length === 0) return;

  // 2. Collect text nodes with their global char offsets
  type TextChunk = { node: Text; start: number; end: number };
  const chunks: TextChunk[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let cur: Node | null;
  while ((cur = walker.nextNode())) {
    const t = cur as Text;
    const len = t.textContent?.length ?? 0;
    chunks.push({ node: t, start: pos, end: pos + len });
    pos += len;
  }

  // 3. Process errors in reverse order so offsets stay valid
  const sorted = [...errors].sort((a, b) => b.offset - a.offset);

  for (const err of sorted) {
    const { offset, length, word, suggestions } = err;
    const errEnd = offset + length;

    for (const chunk of chunks) {
      // Error must be entirely inside this chunk
      if (offset >= chunk.start && errEnd <= chunk.end) {
        const text = chunk.node.textContent ?? "";
        const relStart = offset - chunk.start;
        const relEnd = relStart + length;

        const before = text.slice(0, relStart);
        const errorText = text.slice(relStart, relEnd);
        const after = text.slice(relEnd);

        const mark = document.createElement("mark");
        mark.className = "spell-error";
        mark.style.cssText =
          "background:transparent;text-decoration:underline;text-decoration-color:#ef4444;text-decoration-style:wavy;cursor:pointer;border-radius:2px;";
        mark.dataset.word = word;
        mark.dataset.suggestions = JSON.stringify(suggestions);
        mark.textContent = errorText;

        const parent = chunk.node.parentNode;
        if (!parent) break; // Skip if node was removed from DOM

        if (before) parent.insertBefore(document.createTextNode(before), chunk.node);
        parent.insertBefore(mark, chunk.node);
        if (after) parent.insertBefore(document.createTextNode(after), chunk.node);
        parent.removeChild(chunk.node);

        // Update chunk so next iteration (earlier offset) still works
        // — not needed since sorted descending, break is enough
        break;
      }
    }
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NativeRichEditor({
  value,
  onChange,
  placeholder = "Bắt đầu nhập...",
  className,
  minHeight = 200,
}: NativeRichEditorProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [spellErrors, setSpellErrors] = useState<SpellError[]>([]);
  const [selectedError, setSelectedError] = useState<SpellError | null>(null);
  const [suggestionPos, setSuggestionPos] = useState<{ x: number; y: number } | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isComposingRef = useRef(false); // IME guard

  const isEmpty = useMemo(
    () => !value || value.replace(/<[^>]+>/g, "").trim().length === 0,
    [value]
  );

  // ── Sync value → DOM only when NOT focused (avoid caret reset) ──────────────
  useEffect(() => {
    const el = editableRef.current;
    if (!el || isFocused) return;
    // Strip spell marks for clean comparison
    const clean = el.innerHTML.replace(/<mark class="spell-error"[^>]*>(.*?)<\/mark>/g, "$1");
    if (clean !== value) {
      el.innerHTML = value || "";
    }
  }, [value, isFocused]);

  // ── Re-apply spell highlights when errors change ────────────────────────────
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    const caretOffset = isFocused ? saveCaretOffset(el) : null;
    applySpellHighlights(el, spellErrors);
    if (isFocused && caretOffset !== null) {
      restoreCaretOffset(el, caretOffset);
    }
  }, [spellErrors, isFocused]);

  // ── Emit change (strip spell marks so value stays clean) ───────────────────
  const emit = useCallback(() => {
    const el = editableRef.current;
    if (!el) return;
    // Clone to get clean HTML without mark tags
    const clone = el.cloneNode(true) as HTMLElement;
    stripSpellMarks(clone);
    onChange(clone.innerHTML);
  }, [onChange]);

  // ── Spellcheck with debounce ────────────────────────────────────────────────
  const checkSpelling = useCallback(
    async (text: string) => {
      const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (!plain || plain.length < 3) {
        setSpellErrors([]);
        return;
      }
      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/spellcheck/check`,
          { text: plain, language: "vi" },
          { withCredentials: true }
        );
        setSpellErrors(data.errors || []);
      } catch {
        // silent fail
      }
    },
    []
  );

  const scheduleSpellcheck = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const el = editableRef.current;
      if (!el) return;
      checkSpelling(el.innerText || "");
    }, 600);
  }, [checkSpelling]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── Toolbar commands ────────────────────────────────────────────────────────
  const applyCmd = (cmd: string, val?: string) => {
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(cmd, false, val);
    emit();
  };

  const onFontSize = (sizePx: string) => {
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      document.execCommand("styleWithCSS", false, "true");
      try {
        const range = sel.getRangeAt(0);
        const span = document.createElement("span");
        span.style.fontSize = sizePx;
        // Use extractContents + appendChild for more reliable wrapping
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
      } catch (err) {
        // Fallback: use execCommand with default font sizes
        const sizeMap: { [key: string]: string } = {
          "12px": "1",
          "14px": "2",
          "16px": "3",
          "18px": "4",
          "20px": "5",
          "24px": "6",
          "28px": "7",
          "32px": "7",
          "40px": "7",
          "48px": "7",
        };
        document.execCommand("fontSize", false, sizeMap[sizePx] || "3");
      }
    } else {
      el.style.fontSize = sizePx;
    }
    emit();
  };

  const onFontFamily = (fam: string) => {
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("fontName", false, fam);
    emit();
  };

  // ── Key handlers ────────────────────────────────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && selectedError?.suggestions.length) {
      e.preventDefault();
      replaceWord(selectedError.word, selectedError.suggestions[0]);
      return;
    }
    if (e.key === "Escape") {
      setSuggestionPos(null);
      setSelectedError(null);
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key.toLowerCase() === "b") { e.preventDefault(); applyCmd("bold"); }
      if (e.key.toLowerCase() === "i") { e.preventDefault(); applyCmd("italic"); }
      if (e.key.toLowerCase() === "u") { e.preventDefault(); applyCmd("underline"); }
    }
  };

  const onInput = () => {
    if (isComposingRef.current) return;
    emit();
    scheduleSpellcheck();
  };

  // ── Spell suggestion popup ──────────────────────────────────────────────────
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("spell-error")) {
        const word = target.dataset.word || "";
        const suggestions: string[] = target.dataset.suggestions
          ? JSON.parse(target.dataset.suggestions)
          : [];
        setSelectedError({ word, offset: 0, length: word.length, suggestions });
        const rect = target.getBoundingClientRect();
        const container = el.closest(".relative");
        const containerRect = container?.getBoundingClientRect() ?? rect;
        setSuggestionPos({
          x: rect.left - containerRect.left,
          y: rect.bottom - containerRect.top + 6,
        });
        e.preventDefault();
      } else if (!(e.target as HTMLElement).closest(".suggestion-popup")) {
        setSuggestionPos(null);
        setSelectedError(null);
      }
    };
    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, []);

  const replaceWord = useCallback(
    (oldWord: string, newWord: string) => {
      const el = editableRef.current;
      if (!el) return;
      const marks = el.querySelectorAll("mark.spell-error");
      marks.forEach((mark) => {
        const m = mark as HTMLElement;
        if (m.textContent === oldWord || m.dataset.word === oldWord) {
          const parent = m.parentNode!;
          parent.replaceChild(document.createTextNode(newWord), m);
          parent.normalize();
        }
      });
      emit();
      scheduleSpellcheck();
      setSuggestionPos(null);
      setSelectedError(null);
    },
    [emit, scheduleSpellcheck]
  );

  // ── Active format state ─────────────────────────────────────────────────────
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false });
  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  };

  return (
    <div className="w-full font-sans">
      {/* ── Toolbar ── */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/80 p-2 backdrop-blur-sm shadow-sm">
        {/* Format group */}
        <div className="flex items-center gap-0.5 rounded-lg bg-white border border-gray-200 p-1 shadow-sm">
          {[
            { icon: Bold, cmd: "bold", key: "bold", title: "Đậm (Ctrl+B)" },
            { icon: Italic, cmd: "italic", key: "italic", title: "Nghiêng (Ctrl+I)" },
            { icon: Underline, cmd: "underline", key: "underline", title: "Gạch chân (Ctrl+U)" },
          ].map(({ icon: Icon, cmd, key, title }) => (
            <button
              key={key}
              onMouseDown={(e) => { e.preventDefault(); applyCmd(cmd); }}
              title={title}
              className={`p-1.5 rounded-md transition-all ${
                activeFormats[key as keyof typeof activeFormats]
                  ? "bg-blue-100 text-blue-700"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Align group */}
        <div className="flex items-center gap-0.5 rounded-lg bg-white border border-gray-200 p-1 shadow-sm">
          {[
            { icon: AlignLeft, cmd: "justifyLeft", title: "Trái" },
            { icon: AlignCenter, cmd: "justifyCenter", title: "Giữa" },
            { icon: AlignRight, cmd: "justifyRight", title: "Phải" },
          ].map(({ icon: Icon, cmd, title }) => (
            <button
              key={cmd}
              onMouseDown={(e) => { e.preventDefault(); applyCmd(cmd); }}
              title={title}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-all"
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Color picker */}
        <label
          className="flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-2.5 py-1.5 shadow-sm cursor-pointer hover:bg-gray-50 transition-all"
          title="Màu chữ"
        >
          <Palette className="w-4 h-4 text-gray-600" />
          <input
            type="color"
            defaultValue="#000000"
            onChange={(e) => {
              const el = editableRef.current;
              if (!el) return;
              el.focus();
              const sel = window.getSelection();
              if (sel && !sel.isCollapsed) {
                document.execCommand("styleWithCSS", false, "true");
                document.execCommand("foreColor", false, e.target.value);
                emit();
              }
            }}
            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
          />
        </label>

        {/* Font family */}
        <label className="flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-2.5 py-1.5 shadow-sm hover:bg-gray-50 transition-all">
          <Type className="w-4 h-4 text-gray-500 shrink-0" />
          <div className="relative">
            <select
              onChange={(e) => onFontFamily(e.target.value)}
              className="appearance-none bg-transparent text-sm text-gray-700 pr-5 cursor-pointer outline-none"
            >
              <option value="Inter, system-ui, sans-serif">Inter</option>
              <option value="Arial, Helvetica, sans-serif">Arial</option>
              <option value="Times New Roman, Times, serif">Times New Roman</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="Courier New, Courier, monospace">Courier New</option>
              <option value="Tahoma, sans-serif">Tahoma</option>
              <option value="Roboto, system-ui, sans-serif">Roboto</option>
            </select>
            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </label>

        {/* Font size */}
        <label className="flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-2.5 py-1.5 shadow-sm hover:bg-gray-50 transition-all">
          <span className="text-xs text-gray-500 font-medium">Cỡ</span>
          <div className="relative">
            <select
              onChange={(e) => onFontSize(e.target.value)}
              className="appearance-none bg-transparent text-sm text-gray-700 pr-5 cursor-pointer outline-none"
              defaultValue="16px"
            >
              {["12px","14px","16px","18px","20px","24px","28px","32px","40px","48px"].map((s) => (
                <option key={s} value={s}>{s.replace("px", "")}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </label>
      </div>

      {/* ── Editor area ── */}
      <div
        className={`relative rounded-xl border border-gray-200 bg-white shadow-sm transition-all ${
          isFocused ? "border-blue-400 ring-2 ring-blue-100" : "hover:border-gray-300"
        } ${className || ""}`}
        style={{ minHeight }}
      >
        {/* Placeholder */}
        {isEmpty && !isFocused && (
          <div className="pointer-events-none absolute left-4 top-4 select-none text-gray-400 text-sm">
            {placeholder}
          </div>
        )}

        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false} // We handle spellcheck manually
          lang="vi"
          className="prose prose-sm max-w-none outline-none p-4 min-h-[inherit]"
          style={{ minHeight: minHeight - 32 }}
          onInput={onInput}
          onKeyDown={onKeyDown}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { isComposingRef.current = false; onInput(); }}
        />

        {/* Spell suggestion popup */}
        {suggestionPos && selectedError && selectedError.suggestions.length > 0 && (
          <div
            className="suggestion-popup absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[160px]"
            style={{ left: `${suggestionPos.x}px`, top: `${suggestionPos.y}px` }}
          >
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-500">Gợi ý thay thế</span>
            </div>
            {selectedError.suggestions.map((s, i) => (
              <button
                key={i}
                onMouseDown={(e) => { e.preventDefault(); replaceWord(selectedError.word, s); }}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 text-sm text-gray-700 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div className="mt-1.5 flex items-center justify-between px-1">
        <span className="text-xs text-gray-400">
          {spellErrors.length > 0
            ? `${spellErrors.length} lỗi chính tả`
            : isFocused
            ? "Đang soạn thảo..."
            : ""}
        </span>
        <span className="text-xs text-gray-400">
          {value.replace(/<[^>]+>/g, "").trim().length} ký tự
        </span>
      </div>
    </div>
  );
}