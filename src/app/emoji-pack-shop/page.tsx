"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import EmojiPackCard from "@/components/emoji-shop/EmojiPackCard";
import Pagination from "@/components/emoji-shop/Pagination";
import EmojiPreviewModal from "@/components/emoji-shop/EmojiPreviewModal";
import axios from "axios";

export default function EmojiShopPage() {
    const { toast } = useToast();
    const [packs, setPacks] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedPack, setSelectedPack] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    const pageSize = 12;

    useEffect(() => {
        const fetchPacks = async () => {
            setLoading(true);
            try {
                const res = await axios.get(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/emoji-pack/get-pack-for-shop?page=${currentPage}&limit=${pageSize}`,
                    { withCredentials: true }
                );

                setPacks(Array.isArray(res.data.packs) ? res.data.packs : []);
                setTotalPages(res.data.totalPages || 1);
            } catch (err) {
                console.error("Error fetching emoji packs:", err);
                toast({
                    title: "Failed to load emoji packs",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };
        fetchPacks();
    }, [currentPage, toast]);

    const handleBought = (packId: string) => {
        setPacks(prev => prev.filter(p => p._id !== packId));
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 py-8 pt-20">
                <h1 className="text-3xl font-bold mb-8 text-center">Emoji Pack Shop</h1>

                {loading ? (
                    <div className="text-center text-muted-foreground py-16">
                        Loading...
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {packs.length > 0 ? (
                                packs.map((pack) => (
                                    <EmojiPackCard
                                        key={pack._id}
                                        pack={pack}
                                        onPreview={() => setSelectedPack(pack)}
                                        onBought={handleBought}
                                    />
                                ))
                            ) : (
                                <div className="col-span-full text-center text-muted-foreground py-16">
                                    Currently, there are no emoji packs available for purchase.
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex justify-center">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    </>
                )}
            </div>

            <Footer />

            {selectedPack && (
                <EmojiPreviewModal
                    pack={selectedPack}
                    onClose={() => setSelectedPack(null)}
                />
            )}
        </div>
    );
}
