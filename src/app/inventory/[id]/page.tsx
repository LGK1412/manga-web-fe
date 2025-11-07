"use client";

import { useState, useLayoutEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Cookies from "js-cookie";
import axios from "axios";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import EmojiInventory from "@/components/inventory/EmojiInventory";
import { Loader2 } from "lucide-react";

export default function InventoryPage() {
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();

    const [user, setUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    // Lấy user info từ cookie
    useLayoutEffect(() => {
        const raw = Cookies.get("user_normal_info");
        if (raw) {
            try {
                const decoded = decodeURIComponent(raw);
                const parsed = JSON.parse(decoded);
                setUser(parsed);

                // Check user ID trùng URL
                if (parsed.user_id !== params.id) {
                    toast({
                        title: "Không có quyền truy cập",
                        description: "Bạn không thể xem inventory của người khác.",
                        variant: "destructive",
                    });
                    router.push("/"); // quay lại trang chính
                }
            } catch (e) {
                console.error("Invalid cookie data", e);
                router.push("/");
            }
        } else {
            router.push("/");
        }
    }, [params.id, router, toast]);

    // fetch data
    const [emojiPacks, setEmojiPacks] = useState<any[]>([]);

    useLayoutEffect(() => {
        const fetchInventory = async () => {
            if (!user?.user_id) return;
            try {
                const res = await axios.get(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/user/emoji-packs-own/`,
                    { withCredentials: true }
                );

                console.log(res.data);

                setEmojiPacks(res.data || []);
            } catch (err) {
                console.error("Error fetching inventory:", err);
                toast({
                    title: "Không thể tải inventory",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };
        fetchInventory();
    }, [user, toast]);

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 py-8 pt-20">
                <h1 className="text-3xl font-bold mb-6 text-center">Inventory của bạn</h1>

                {loading ? (
                    <div className="flex justify-center items-center py-20 text-muted-foreground">
                        <Loader2 className="animate-spin w-6 h-6 mr-2" /> Đang tải...
                    </div>
                ) : (
                    <Tabs defaultValue="emoji" className="w-full">
                        <TabsList className="flex justify-center mb-8">
                            <TabsTrigger value="emoji">Emoji Packs</TabsTrigger>
                        </TabsList>

                        {/* Emoji inventory */}
                        <TabsContent value="emoji">
                            <EmojiInventory emojiPacks={emojiPacks} />
                        </TabsContent>

                        {/* Skins */}
                        <TabsContent value="skins">
                            <div className="text-center text-muted-foreground py-12">
                                Chưa có skins nào.
                            </div>
                        </TabsContent>

                        {/* Badges */}
                        <TabsContent value="badges">
                            <div className="text-center text-muted-foreground py-12">
                                Chưa có badges nào.
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </div>

            <Footer />
        </div>
    );
}
