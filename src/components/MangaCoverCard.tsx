"use client"

import { ShieldCheck } from "lucide-react"

type Props = {
  title: string
  coverUrl: string
  licenseStatus?: "none" | "pending" | "approved" | "rejected"
}

export default function MangaCoverCard({ title, coverUrl, licenseStatus }: Props) {
  const verified = licenseStatus === "approved"

  return (
    <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border bg-gray-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverUrl}
        alt={title}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* ✅ Tick xanh góc dưới bên phải ảnh bìa */}
      {verified && (
        <div className="absolute bottom-2 right-2 bg-green-600 text-white rounded-full p-2 shadow">
          <ShieldCheck className="h-5 w-5" />
        </div>
      )}
    </div>
  )
}