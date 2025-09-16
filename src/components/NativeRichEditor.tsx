"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";

export type Props = {
  value: string; // HTML
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number; // px
};

// ---- sanitizer: chỉ cho phép text-align trên P/DIV (+ chuyển align attr -> style)
function sanitizeHTML(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = html || "";

  const ALLOWED_TAGS = new Set([
    "P",
    "DIV",
    "BR",
    "B",
    "I",
    "U",
    "STRONG",
    "EM",
  ]);
  const allowedAlign = new Set(["left", "center", "right"]);

  const keepOnlyTextAlign = (el: HTMLElement) => {
    // Ưu tiên lấy từ style
    const style = el.getAttribute("style") || "";
    let align = "";
    style
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((declaration) => {
        const [k, v] = declaration
          .split(":")
          .map((x) => (x || "").trim().toLowerCase());
        if (k === "text-align" && allowedAlign.has(v)) align = v;
      });

    // Nếu không có trong style, check thuộc tính align="center|left|right"
    if (!align) {
      const legacy = (el.getAttribute("align") || "").toLowerCase();
      if (allowedAlign.has(legacy)) {
        align = legacy;
      }
    }

    // Chuẩn hoá: chỉ để lại style text-align; xoá align và attr khác
    if (align) el.setAttribute("style", `text-align: ${align};`);
    else el.removeAttribute("style");
    el.removeAttribute("align");

    // Xoá mọi attr khác ngoài style
    [...el.attributes].forEach((a) => {
      const n = a.name.toLowerCase();
      if (n !== "style") el.removeAttribute(a.name);
    });
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;

      // Loại tag không cho phép (nâng children lên)
      if (!ALLOWED_TAGS.has(el.tagName)) {
        const parent = el.parentNode;
        while (el.firstChild) parent?.insertBefore(el.firstChild, el);
        parent?.removeChild(el);
        return;
      }

      // Xoá on* handlers
      [...el.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on")) el.removeAttribute(attr.name);
      });

      if (el.tagName === "P" || el.tagName === "DIV") {
        keepOnlyTextAlign(el);
      } else {
        // b/i/u/strong/em/br => xoá hết attr (không cần style)
        [...el.attributes].forEach((a) => el.removeAttribute(a.name));
      }
    }

    let child = node.firstChild;
    while (child) {
      const next = child.nextSibling;
      walk(child);
      child = next;
    }
  };

  container.querySelectorAll("script, style").forEach((n) => n.remove());
  walk(container);
  return container.innerHTML;
}

export default function NativeRichEditor({
  value,
  onChange,
  placeholder = "Bắt đầu viết…",
  className = "",
  minHeight = 200,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<string>("");
  const [isFocused, setIsFocused] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // đồng bộ value từ props
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const sanitized =
      typeof window === "undefined" ? value : sanitizeHTML(value || "");
    if (sanitized !== el.innerHTML) {
      el.innerHTML = sanitized || "";
      lastEmittedRef.current = sanitized;
      setIsEmpty(el.textContent?.trim().length === 0);
    }
  }, [value]);

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    const clean = sanitizeHTML(el.innerHTML);
    if (clean !== lastEmittedRef.current) {
      lastEmittedRef.current = clean;
      onChange(clean);
    }
    setIsEmpty(el.textContent?.trim().length === 0);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    // Cho phép xuống dòng basic
    const insert = html || (text ? text.replace(/\n/g, "<br>") : "");
    const clean = sanitizeHTML(insert);
    // Dán thẳng tại selection (không tạo thêm style ngoài)
    document.execCommand("insertHTML", false, clean);
    emitChange();
  };

  // Luôn giữ focus trong editor khi bấm toolbar (tránh mất selection)
  const runCmd = (fn: () => void) => {
    // cố gắng focus lại editor trước khi exec
    editorRef.current?.focus();
    fn();
    // sau khi đổi format, sync ra ngoài
    emitChange();
  };

  // commands: bold/italic/underline + left/center/right
  const cmd = {
    bold: () => runCmd(() => document.execCommand("bold")),
    italic: () => runCmd(() => document.execCommand("italic")),
    underline: () => runCmd(() => document.execCommand("underline")),
    left: () => runCmd(() => document.execCommand("justifyLeft")),
    center: () => runCmd(() => document.execCommand("justifyCenter")),
    right: () => runCmd(() => document.execCommand("justifyRight")),
  } as const;

  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b p-2">
        <ToolbarButton title="Đậm" onAction={cmd.bold} Icon={Bold} />
        <ToolbarButton title="Nghiêng" onAction={cmd.italic} Icon={Italic} />
        <ToolbarButton
          title="Gạch chân"
          onAction={cmd.underline}
          Icon={Underline}
        />
        <span className="mx-1 h-6 w-px bg-gray-200" />
        <ToolbarButton title="Canh trái" onAction={cmd.left} Icon={AlignLeft} />
        <ToolbarButton
          title="Canh giữa"
          onAction={cmd.center}
          Icon={AlignCenter}
        />
        <ToolbarButton
          title="Canh phải"
          onAction={cmd.right}
          Icon={AlignRight}
        />
      </div>

      {/* Editor */}
      <div className="relative">
        {!isFocused && isEmpty && (
          <div className="pointer-events-none absolute inset-0 select-none whitespace-pre-wrap break-words text-gray-400 p-4">
            {placeholder}
          </div>
        )}

        <div
          ref={editorRef}
          className="prose prose-neutral max-w-none p-4 focus:outline-none"
          style={{ minHeight }}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          onInput={emitChange}
          onBlur={() => {
            setIsFocused(false);
            emitChange();
          }}
          onFocus={() => setIsFocused(true)}
          onPaste={onPaste}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  title,
  onAction,
  Icon,
}: {
  title: string;
  onAction: () => void;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      title={title}
      // Dùng onMouseDown để KHÔNG mất focus/selection khỏi editor
      onMouseDown={(e) => {
        e.preventDefault();
        onAction();
      }}
      className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
