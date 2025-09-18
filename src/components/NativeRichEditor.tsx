"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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

export default function NativeRichEditor({
  value,
  onChange,
  placeholder = "Type...",
  className,
  minHeight = 200,
}: NativeRichEditorProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isEmpty = useMemo(
    () => !value || value.replace(/<[^>]+>/g, "").trim().length === 0,
    [value]
  );

  // keep DOM in sync with controlled value
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  const emit = () => {
    const el = editableRef.current;
    if (!el) return;
    onChange(el.innerHTML);
  };

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

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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
          className="prose max-w-none outline-none [&_*]:caret-current"
          style={{ minHeight: minHeight - 24 }}
          onInput={emit}
          onKeyDown={onKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </div>
    </div>
  );
}
