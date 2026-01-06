"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gift, User2 } from "lucide-react";
import axios from "axios";

export default function DonationSentList() {
  const [sentGifts, setSentGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSentGifts = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/donation/sent`,
          { withCredentials: true }
        );
        setSentGifts(res.data || []);
      } catch (err) {
        console.error("Failed to fetch sent gifts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSentGifts();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5" /> Gifts Sent History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="text-center py-6 text-muted-foreground">
            Loading gift list...
          </div>
        ) : sentGifts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            You haven't sent any gifts
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {sentGifts.map((gift) => (
              <div
                key={gift._id}
                className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="w-12 h-12 flex-shrink-0">
                  <AvatarImage
                    src={
                      gift.receiver?.avatar
                        ? `${process.env.NEXT_PUBLIC_API_URL}/assets/avatars/${gift.receiver.avatar}`
                        : "/placeholder.svg"
                    }
                  />
                  <AvatarFallback>
                    {gift.receiver?.username?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    Sent to{" "}
                    <span className="text-blue-500">
                      {gift.receiver?.username}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {gift.item?.name} × {gift.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total: {gift.totalPrice.toLocaleString()} points
                  </p>
                  {gift.message && (
                    <p className="text-xs italic text-muted-foreground mt-1">
                      “{gift.message}”
                    </p>
                  )}
                </div>

                <div className="text-xs text-right text-muted-foreground">
                  {new Date(gift.sendAt).toLocaleString("en-US")}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
