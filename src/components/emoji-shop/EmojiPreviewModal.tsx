"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
            <DialogContent
                className="
                    w-fit max-w-[95vw]
                    h-fit max-h-[85vh]
                    overflow-y-auto
                "
            >
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">
                        {pack?.name}
                    </DialogTitle>
                </DialogHeader>

                <div
                    className="
                        grid gap-4 p-6 justify-center
                        grid-cols-3 sm:grid-cols-4 md:grid-cols-5
                    "
                >
                    {pack?.emojis?.map((emoji: any, idx: number) => (
                        <div
                            key={idx}
                            className="
                                relative
                                w-[80px] h-[80px]
                                sm:w-[90px] sm:h-[90px]
                                md:w-[100px] md:h-[100px]
                            "
                        >
                            <Image
                                src={`${process.env.NEXT_PUBLIC_API_URL}${emoji.skins[0].src}`}
                                alt={`emoji-${idx}`}
                                fill
                                sizes="100px"
                                className="object-contain rounded"
                            />
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}