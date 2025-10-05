// components/ChapterComments.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import axios from "axios";
import { Footer } from "../footer";
import { useTheme } from "next-themes";

export default function ChapterComments() {
    const params = useParams();
    const chapter_id = params.id; // URL: /chapter/[id]

    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true)
    })

    const fetchComments = async () => {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/comment/all-comment-chapter/${chapter_id}`,
                { withCredentials: true });

            setComments(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "Lỗi khi lấy comment");
        }
    };

    const handleSubmit = async () => {
        if (!newComment.trim()) return;
        if (newComment.length > 1000) {
            alert("Comment không được vượt quá 1000 ký tự");
            return;
        }

        setLoading(true);

        try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/comment/create-comment`, {
                chapter_id,
                content: newComment,
            }, { withCredentials: true });

            // Nếu backend trả về lỗi, axios sẽ throw, nên ở đây coi như thành công
            setNewComment("");
            fetchComments(); // reload comment
        } catch (err: any) {
            alert(err.response?.data?.message || err.message || "Gửi comment thất bại");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [chapter_id]);

    if (!mounted) return null;

    return (
        <>
            <div className={`${theme === "dark" ? "bg-[#1F1F1F]" : "bg-white"} rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 max-w-3xl mx-auto mb-20`}>
                <h2 className="text-sm font-semibol">Bình luận</h2>

                {/* Comment list */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scroll">
                    {comments.length === 0 && (
                        <p className="text-sm">Chưa có bình luận nào.</p>
                    )}
                    {comments.map((c) => (
                        <div
                            key={c._id}
                            className={`border rounded-xl p-3 text-sm transition-all duration-200 
                                ${theme === "dark"
                                    ? "bg-[#181818] border-[#2F2F2F] shadow-[0_4px_5px_rgba(0,0,0,0.6)]"
                                    : "bg-white border-gray-300 shadow-[0_4px_10px_rgba(0,0,0,0.1)]"
                                } hover:border-blue-400 hover:shadow-[0_6px_5px_rgba(59,130,246,0.3)]`}

                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="px-3 py-1 rounded-md bg-gradient-to-r from-blue-500 to-blue-400 text-white font-bold text-base shadow-sm">
                                    {c.user_id.username}
                                </span>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                    {new Date(c.createdAt).toLocaleString()}
                                </span>
                            </div>

                            <p
                                className={`leading-relaxed ${theme === "dark" ? "text-gray-300" : "text-gray-700"
                                    }`}
                            >
                                {c.content}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Input */}
                <div className="space-y-2">
                    <textarea
                        className="w-full border border-slate-300 rounded-xl p-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Viết bình luận..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        maxLength={1000}
                        rows={4}
                    />
                    <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>{newComment.length}/1000 ký tự</span>
                        <button
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-700 disabled:bg-gray-400"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Gửi
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
            <Footer />
        </>

    );
}
