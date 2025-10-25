"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Send, MessageSquare, ArrowBigUp, ArrowBigDown, } from "lucide-react";
import axios from "axios";
import { Footer } from "../footer";
import { useTheme } from "next-themes";
import Cookies from "js-cookie";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import VoteButtons from "./VoteButtons";
import ReplySection from "./ReplySection";
import EmojiInputBox from "../emoji/EmojiInputBox";

let socket: Socket;

export default function ChapterComments() {
    const params = useParams();
    const chapter_id = params.id;
    const { theme } = useTheme();
    const { toast } = useToast();

    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<any>();
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [replies, setReplies] = useState<{ [key: string]: any[] }>({});
    const [groupName, setGroupName] = useState("")
    const [messageSent, setMessageSent] = useState(false)
    const MAX_COMMENT_LENGTH = 300000;

    const replyingToRef = useRef(replyingTo);

    useEffect(() => {
        replyingToRef.current = replyingTo;
    }, [replyingTo]);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        // Connect tới server Socket.IO
        socket = io("http://localhost:4001", {
            transports: ["websocket"],
            autoConnect: true,
        });

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            socket.emit("join-group", { url: window.location.href });
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected");
        });

        socket.on("user-joined", (data) => {
            // console.log(data.groupName);
            setGroupName(data.groupName)
        })

        socket.on('refresh-reply', (data) => {
            // console.log("1 asdasdasdasdasd: ", data);
            // console.log("replying to 1: ", replyingToRef.current);
            // console.log(replyingToRef.current === data.commentId)
            if (replyingToRef.current === data.commentId) {
                // console.log('hello');
                fetchReplies(data.commentId)
            }
        })

        socket.on('refresh-comment', () => {
            fetchComments()
        })

        //  socket.on('refresh-reply1', (data) =>{
        //     console.log("asdasdasdasdasd: ",data);
        //     console.log("replying to: ", replyingTo);
        //     console.log(replyingTo === data.commentId)
        //     if (replyingTo === data.commentId) {
        //         console.log('heelo');
        //         fetchReplies(data.commentId)
        //     }
        // })

        // Clean up khi component unmount
        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        const raw = Cookies.get("user_normal_info");
        if (raw) {
            try {
                const decoded = decodeURIComponent(raw);
                setUser(JSON.parse(decoded));
            } catch {
                console.error("Invalid cookie data");
            }
        }
    }, [mounted]);

    const fetchComments = async () => {
        try {
            const res = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/comment/all-comment-chapter/${chapter_id}`,
                { withCredentials: true }
            );

            // ✅ API mới: trả thẳng mảng comments (đã merge replyCount + usernames)
            const data = Array.isArray(res.data) ? res.data : res.data.comments;
            // console.log(data);
            setComments(data);
        } catch (err: any) {
            toast({
                title: "Lỗi",
                description: err.response?.data?.message || "Không tải được bình luận",
                variant: "destructive",
            });
        }
    };

    const fetchReplies = async (commentId: string) => {
        try {
            const res = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/reply/${commentId}`,
                { withCredentials: true }
            );
            // console.log(res.data);
            setReplies((prev) => ({ ...prev, [commentId]: res.data }));
        } catch (err: any) {
            toast({
                title: "Lỗi",
                description: err.response?.data?.message || "Không tải được phản hồi",
                variant: "destructive",
            });
        }
    };

    const handleSubmit = async () => {
        const length = newComment.length;

        // ✅ Kiểm tra độ dài
        if (length > MAX_COMMENT_LENGTH) {
            toast({
                title: "Bình luận quá dài!",
                description: `Hiện tại: ${length.toLocaleString()} / ${MAX_COMMENT_LENGTH.toLocaleString()} ký tự. 💡 Hãy xoá bớt emoji tùy chỉnh hoặc rút gọn nội dung.`,
                variant: "destructive",
            });
            return;
        }

        if (!newComment.trim()) return;

        setLoading(true);
        try {
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/comment/create-comment`,
                { chapter_id, content: newComment },
                { withCredentials: true }
            );
            setNewComment("");
            setMessageSent(true);
            fetchComments();
            if (res.data.success) {
                socket.emit("new-comment", { groupName });
            }
        } catch (err: any) {
            toast({
                title: "Lỗi",
                description: err.response?.data?.message || "Gửi comment thất bại",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        if (messageSent) {
            // reset flag sau khi đã clear box
            setMessageSent(false);
        }
    }, [messageSent]);


    const handleReplySubmit = async (parentId: string, chapterId: string, receiver_id: string) => {
        if (!replyText.trim()) return;
        setLoading(true);
        try {
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/reply/create-reply-chapter`,
                { comment_id: parentId, chapter_id: chapterId, content: replyText, receiver_id },
                { withCredentials: true }
            );
            setReplyText("");
            // setReplyingTo(null);
            fetchComments(); // reload lại số lượng phản hồi

            if (res.data.success) {
                socket.emit("new-reply", { chapterId, commentId: parentId, groupName });
                setMessageSent(true);
            }

            fetchReplies(parentId);
        } catch (err: any) {
            toast({
                title: "Lỗi",
                description: err.response?.data?.message || "Gửi phản hồi thất bại",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpvote = async (comment_id: string) => {
        try {
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/comment/upvote`,
                { comment_id },
                { withCredentials: true }
            );
            toast({
                title: "Thành công",
                description: res.data?.message || "Hành động thành công",
                variant: "success"
            });
            fetchComments();
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Không thể upvote";

            toast({
                title: "Lỗi",
                description: message,
                variant: "destructive",
            });
        }
    };


    const handleDownvote = async (comment_id: string) => {
        try {
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/comment/downvote`,
                { comment_id },
                { withCredentials: true }
            );
            toast({
                title: "Thành công",
                description: res.data?.message || "Hành động thành công",
                variant: "success"
            });
            fetchComments();
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Không thể downvote";

            toast({
                title: "Lỗi",
                description: message,
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        fetchComments();
    }, [chapter_id]);

    if (!mounted) return null;

    return (
        <>
            <div
                className={`
                rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 max-w-3xl mx-auto mb-20 mt-10`}
            >
                <h2 className="text-sm font-semibold">Bình luận</h2>

                <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scroll">
                    {comments.length === 0 && <p className="text-sm">Chưa có bình luận nào.</p>}

                    {comments.map((c) => (
                        <div
                            key={c._id}
                            className={`border rounded-xl p-3 text-sm transition-all duration-200 ${theme === "dark"
                                ? " border-[#2F2F2F]"
                                : " border-gray-300"
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="px-3 py-1 rounded-md bg-gradient-to-r from-blue-500 to-blue-400 text-white font-bold text-base shadow-sm">
                                    {c.user.username}
                                </span>
                                <span className="text-[11px]">
                                    {new Date(c.createdAt).toLocaleString()}
                                </span>
                            </div>

                            <div
                                className="text-sm whitespace-pre-wrap break-words"
                                dangerouslySetInnerHTML={{ __html: c.content }}
                            ></div>


                            {/* React + Reply Count */}
                            <div className="flex flex-wrap gap-2 mt-2 text-xs items-center">
                                <VoteButtons
                                    comment={c}
                                    onUpvote={() => {
                                        if (!user) {
                                            toast({
                                                title: "Cần đăng nhập",
                                                description: "Bạn phải đăng nhập để vote.",
                                                variant: "destructive",
                                            });
                                            return;
                                        }
                                        handleUpvote(c._id);
                                    }}
                                    onDownvote={() => {
                                        if (!user) {
                                            toast({
                                                title: "Cần đăng nhập",
                                                description: "Bạn phải đăng nhập để vote.",
                                                variant: "destructive",
                                            });
                                            return;
                                        }
                                        handleDownvote(c._id);
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        if (replyingTo === c._id) {
                                            // console.log("tắt");
                                            setReplyingTo(null);
                                        } else {
                                            setReplyingTo(c._id);
                                            // console.log("mở");
                                            fetchReplies(c._id);
                                        }
                                    }}
                                    className="ml-2 text-blue-500 hover:underline flex items-center gap-1"
                                >
                                    <MessageSquare className="h-3 w-3" /> Phản hồi
                                </button>

                                {/* 🔹 Hiển thị số reply + username */}
                                {c.replyCount && (
                                    <span className="ml-2 text-gray-500">
                                        {c.replyCount}
                                    </span>
                                )}
                            </div>

                            {/* Danh sách reply */}
                            {replyingTo === c._id && (
                                <ReplySection
                                    comment={c}
                                    replies={replies[c._id] || []}
                                    theme={theme}
                                    replyingTo={replyingTo}
                                    replyText={replyText}
                                    setReplyText={setReplyText}
                                    loading={loading}
                                    handleReplySubmit={handleReplySubmit}
                                    fetchReplies={fetchReplies}
                                    user={user}
                                    messageSent={messageSent}
                                    setMessageSent={setMessageSent}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Ô nhập bình luận mới */}
                {user && (user.role === "user" || user.role === "author") ? (
                    <div className="space-y-2">
                        {/* <textarea
                            className="w-full border border-slate-300 rounded-xl p-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="Viết bình luận..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            maxLength={1000}
                            rows={4}
                        /> */}
                        <div>
                            <EmojiInputBox
                                onChange={(newComment) => {
                                    setNewComment(newComment)
                                    // console.log("📨 Data từ EmojiInputBox:", html)
                                }}
                                clear={messageSent}
                            />
                        </div>

                        <div className="flex justify-between items-center text-xs text-slate-500">
                            <span>{newComment.length}/300000 ký tự</span>
                            <button
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-700 disabled:bg-gray-400 border border-amber-100"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                Gửi
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm">
                        <a href="/login" className="text-blue-500 hover:underline">
                            Đăng nhập
                        </a>{" "}
                        /{" "}
                        <a href="/register" className="text-blue-500 hover:underline ml-1">
                            Đăng ký
                        </a>{" "}
                        để bình luận.
                    </p>
                )}
            </div>
            <Footer />
        </>
    );
}
