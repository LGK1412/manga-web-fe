import { ArrowBigUp, ArrowBigDown } from "lucide-react";

export default function VoteButtons({ comment, onUpvote, onDownvote }: any) {
    const userReaction = comment.userReaction; // hoặc tự tính từ backend: "upvote" / "downvote" / null
    // console.log(comment)

    const upvotes = comment.upvotes || 0;
    const downvotes = comment.downvotes || 0;

    return (
        <div className="flex items-center gap-1">
            <button
                onClick={onUpvote}
                className={`p-1 rounded-md transition-all ${userReaction === "upvote"
                    ? "bg-green-200 text-green-600"
                    : "hover:bg-green-300"
                    }`}
            >
                <ArrowBigUp
                    className={`w-4 h-4 ${comment.userVote === 'up' ? 'text-green-600' : ''}`}
                />
            </button>

            <button
                onClick={onDownvote}
                className={`p-1 rounded-md transition-all ${userReaction === "downvote"
                    ? "bg-red-200 text-red-600"
                    : "hover:bg-red-300"
                    }`}
            >
                <ArrowBigDown
                    className={`w-4 h-4 ${comment.userVote === 'down' ? 'text-red-600' : ''}`}
                />
            </button>
            <span className="text-xs text-gray-500 ml-1">
                {upvotes}↑ / {downvotes}↓
            </span>
        </div>
    );
}
