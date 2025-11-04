"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Gift, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type DonationItem = {
  _id: string;
  name: string;
  image: string;
  description?: string;
  rarity: string;
  price: number;
  isAvailable: boolean;
};

const rarityColors: Record<string, string> = {
  common: "bg-gray-200 text-gray-800",
  rare: "bg-blue-200 text-blue-800",
  epic: "bg-purple-200 text-purple-800",
  legendary: "bg-yellow-200 text-yellow-800",
};

interface DonationModalProps {
  open: boolean;
  onClose: () => void;
  senderId: string;
  receiverId: string;
}

export default function DonationShopModal({
  open,
  onClose,
  senderId,
  receiverId,
}: DonationModalProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRarity, setSelectedRarity] = useState<string>("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DonationItem | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) fetchItems();
  }, [selectedRarity, open]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/donation/items`,
        {
          params: {
            onlyAvailable: true,
            rarity: selectedRarity || undefined,
          },
        }
      );
      setItems(res.data.data);
      setQuantities({});
    } catch (error) {
      console.error("Failed to fetch donation items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (id: string, value: number) => {
    if (value < 1) value = 1;
    setQuantities((prev) => ({ ...prev, [id]: value }));
  };

  const handleOpenMessageModal = (item: DonationItem) => {
    const quantity = quantities[item._id] || 1;
    setSelectedItem(item);
    setSelectedQuantity(quantity);
    setMessage("");
    setMessageModalOpen(true);
  };

  const handleConfirmDonation = async () => {
    if (!selectedItem || !receiverId || !senderId)
      return toast({
        title: "Không thể gửi quà",
        description: "Thiếu thông tin khi gửi",
      });

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/donation/send`,
        {
          senderId: senderId,
          receiverId,
          itemId: selectedItem?._id,
          quantity: selectedQuantity,
          message,
        },
        { withCredentials: true }
      );

      toast({
        title: "Thành công",
        description: `Tặng ${selectedQuantity} ${selectedItem?.name} thành công!`,
      });
    } catch (err: any) {
      toast({
        title: "Gửi lỗi",
        description: err.response?.data?.message || "Không thể tặng quà",
      });
    } finally {
      setMessageModalOpen(false);
      setSelectedItem(null);
      setMessage("");
      onClose();
    }
  };

  const rarities = ["", "common", "rare", "epic", "legendary"];

  return (
    <>
      {/* SHOP MODAL */}
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-white">
          <DialogHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-yellow-500 w-6 h-6" />
              <DialogTitle className="text-2xl font-bold">
                Kho quà tặng
              </DialogTitle>
            </div>
            <DialogDescription className="text-gray-500">
              Chọn quà và số lượng để tặng
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end mb-4">
            <select
              value={selectedRarity}
              onChange={(e) => setSelectedRarity(e.target.value)}
              className="border rounded-lg px-3 py-2 text-gray-700 focus:outline-none"
            >
              {rarities.map((r) => (
                <option key={r} value={r}>
                  {r === ""
                    ? "Tất cả độ hiếm"
                    : r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-gray-500 py-10">
              Không có vật phẩm nào.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => {
                const quantity = quantities[item._id] || 1;
                const totalPrice = item.price * quantity;

                return (
                  <Card
                    key={item._id}
                    className="rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300"
                  >
                    <CardHeader className="relative p-0">
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL}/donation-items/${item.image}`}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-t-2xl"
                      />
                      <div
                        className={`absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded ${
                          rarityColors[item.rarity] ||
                          "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {item.rarity}
                      </div>
                    </CardHeader>

                    <CardContent className="p-3 space-y-2 text-center">
                      <CardTitle className="text-base font-semibold">
                        {item.name}
                      </CardTitle>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {item.description}
                      </p>

                      <p className="text-primary font-bold text-sm">
                        {item.price.toLocaleString()} điểm / quà
                      </p>

                      <div className="flex items-center justify-center gap-2 mt-2">
                        <label className="text-xs text-gray-600">
                          Số lượng:
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) =>
                            handleQuantityChange(
                              item._id,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-16 border rounded-lg px-2 py-1 text-center text-sm focus:outline-none"
                        />
                      </div>

                      <p className="text-xs text-gray-600">
                        Tổng:{" "}
                        <span className="font-semibold text-primary">
                          {totalPrice.toLocaleString()} điểm
                        </span>
                      </p>

                      <Button
                        className="w-full mt-2 text-sm"
                        onClick={() => handleOpenMessageModal(item)}
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        Tặng ngay
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MESSAGE MODAL */}
      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Gửi lời nhắn kèm quà
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Bạn có thể để trống nếu không muốn gửi lời nhắn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Quà:{" "}
              <span className="font-semibold text-primary">
                {selectedItem?.name}
              </span>{" "}
              × <span className="font-semibold">{selectedQuantity}</span>
            </p>
            <Textarea
              placeholder="Nhập lời nhắn của bạn..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full h-24 resize-none border rounded-lg p-2 text-sm focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setMessageModalOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleConfirmDonation}>Xác nhận tặng</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
