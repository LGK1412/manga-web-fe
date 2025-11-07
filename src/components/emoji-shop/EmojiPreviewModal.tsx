"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";

export default function EmojiPreviewModal({
    pack,
    onClose,
}: {
    pack: any;
    onClose: () => void;
}) {
    return (
        <Dialog open={!!pack} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-[95vw] h-[70vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">{pack.name}</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-8 gap-4 p-6 justify-items-center">
                    {pack.emojis?.map((emoji: any, idx: number) => (
                        <div key={idx} className="relative w-20 h-20">
                            <Image
                                src={`${process.env.NEXT_PUBLIC_API_URL}${emoji.skins[0].src}`}
                                alt={`emoji-${idx}`}
                                fill
                                className="object-contain rounded"
                            />
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
