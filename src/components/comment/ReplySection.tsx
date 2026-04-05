"use client";

import { Flag, Loader2, Send } from "lucide-react";
import axios from "axios";
import { useEffect } from "react";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

import ReplyVoteButtons from "./ReplyVoteButtons";
import EmojiInputBox from "../emoji/EmojiInputBox";

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
  setMessageSent,
  onReportReply,
}: {
  comment: any;
  replies: any[];
  theme: any;
  replyingTo: string | null;
  replyText: string;
  setReplyText: (v: string) => void;
  loading: boolean;
  handleReplySubmit: (
    parentId: string,
    chapterId: string,
    receiver_id: string
  ) => void;
  fetchReplies: any;
  user: any;
  messageSent: any;
  setMessageSent: any;
  onReportReply: (reply: any) => void;
}) {
  const { toast } = useToast();

  useEffect(() => {
    if (messageSent) {
      setMessageSent(false);
    }
  }, [messageSent, setMessageSent]);

  if (replyingTo !== comment._id) return null;

  const handleUpvoteReply = async (reply_id: string) => {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reply/upvote`,
        { reply_id },
        { withCredentials: true }
      );
      toast({
        title: "Success",
        description: res.data?.message || "Upvote successful",
        variant: "success",
      });
      fetchReplies(comment._id);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Unable to upvote reply",
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
        title: "Success",
        description: res.data?.message || "Downvote successful",
        variant: "success",
      });
      fetchReplies(comment._id);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Unable to downvote reply",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-2 ml-4 space-y-2 border-l pl-3">
      {replies && replies.length > 0 ? (
        replies.map((reply) => {
          const replyOwnerId =
            reply?.user?._id || reply?.user_id?._id || reply?.user_id || null;
          const isOwnReply =
            !!user?.user_id &&
            !!replyOwnerId &&
            String(user.user_id) === String(replyOwnerId);

          return (
            <div
              key={reply._id}
              className={`rounded-lg border p-2 ${
                theme === "dark"
                  ? "border-[#2F2F2F] bg-[#151515]"
                  : "border-gray-300 bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-blue-500">
                  {reply.user.username}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[10px]">
                    {new Date(reply.createdAt).toLocaleString()}
                  </span>

                  {!isOwnReply ? (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      className="h-8 rounded-lg border-rose-200 bg-rose-50 px-2.5 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                      onClick={() => onReportReply(reply)}
                      title={`Report reply from ${reply.user.username}`}
                    >
                      <Flag className="h-3.5 w-3.5" />
                      <span className="ml-1 text-xs font-medium">Report</span>
                    </Button>
                  ) : null}
                </div>
              </div>

              <div
                className="text-sm break-words whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: reply.content }}
              ></div>

              <div className="mt-1 flex items-center gap-2">
                <ReplyVoteButtons
                  reply={reply}
                  onUpvote={() => {
                    if (!user) return;
                    toast({
                      title: "Login required",
                      description: "You must log in to vote.",
                      variant: "destructive",
                    });
                    handleUpvoteReply(reply._id);
                  }}
                  onDownvote={() => {
                    if (!user) return;
                    toast({
                      title: "Login required",
                      description: "You must log in to vote.",
                      variant: "destructive",
                    });
                    handleDownvoteReply(reply._id);
                  }}
                />
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-xs italic text-gray-500">No replies.</p>
      )}

      {user && (user.role === "user" || user.role === "author") ? (
        <div className="mt-2">
          <div>
            <EmojiInputBox
              onChange={(nextReplyText) => {
                setReplyText(nextReplyText);
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
            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-amber-100 bg-black px-3 py-2 text-xs text-white hover:bg-gray-700 disabled:bg-gray-400"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            Send
          </button>
        </div>
      ) : null}
    </div>
  );
}
