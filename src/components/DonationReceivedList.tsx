"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gift, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { Button } from "@/components/ui/button";

export default function DonationReceivedList() {
  const [receivedGifts, setReceivedGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReceived = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/donation/received`,
        { withCredentials: true }
      );
      setReceivedGifts(res.data || []);
    } catch (err) {
      console.error("Failed to fetch received gifts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/donation/mark-read`,
        { id },
        { withCredentials: true }
      );
      setReceivedGifts((prev) =>
        prev.map((gift) => (gift._id === id ? { ...gift, isRead: true } : gift))
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  useEffect(() => {
    fetchReceived();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5" /> Quà bạn được tặng
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="text-center py-6 text-muted-foreground">
            Đang tải danh sách quà...
          </div>
        ) : receivedGifts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            Bạn chưa được tặng quà nào
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {receivedGifts.map((gift) => (
              <div
                key={gift._id}
                className={`flex items-center gap-4 p-4 border-b last:border-b-0 ${
                  !gift.isRead ? "bg-muted/30" : ""
                } hover:bg-muted/50 transition-colors`}
              >
                <Avatar className="w-12 h-12 flex-shrink-0">
                  <AvatarImage
                    src={
                      gift.sender?.avatar
                        ? `${process.env.NEXT_PUBLIC_API_URL}/assets/avatars/${gift.sender.avatar}`
                        : "/placeholder.svg"
                    }
                  />
                  <AvatarFallback>
                    {gift.sender?.username?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    Từ{" "}
                    <span className="text-blue-500">
                      {gift.sender?.username}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {gift.item?.name} × {gift.quantity}
                  </p>
                  {gift.message && (
                    <p className="text-xs italic text-muted-foreground mt-1">
                      “{gift.message}”
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(gift.sendAt).toLocaleString("vi-VN")}
                  </p>
                </div>

                {gift.isRead ? (
                  <CheckCircle2 className="text-green-500 w-5 h-5" />
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkAsRead(gift._id)}
                  >
                    Đã nhận
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
