"use client";
import { ArrowBigUp, ArrowBigDown } from "lucide-react";

export default function ReplyVoteButtons({
    reply,
    onUpvote,
    onDownvote,
}: {
    reply: any;
    onUpvote: () => void;
    onDownvote: () => void;
}) {
    const userVote = reply.userVote; // "up" | "down" | null

    return (
        <div className="flex items-center gap-1">
            <button
                onClick={onUpvote}
                className={`p-1 rounded-md transition-all hover:bg-green-200 ${userVote === "up" ? "text-green-600" : ""
                    }`}
            >
                <ArrowBigUp
                    className={`w-4 h-4 ${userVote === "up" ? "text-green-600" : ""
                        }`}
                />
            </button>

            <button
                onClick={onDownvote}
                className={`p-1 rounded-md transition-all hover:bg-red-200 ${userVote === "down" ? "text-red-600" : ""
                    }`}
            >
                <ArrowBigDown
                    className={`w-4 h-4 ${userVote === "down" ? "text-red-600" : ""
                        }`}
                />
            </button>

            {/* Tổng up/down */}
            <span className="text-xs text-gray-500 ml-1">
                {reply.upvotes || 0}↑ / {reply.downvotes || 0}↓
            </span>
        </div>
    );
}
