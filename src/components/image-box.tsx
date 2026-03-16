"use client";
import { useRef } from "react";

export default function ImageBox({
  file,
  imageUrl,
  disabled,
  label,
  onChange,
}: {
  file: File | null;
  imageUrl?: string;
  disabled?: boolean;
  label: string;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = file ? URL.createObjectURL(file) : imageUrl || null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>

      <div
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          w-24 h-36
          border-2 border-dashed
          rounded-lg
          flex items-center justify-center
          cursor-pointer
          overflow-hidden
          hover:bg-gray-50
          transition
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {preview ? (
          <img src={preview} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl text-gray-400">+</span>
        )}
      </div>

      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/*"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}
