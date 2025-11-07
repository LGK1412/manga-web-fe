"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import AdminLayout from "../adminLayout/page";
import { useToast } from "@/hooks/use-toast";
import AddEmojiPackDialog from "@/components/emoji/AddEmojiPackDialog";
import EditEmojiPackDialog from "@/components/emoji/EditEmojiPackDialog";
import EmojiPackTable from "@/components/emoji/EmojiPackTable";
import { confirmAlert } from 'react-confirm-alert';

export default function EmojiPackManagement() {
    const [packs, setPacks] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editPack, setEditPack] = useState<any | null>(null);
    const { toast } = useToast();

    const fetchPacks = async () => {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/emoji-pack`, {
                withCredentials: true,
            });
            setPacks(res.data);
        } catch (err) {
            console.error(err);
            toast({
                title: "Lỗi tải dữ liệu",
                description: "Không thể lấy danh sách emoji pack",
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        fetchPacks();
    }, []);

    const handleDelete = (id: string) => {
        confirmAlert({
            title: 'Xác nhận hành động',
            message: 'Bạn có chắc muốn thực hiện hành động này?',
            buttons: [
                {
                    label: 'Hủy',
                    onClick: () => {
                        // Chỉ đóng modal, không làm gì
                    }
                },
                {
                    label: 'Xác nhận',
                    onClick: async () => {
                        try {
                            await axios.delete(
                                `${process.env.NEXT_PUBLIC_API_URL}/api/emoji-pack/delete-pack/${id}`,
                                { withCredentials: true }
                            );
                            toast({
                                title: 'Đã xóa emoji pack',
                                variant: 'success'
                            });
                            fetchPacks(); // reload lại danh sách
                        } catch (err) {
                            toast({
                                title: 'Lỗi khi xóa',
                                variant: 'destructive'
                            });
                        }
                    }
                }
            ],
            overlayClassName: 'bg-black/50',
            closeOnEscape: true,
            closeOnClickOutside: true
        });
    };

    const filteredPacks = packs.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Emoji Pack Management</h1>
                        <p>Quản lý gói emoji</p>
                    </div>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm Emoji Pack
                    </Button>
                </div>

                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4" />
                        <Input
                            className="pl-10"
                            placeholder="Tìm emoji pack..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <EmojiPackTable
                    packs={filteredPacks}
                    onEdit={setEditPack}
                    onDelete={handleDelete}
                />

                {isAddDialogOpen && (
                    <AddEmojiPackDialog
                        open={isAddDialogOpen}
                        onOpenChange={setIsAddDialogOpen}
                        onSuccess={fetchPacks}
                    />
                )}

                {editPack && (
                    <EditEmojiPackDialog
                        open={!!editPack}
                        onOpenChange={() => setEditPack(null)}
                        emojiPack={editPack}
                        onSuccess={fetchPacks}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
