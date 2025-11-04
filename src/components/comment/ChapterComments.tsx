// components/ChapterComments.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Send, MessageSquare, Flag } from "lucide-react";
import axios from "axios";
import { Footer } from "../footer";
import { useTheme } from "next-themes";
import Cookies from "js-cookie";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import VoteButtons from "./VoteButtons";
import ReplySection from "./ReplySection";
import EmojiInputBox from "../emoji/EmojiInputBox";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

let socket: Socket | null = null;

export default function ChapterComments() {
  const params = useParams();
  const chapter_id = params.id as string;

  const { theme } = useTheme();
  const { toast } = useToast();

  // ===== Core states =====
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any | undefined>();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== Replies & sockets =====
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [groupName, setGroupName] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const replyingToRef = useRef(replyingTo);

  const MAX_COMMENT_LENGTH = 300000;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    replyingToRef.current = replyingTo;
  }, [replyingTo]);

  // ===== Socket connect =====
  useEffect(() => {
    // Tránh chạy ở SSR
    if (typeof window === "undefined") return;

    socket = io("http://localhost:4001", {
      transports: ["websocket"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      // console.log("Socket connected:", socket?.id);
      socket?.emit("join-group", { url: window.location.href });
    });

    socket.on("disconnect", () => {
      // console.log("Socket disconnected");
    });

    socket.on("user-joined", (data: any) => {
      setGroupName(data.groupName);
    });

    socket.on("refresh-reply", (data: { commentId: string }) => {
      if (replyingToRef.current === data.commentId) {
        fetchReplies(data.commentId);
      }
    });

    socket.on("refresh-comment", () => {
      fetchComments();
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, []);

  // ===== Read cookie user =====
  useEffect(() => {
    if (!mounted) return;
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

  // ===== API calls =====
  const fetchComments = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/comment/all-comment-chapter/${chapter_id}`,
        { withCredentials: true }
      );

      // Back-end của bạn có 2 dạng: [] hoặc { comments: [] }
      const data = Array.isArray(res.data) ? res.data : res.data?.comments || [];
      setComments(data);
      setError(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Không tải được bình luận";
      setError(msg);
      toast({
        title: "Lỗi",
        description: msg,
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

    if (length > MAX_COMMENT_LENGTH) {
      toast({
        title: "Bình luận quá dài!",
        description: `Hiện tại: ${length.toLocaleString()} / ${MAX_COMMENT_LENGTH.toLocaleString()} ký tự. Hãy xoá bớt emoji tùy chỉnh hoặc rút gọn nội dung.`,
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
      await fetchComments();

      if (res.data?.success) {
        socket?.emit("new-comment", { groupName });
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

  const handleReplySubmit = async (
    parentId: string,
    chapterId: string,
    receiver_id: string
  ) => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reply/create-reply-chapter`,
        { comment_id: parentId, chapter_id: chapterId, content: replyText, receiver_id },
        { withCredentials: true }
      );
      setReplyText("");
      await fetchComments(); // cập nhật lại replyCount

      if (res.data?.success) {
        socket?.emit("new-reply", { chapterId, commentId: parentId, groupName });
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
        variant: "success",
      });
      fetchComments();
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "Không thể upvote";
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
        variant: "success",
      });
      fetchComments();
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "Không thể downvote";
      toast({
        title: "Lỗi",
        description: message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (messageSent) setMessageSent(false);
  }, [messageSent]);

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter_id]);

  if (!mounted) return null;

  // ===== Report dialog states =====
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 max-w-3xl mx-auto mb-20 mt-10">
        <h2 className="text-sm font-semibold">Bình luận</h2>

        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scroll">
          {comments.length === 0 && <p className="text-sm">Chưa có bình luận nào.</p>}

          {comments.map((c) => {
            const username =
              c?.user?.username || c?.user_id?.username || "Ẩn danh";

            return (
              <div
                key={c._id}
                className={`border rounded-xl p-3 text-sm transition-all duration-200 ${
                  theme === "dark" ? "border-[#2F2F2F]" : "border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-3 py-1 rounded-md bg-gradient-to-r from-blue-500 to-blue-400 text-white font-bold text-base shadow-sm">
                    {username}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px]">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      type="button"
                      className="p-1"
                      onClick={() => {
                        setReportTarget(c);
                        setReportDialogOpen(true);
                      }}
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div
                  className="text-sm whitespace-pre-wrap break-words"
                  // Nếu content đã là HTML từ EmojiInputBox
                  dangerouslySetInnerHTML={{ __html: c.content }}
                />

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
                        setReplyingTo(null);
                      } else {
                        setReplyingTo(c._id);
                        fetchReplies(c._id);
                      }
                    }}
                    className="ml-2 text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <MessageSquare className="h-3 w-3" /> Phản hồi
                  </button>

                  {c.replyCount ? (
                    <span className="ml-2 text-gray-500">{c.replyCount}</span>
                  ) : null}
                </div>

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
            );
          })}
        </div>

        {/* Ô nhập bình luận mới */}
        {user && (user.role === "user" || user.role === "author") ? (
          <div className="space-y-2">
            <EmojiInputBox
              onChange={(html) => {
                setNewComment(html);
              }}
              clear={messageSent}
            />

            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>{newComment.length}/{MAX_COMMENT_LENGTH} ký tự</span>
              <button
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-700 disabled:bg-gray-400 border border-amber-100"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Gửi
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm">
            <a href="/login" className="text-blue-500 hover:underline">Đăng nhập</a>{" "}
            /{" "}
            <a href="/register" className="text-blue-500 hover:underline ml-1">
              Đăng ký
            </a>{" "}
            để bình luận.
          </p>
        )}

        {/* Error */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Report Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Báo cáo bình luận</DialogTitle>
              <DialogDescription>
                Vui lòng chọn lý do và mô tả chi tiết (nếu có).
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Lý do</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                >
                  <option value="Spam">Spam</option>
                  <option value="Inappropriate">Nội dung không phù hợp</option>
                  <option value="Harassment">Quấy rối / xúc phạm</option>
                  <option value="Other">Khác</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Mô tả chi tiết
                </label>
                <Textarea
                  placeholder="Mô tả vấn đề bạn gặp phải..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={async () => {
                  if (!user) {
                    toast({
                      title: "Chưa đăng nhập",
                      description: "Vui lòng đăng nhập để gửi báo cáo.",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (!reportTarget?._id) {
                    toast({
                      title: "Thiếu mục tiêu báo cáo",
                      description: "Không tìm thấy bình luận cần báo cáo.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setIsSubmittingReport(true);
                  try {
                    await axios.post(
                      `${process.env.NEXT_PUBLIC_API_URL}/api/reports`,
                      {
                        reporter_id: user.user_id,
                        target_type: "Comment",
                        target_id: reportTarget._id,
                        reason: reportReason,
                        description: reportDescription.trim() || undefined,
                      },
                      { withCredentials: true }
                    );
                    toast({
                      title: "Gửi báo cáo thành công ✅",
                      description: "Cảm ơn bạn đã gửi phản hồi.",
                    });
                    setReportDialogOpen(false);
                    setReportDescription("");
                    setReportReason("Spam");
                  } catch (err: any) {
                    toast({
                      title: "Lỗi khi gửi báo cáo",
                      description:
                        err.response?.data?.message || "Vui lòng thử lại sau.",
                      variant: "destructive",
                    });
                  } finally {
                    setIsSubmittingReport(false);
                  }
                }}
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? "Đang gửi..." : "Gửi báo cáo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Footer />
    </>
  );
}
