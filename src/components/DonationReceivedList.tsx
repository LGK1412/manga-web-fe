"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gift, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

export default function DonationReceivedList() {
  const [receivedGifts, setReceivedGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGift, setActiveGift] = useState<any>(null);
  const [processingAll, setProcessingAll] = useState(false);

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

  type RarityType = "common" | "rare" | "epic" | "legendary";

  interface RarityAnimation {
    color: string;
    confetti: {
      particleCount: number;
      spread: number;
      startVelocity?: number;
      scalar?: number;
    };
  }

  const rarityAnimations: Record<RarityType, RarityAnimation> = {
    common: {
      color: "#9ca3af",
      confetti: { particleCount: 100, spread: 60 },
    },
    rare: {
      color: "#3b82f6",
      confetti: { particleCount: 140, spread: 80, startVelocity: 60 },
    },
    epic: {
      color: "#a855f7",
      confetti: {
        particleCount: 200,
        spread: 100,
        startVelocity: 75,
        scalar: 1.4,
      },
    },
    legendary: {
      color: "#f59e0b",
      confetti: {
        particleCount: 300,
        spread: 140,
        startVelocity: 100,
        scalar: 1.7,
      },
    },
  };

  const handleMarkAsRead = async (gift: any) => {
    const rarity = (gift.item?.rarity as RarityType) || "common";
    setActiveGift(gift);

    setTimeout(() => {
      const anim = rarityAnimations[rarity];
      confetti({
        particleCount: anim.confetti.particleCount,
        spread: anim.confetti.spread,
        startVelocity: anim.confetti.startVelocity || 30,
        scalar: anim.confetti.scalar || 1,
        origin: { y: 0.8 },
        colors: [anim.color],
      });
    }, 1200);

    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/donation/mark-read`,
        { id: gift._id },
        { withCredentials: true }
      );

      setTimeout(() => {
        setReceivedGifts((prev) =>
          prev.map((g) => (g._id === gift._id ? { ...g, isRead: true } : g))
        );
        setActiveGift(null);
      }, 1800);
    } catch (err) {
      console.error("Failed to mark as read:", err);
      setActiveGift(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = receivedGifts.filter((g) => !g.isRead).map((g) => g._id);
    if (unreadIds.length === 0) return;

    setProcessingAll(true);
    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/donation/mark-read`,
        { ids: unreadIds },
        { withCredentials: true }
      );

      // Cập nhật state cục bộ
      setReceivedGifts((prev) =>
        prev.map((g) => (g.isRead ? g : { ...g, isRead: true }))
      );
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setProcessingAll(false);
    }
  };

  useEffect(() => {
    fetchReceived();
  }, []);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" /> Gifts Received
          </CardTitle>

          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={processingAll || receivedGifts.every((g) => g.isRead)}
          >
            {processingAll ? "Processing..." : "Claim All"}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-6 text-muted-foreground">
              Loading gift list...
            </div>
          ) : receivedGifts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              You haven't received any gifts
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
                      From{" "}
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
                      {new Date(gift.sendAt).toLocaleString("en-US")}
                    </p>
                  </div>

                  {gift.isRead ? (
                    <CheckCircle2 className="text-green-500 w-5 h-5" />
                  ) : (
                    <Button
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={() => handleMarkAsRead(gift)}
                    >
                      Claim
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {activeGift && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/70 z-[9999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.img
              key={activeGift._id}
              src={`${process.env.NEXT_PUBLIC_API_URL}/donation-items/${activeGift.item?.image}`}
              alt={activeGift.item?.name}
              initial={{ scale: 0, rotate: -20, opacity: 0 }}
              animate={{
                scale: [0, 1.2, 1],
                rotate: [0, 10, 0],
                opacity: 1,
                filter: "drop-shadow(0 0 25px rgba(255,255,255,0.7))",
              }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="w-64 h-64 object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
