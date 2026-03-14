"use client";
import { useRef } from "react";

export default function FileItem({
  file,
  url,
  disabled,
  onChange,
  onRemove,
}: {
  file?: File | null;
  url?: string;
  disabled?: boolean;
  onChange: (f: File | null) => void;
  onRemove?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const isImage =
    file?.type.startsWith("image") || url?.match(/\.(jpg|jpeg|png|webp)$/i);

  const preview = file ? URL.createObjectURL(file) : url || null;

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative
        w-24 h-36
        border-2 border-dashed
        rounded-lg
        flex items-center justify-center
        cursor-pointer
        overflow-hidden
        hover:bg-gray-50
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      {preview ? (
        isImage ? (
          <img src={preview} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs p-2 text-center break-all">
            {file?.name || url?.split("/").pop()}
          </span>
        )
      ) : (
        <span className="text-3xl text-gray-400">+</span>
      )}

      {preview && !disabled && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-1 right-1 bg-white text-xs px-1 rounded"
        >
          ✕
        </button>
      )}

      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}
