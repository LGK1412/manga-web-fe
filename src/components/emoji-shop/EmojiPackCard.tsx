import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

export default function EmojiPackCard({
    pack,
    onPreview,
    onBought,
}: {
    pack: any;
    onPreview: () => void;
    onBought?: (packId: string) => void;
}) {
    const { toast } = useToast();

    const handleBuy = async (pack_id: string, price: string) => {
        try {
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/user/buy-emoji-pack`,
                { pack_id, price },
                { withCredentials: true }
            );

            if (res.data.success) {
                toast({
                    title: "Mua thành công!",
                    description: "Bạn đã mua Emoji Pack thành công.",
                    variant: "success",
                });
                onBought?.(pack_id);
            }
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                const message =
                    error.response?.data?.message || "Đã xảy ra lỗi khi mua Emoji Pack.";

                toast({
                    title: "Lỗi mua hàng",
                    description: message,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Lỗi không xác định",
                    description: "Vui lòng thử lại sau.",
                    variant: "destructive",
                });
            }
        }
    };

    // Lấy ảnh đầu tiên trong danh sách emoji (nếu có)
    const coverEmoji =
        pack.emojis && pack.emojis.length > 0
            ? `${process.env.NEXT_PUBLIC_API_URL}${pack.emojis[0].skins[0].src}`
            : "/placeholder.svg?height=96&width=96&text=Emoji";

    return (
        <Card className="hover:shadow-lg transition-all">
            <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="relative w-24 h-24 mb-3">
                    <Image
                        src={coverEmoji}
                        alt={pack.name}
                        fill
                        className="object-cover rounded-md"
                    />
                </div>
                <h3 className="font-semibold text-lg">{pack.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                    {pack.price > 0 ? `${pack.price} xu` : "Miễn phí"}
                </p>
                <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={onPreview}>
                        Xem trước
                    </Button>
                    <Button size="sm" onClick={() => handleBuy(pack._id, pack.price)}>
                        Mua
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
