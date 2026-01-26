import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";

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
    const [open, setOpen] = useState(false);

    const handleBuy = async (pack_id: string, price: string) => {
        try {
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/user/buy-emoji-pack`,
                { pack_id, price },
                { withCredentials: true }
            );

            if (res.data.success) {
                toast({
                    title: "Purchase successful!",
                    description: "You have successfully purchased the Emoji Pack.",
                    variant: "success",
                });
                onBought?.(pack_id);
            }
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                const message =
                    error.response?.data?.message || "An error occurred while purchasing Emoji Pack.";

                toast({
                    title: "Purchase error",
                    description: message,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Unknown error",
                    description: "Please try again later.",
                    variant: "destructive",
                });
            }
        }
    };

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
                    {pack.price > 0 ? `${pack.price} points` : "Free"}
                </p>
                <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={onPreview}>
                        Preview
                    </Button>

                    {/* Button kích hoạt dialog */}
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">Buy</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Confirm purchase</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to buy "{pack.name}" for{" "}
                                    {pack.price > 0 ? pack.price + " points" : "Free"}?
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex justify-end gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => setOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => {
                                        handleBuy(pack._id, pack.price);
                                        setOpen(false);
                                    }}
                                >
                                    Confirm
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    );
}
