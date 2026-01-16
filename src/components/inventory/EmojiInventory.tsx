"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import EmojiPreviewModal from "@/components/emoji-shop/EmojiPreviewModal";

export default function EmojiInventory({ emojiPacks }: { emojiPacks: any[] }) {
    const [selectedPack, setSelectedPack] = useState<any | null>(null);

    if (!emojiPacks?.length)
        return (
            <div className="text-center text-muted-foreground py-12">
                You don't own any Emoji Packs yet.
            </div>
        );

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {emojiPacks.map((pack) => {
                    const cover =
                        pack.emojis?.length > 0
                            ? `${process.env.NEXT_PUBLIC_API_URL}${pack.emojis[0].skins[0].src}`
                            : "/placeholder.svg?height=96&width=96&text=Emoji";

                    return (
                        <Card
                            key={pack._id}
                            className="hover:shadow-lg transition-all flex flex-col items-center"
                        >
                            <CardContent className="p-4 flex flex-col items-center text-center">
                                <div className="relative w-20 h-20 mb-3">
                                    <Image
                                        src={cover}
                                        alt={pack.name}
                                        fill
                                        className="object-cover rounded-md"
                                    />
                                </div>
                                <h3 className="font-semibold text-lg">{pack.name}</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Emoji Pack
                                </p>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setSelectedPack(pack)}
                                >
                                    View details
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Modal hiển thị chi tiết emoji pack */}
            {selectedPack && (
                <EmojiPreviewModal
                    pack={selectedPack}
                    onClose={() => setSelectedPack(null)}
                />
            )}
        </>
    );
}
