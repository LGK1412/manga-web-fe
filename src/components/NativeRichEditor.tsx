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
  PaintBucket,
} from "lucide-react";
import axios from "axios";

export interface NativeRichEditorProps {
  /** HTML string */
  value: string;
  /** Receives the current HTML string */
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  /** px */
  minHeight?: number;
}

// ---- utils
function selectionInside(el: HTMLElement | null) {
  if (!el) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  const container = range.commonAncestorContainer as Node;
  return el.contains(
    container.nodeType === 1 ? (container as Node) : container
  );
}

function htmlFromRange(range: Range) {
  const div = document.createElement("div");
  div.appendChild(range.cloneContents());
  return div.innerHTML;
}

function wrapSelectionWithSpan(style: Partial<CSSStyleDeclaration>) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return false;
  const html = htmlFromRange(range);
  const span = document.createElement("span");
  Object.assign(span.style, style);
  span.innerHTML = html;
  range.deleteContents();
  range.insertNode(span);
  // place caret after inserted span
  range.setStartAfter(span);
  range.setEndAfter(span);
  sel.removeAllRanges();
  sel.addRange(range);
  return true;
}

interface SpellError {
  word: string;
  offset: number;
  length: number;
  suggestions: string[];
}

export default function NativeRichEditor({
  value,
  onChange,
  placeholder = "Type...",
  className,
  minHeight = 200,
}: NativeRichEditorProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [spellErrors, setSpellErrors] = useState<SpellError[]>([]);
  const [selectedError, setSelectedError] = useState<SpellError | null>(null);
  const [suggestionPos, setSuggestionPos] = useState<{ x: number; y: number } | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isEmpty = useMemo(
    () => !value || value.replace(/<[^>]+>/g, "").trim().length === 0,
    [value]
  );

  // Apply spell highlights vào DOM
  const applySpellHighlights = useCallback((el: HTMLElement, errors: SpellError[]) => {
    // Remove existing highlights
    const existingHighlights = el.querySelectorAll('.spell-error');
    existingHighlights.forEach(h => {
      const parent = h.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(h.textContent || ''), h);
        parent.normalize();
      }
    });

    if (errors.length === 0) return;

    // Get plain text và highlight
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let textOffset = 0;
    const textNodes: { node: Text; start: number; end: number }[] = [];
    
    let node;
    while (node = walker.nextNode()) {
      const textNode = node as Text;
      const start = textOffset;
      const end = textOffset + textNode.textContent!.length;
      textNodes.push({ node: textNode, start, end });
      textOffset = end;
    }

    // Sort errors by offset (descending để replace từ cuối lên)
    const sortedErrors = [...errors].sort((a, b) => b.offset - a.offset);

    for (const error of sortedErrors) {
      const { offset, length, word } = error;
      
      // Tìm text node chứa error
      for (const { node, start, end } of textNodes) {
        if (offset >= start && offset < end) {
          const textContent = node.textContent || '';
          const relativeOffset = offset - start;
          const beforeText = textContent.substring(0, relativeOffset);
          const errorText = textContent.substring(relativeOffset, relativeOffset + length);
          const afterText = textContent.substring(relativeOffset + length);

          // Tạo span với class spell-error
          const span = document.createElement('span');
          span.className = 'spell-error';
          span.style.textDecoration = 'underline';
          span.style.textDecorationColor = '#ef4444';
          span.style.textDecorationStyle = 'wavy';
          span.style.cursor = 'pointer';
          span.dataset.word = word;
          span.dataset.suggestions = JSON.stringify(error.suggestions);
          span.textContent = errorText;
          
          // Thay thế
          const parent = node.parentNode;
          if (parent) {
            if (beforeText) parent.insertBefore(document.createTextNode(beforeText), node);
            parent.insertBefore(span, node);
            if (afterText) parent.insertBefore(document.createTextNode(afterText), node);
            parent.removeChild(node);
            break;
          }
        }
      }
    }
  }, []);

  // Real-time spellcheck với debounce
  const checkSpelling = useCallback(async (text: string) => {
    const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!plainText || plainText.length < 3) {
      setSpellErrors([]);
      const el = editableRef.current;
      if (el) {
        // Remove all highlights
        const highlights = el.querySelectorAll('.spell-error');
        highlights.forEach(h => {
          const parent = h.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(h.textContent || ''), h);
            parent.normalize();
          }
        });
      }
      return;
    }

    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/spellcheck/check`,
        { text: plainText, language: 'vi' },
        { withCredentials: true }
      );
      
      setSpellErrors(data.errors || []);
      
      // Apply highlights
      const el = editableRef.current;
      if (el) {
        applySpellHighlights(el, data.errors || []);
      }
    } catch (err) {
      console.error("Lỗi check spelling:", err);
      // Silent fail - không hiển thị error
    }
  }, [applySpellHighlights]);

  // keep DOM in sync with controlled value
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
      // Re-apply spellcheck highlights sau khi sync
      if (spellErrors.length > 0) {
        applySpellHighlights(el, spellErrors);
      }
    }
  }, [value, spellErrors, applySpellHighlights]);

  const emit = useCallback(() => {
    const el = editableRef.current;
    if (!el) return;
    onChange(el.innerHTML);

    // Debounce spellcheck
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      const plainText = el.innerText || el.textContent || '';
      checkSpelling(plainText);
    }, 500);
  }, [onChange, checkSpelling]);

  // ----- toolbar actions
  const applyCmd = (cmd: string, value?: string) => {
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(cmd, false, value);
    emit();
  };

  const onBold = () => applyCmd("bold");
  const onItalic = () => applyCmd("italic");
  const onUnderline = () => applyCmd("underline");

  const onAlign = (dir: "left" | "center" | "right") => {
    if (dir === "left") applyCmd("justifyLeft");
    if (dir === "center") applyCmd("justifyCenter");
    if (dir === "right") applyCmd("justifyRight");
  };

  const onColor = (color: string) => {
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    if (selectionInside(el)) {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("foreColor", false, color);
    } else {
      // no selection -> set as default color by wrapping all
      wrapSelectionWithSpan({ color }) || (el.style.color = color);
    }
    emit();
  };

  const onFontFamily = (fam: string) => {
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    if (selectionInside(el)) {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("fontName", false, fam);
    } else {
      el.style.fontFamily = fam;
    }
    emit();
  };

  const onFontSize = (sizePx: string) => {
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    // Try inline selection styling; fallback to whole editor style
    if (!wrapSelectionWithSpan({ fontSize: sizePx })) {
      el.style.fontSize = sizePx;
    }
    emit();
  };

  // Handle click on spell error
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('spell-error')) {
        const word = target.dataset.word || '';
        const suggestions = target.dataset.suggestions 
          ? JSON.parse(target.dataset.suggestions) 
          : [];
        
        setSelectedError({ word, offset: 0, length: word.length, suggestions });
        
        // Tính vị trí để hiển thị popup (relative to editor container)
        const rect = target.getBoundingClientRect();
        const editorContainer = el.closest('.relative');
        if (editorContainer) {
          const containerRect = editorContainer.getBoundingClientRect();
          setSuggestionPos({ 
            x: rect.left - containerRect.left, 
            y: rect.bottom - containerRect.top + 5 
          });
        } else {
          setSuggestionPos({ x: rect.left, y: rect.bottom + 5 });
        }
        
        e.preventDefault();
      } else {
        setSuggestionPos(null);
        setSelectedError(null);
      }
    };

    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, [spellErrors]);

  // Handle suggestion selection
  const replaceWord = useCallback((oldWord: string, newWord: string) => {
    const el = editableRef.current;
    if (!el) return;

    const errors = el.querySelectorAll('.spell-error');
    errors.forEach((errorEl) => {
      const htmlEl = errorEl as HTMLElement;
      if (htmlEl.textContent === oldWord || htmlEl.dataset.word === oldWord) {
        const parent = htmlEl.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(newWord), htmlEl);
          parent.normalize();
        }
      }
    });

    emit();
    setSuggestionPos(null);
    setSelectedError(null);
  }, [emit]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Enter để chọn suggestion đầu tiên
    if (e.key === 'Enter' && selectedError && selectedError.suggestions.length > 0) {
      e.preventDefault();
      replaceWord(selectedError.word, selectedError.suggestions[0]);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        onBold();
      }
      if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        onItalic();
      }
      if (e.key.toLowerCase() === "u") {
        e.preventDefault();
        onUnderline();
      }
    }
  };

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={"w-full"}>
      {/* Toolbar */}
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-2 shadow-sm">
        <div className="flex items-center gap-1 rounded-xl bg-gray-50 p-1">
          <button
            className="p-2 rounded-lg hover:bg-white active:scale-95"
            onClick={onBold}
            title="Đậm (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-white active:scale-95"
            onClick={onItalic}
            title="Nghiêng (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-white active:scale-95"
            onClick={onUnderline}
            title="Gạch dưới (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-gray-50 p-1">
          <button
            className="p-2 rounded-lg hover:bg-white active:scale-95"
            onClick={() => onAlign("left")}
            title="Canh trái"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-white active:scale-95"
            onClick={() => onAlign("center")}
            title="Canh giữa"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-white active:scale-95"
            onClick={() => onAlign("right")}
            title="Canh phải"
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>

        <label className="ml-1 flex items-center gap-2 rounded-xl bg-gray-50 p-2 text-sm">
          <PaintBucket className="w-4 h-4" />
          <input
            type="color"
            onChange={(e) => onColor(e.target.value)}
            className="h-8 w-10 rounded border bg-white p-0"
            title="Màu chữ"
          />
        </label>

        <label className="flex items-center gap-2 rounded-xl bg-gray-50 p-2 text-sm">
          <Type className="w-4 h-4" />
          <select
            onChange={(e) => onFontFamily(e.target.value)}
            className="rounded-lg border bg-white px-2 py-1"
            title="Kiểu chữ"
          >
            <option value="Inter, system-ui, sans-serif">Inter / System</option>
            <option value="Arial, Helvetica, sans-serif">Arial</option>
            <option value="Times New Roman, Times, serif">
              Times New Roman
            </option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Courier New, Courier, monospace">Courier New</option>
            <option value="Tahoma, sans-serif">Tahoma</option>
            <option value="Roboto, system-ui, sans-serif">Roboto</option>
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-xl bg-gray-50 p-2 text-sm">
          <span>Cỡ</span>
          <select
            onChange={(e) => onFontSize(e.target.value)}
            className="rounded-lg border bg-white px-2 py-1"
            title="Cỡ chữ"
          >
            {[
              "12px",
              "14px",
              "16px",
              "18px",
              "20px",
              "24px",
              "28px",
              "32px",
              "40px",
              "48px",
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Editable */}
      <div
        className={
          "relative rounded-2xl border bg-white p-3 shadow-sm " +
          (className || "")
        }
        style={{ minHeight }}
      >
        {isEmpty && !isFocused && (
          <div className="pointer-events-none absolute left-3 top-3 select-none text-gray-400">
            {placeholder}
          </div>
        )}

        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={true}
          lang="vi"
          className="prose max-w-none outline-none [&_*]:caret-current"
          style={{ minHeight: minHeight - 24 }}
          onInput={emit}
          onKeyDown={onKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {/* Suggestions Popup */}
        {suggestionPos && selectedError && selectedError.suggestions.length > 0 && (
          <div
            className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-2 min-w-[150px] max-h-[200px] overflow-y-auto"
            style={{
              left: `${suggestionPos.x}px`,
              top: `${suggestionPos.y}px`,
            }}
          >
            <div className="text-xs text-gray-500 mb-1 px-2">Gợi ý:</div>
            {selectedError.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => replaceWord(selectedError.word, suggestion)}
                className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm cursor-pointer"
                onMouseDown={(e) => e.preventDefault()}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
