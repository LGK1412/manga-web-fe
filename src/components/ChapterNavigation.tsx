"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";

export default function ChapterNavigation() {
  const { id } = useParams();
  const router = useRouter();
  const [nextId, setNextId] = useState<string | null>(null);
  const [prevId, setPrevId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/api/Chapter/checkchapter/${id}`)
      .then((res) => {
        setNextId(res.data.nextId);
        setPrevId(res.data.prevId);
      })
      .catch(console.error);
  }, [id]);

  return (
    <div className="flex justify-between mt-8">
      <button
        disabled={!prevId}
        onClick={() => prevId && router.push(`/chapter/${prevId}`)}
        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
      >
        ← Previous
      </button>
      <button
        disabled={!nextId}
        onClick={() => nextId && router.push(`/chapter/${nextId}`)}
        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
      >
        Next →
      </button>
    </div>
  );
}
