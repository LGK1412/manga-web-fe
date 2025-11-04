"use client";
import { Loader2, Send } from "lucide-react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import ReplyVoteButtons from "./ReplyVoteButtons";
import EmojiInputBox from "../emoji/EmojiInputBox";
import { useEffect, useState } from "react";

export default function ReplySection({
    comment,
    replies,
    theme,
    replyingTo,
    replyText,
    setReplyText,
    loading,
    handleReplySubmit,
    fetchReplies,
    user,
    messageSent,
    setMessageSent
}: {
    comment: any;
    replies: any[];
    theme: any;
    replyingTo: string | null;
    replyText: string;
    setReplyText: (v: string) => void;
    loading: boolean;
    handleReplySubmit: (parentId: string, chapterId: string, receiver_id: string) => void;
    fetchReplies: any;
    user: any;
    messageSent: any,
    setMessageSent: any
}) {

    const { toast } = useToast()

    useEffect(() => {
        if (messageSent) {
            // reset flag sau khi đã clear box
            setMessageSent(false);
        }
    }, [messageSent]);

    if (replyingTo !== comment._id) return null;

    // 🔹 API gọi vote reply
    const handleUpvoteReply = async (reply_id: string) => {
        try {
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/reply/upvote`,
                { reply_id },
                { withCredentials: true }
            );
            toast({
                title: "Thành công",
                description: res.data?.message || "Upvote thành công",
                variant: "success",
            });
            fetchReplies(comment._id)
        } catch (err: any) {
            toast({
                title: "Lỗi",
                description: err.response?.data?.message || "Không thể upvote reply",
                variant: "destructive",
            });
        }
    };

    const handleDownvoteReply = async (reply_id: string) => {
        try {
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/reply/downvote`,
                { reply_id },
                { withCredentials: true }
            );
            toast({
                title: "Thành công",
                description: res.data?.message || "Downvote thành công",
                variant: "success",
            });
            fetchReplies(comment._id)
        } catch (err: any) {
            toast({
                title: "Lỗi",
                description: err.response?.data?.message || "Không thể downvote reply",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="mt-2 ml-4 border-l pl-3 space-y-2">
            {/* List replies */}
            {replies && replies.length > 0 ? (
                replies.map((r) => (
                    <div
                        key={r._id}
                        className={`p-2 rounded-lg border ${theme === "dark"
                            ? "bg-[#151515] border-[#2F2F2F]"
                            : "bg-gray-50 border-gray-300"
                            }`}
                    >
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-blue-500 text-sm">
                                {r.user.username}
                            </span>
                            <span className="text-[10px]">
                                {new Date(r.createdAt).toLocaleString()}
                            </span>
                        </div>

                        {/* <p
                            className={`text-sm whitespace-pre-wrap break-words`}
                        >
                            {r.content}
                        </p> */}
                        <div
                            className="text-sm whitespace-pre-wrap break-words"
                            dangerouslySetInnerHTML={{ __html: r.content }}
                        ></div>

                        {/* 🔹 Upvote / Downvote */}
                        <div className="flex items-center gap-2 mt-1" >
                            <ReplyVoteButtons
                                reply={r}
                                onUpvote={() => {
                                    if (!user) return;
                                    toast({
                                        title: "Cần đăng nhập",
                                        description: "Bạn phải đăng nhập để vote.",
                                        variant: "destructive",
                                    });
                                    handleUpvoteReply(r._id);
                                }}
                                onDownvote={() => {
                                    if (!user) return;
                                    toast({
                                        title: "Cần đăng nhập",
                                        description: "Bạn phải đăng nhập để vote.",
                                        variant: "destructive",
                                    });
                                    handleDownvoteReply(r._id);
                                }}
                            />
                        </div>
                    </div >
                ))
            ) : (
                <p className="text-xs text-gray-500 italic">Không có phản hồi.</p>
            )
            }

            {/* Textbox reply */}
            {
                user && (user.role === "user" || user.role === "author") ? (
                    <div className="mt-2">
                        <div>
                            <EmojiInputBox
                                onChange={(replyText) => {
                                    setReplyText(replyText)
                                    // console.log("📨 Data từ EmojiInputBox:", html)
                                }}
                                clear={messageSent}
                            />
                        </div>
                        <button
                            onClick={() => {
                                if (replyText.trim().length === 0) return;
                                if (replyText.length > 300000) return;
                                handleReplySubmit(comment._id, comment.chapter_id, comment.user._id);
                            }}
                            disabled={loading || replyText.length > 300000}
                            className="mt-2 inline-flex items-center gap-1 px-3 py-2 bg-black text-white text-xs rounded-lg hover:bg-gray-700 disabled:bg-gray-400 border border-amber-100"
                        >
                            {loading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Send className="h-3 w-3" />
                            )}
                            Gửi
                        </button>
                    </div>
                ) : (null)
            }
        </div >
    );
}
