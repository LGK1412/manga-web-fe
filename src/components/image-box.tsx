"use client";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export default function ImageBox({
  file,
  imageUrl,
  disabled,
  label,
  onChange,
  className,
}: {
  file: string | File | null;
  imageUrl?: string;
  disabled?: boolean;
  label: string;
  onChange: (file: File | null) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file instanceof File) {
      const url = URL.createObjectURL(file);
      setPreview(url);

      return () => URL.revokeObjectURL(url);
    }

    setPreview(imageUrl || null);
  }, [file, imageUrl]);

  return (
    <div className="space-y-1 w-full h-full">
      {/* 3. Wrap the main container with the passed className */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        className={twMerge(
          `
          relative
          w-full h-full
          border-2 border-dashed
          rounded-xl
          flex flex-col items-center justify-center
          cursor-pointer
          overflow-hidden
          bg-gray-50/50
          hover:bg-gray-100/80
          transition-all
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `,
          className, // This allows the parent to override styles
        )}
      >
        {preview ? (
          <img
            src={preview}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl text-gray-400">+</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">
              Upload {label}
            </span>
          </div>
        )}

        {/* Overlay for change on hover */}
        {preview && !disabled && (
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
            <span className="text-white text-xs font-bold">Change Image</span>
          </div>
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
