"use client";
import { useState } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

export default function EditEmojiPackDialog({ open, onOpenChange, emojiPack, onSuccess }: any) {
    const [pack, setPack] = useState(emojiPack);
    const [deletedEmojis, setDeletedEmojis] = useState<any[]>([]);
    const [newFiles, setNewFiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false); // ⬅ ADD
    const { toast } = useToast();

    const handleSave = async () => {
        if (isLoading) return; // chặn spam
        setIsLoading(true);

        try {
            const formData = new FormData();
            newFiles.forEach((file) => formData.append("newEmojis", file));
            formData.append("deletedEmojis", JSON.stringify(deletedEmojis));
            formData.append("name", pack.name);
            formData.append("price", pack.price.toString());
            formData.append("packId", pack._id);

            await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/api/emoji-pack/edit/${pack._id}`, formData, {
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast({ title: "Cập nhật thành công" });
            onOpenChange(false);
            onSuccess();
            setNewFiles([]);
            setDeletedEmojis([]);
        } catch {
            toast({ title: "Lỗi khi lưu", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    // ---------------- EmojiEditor Sub-component ----------------
    const EmojiEditor = () => {
        const [emojis, setEmojis] = useState(pack.emojis || []);

        const handleAddFiles = (e: any) => {
            if (isLoading) return; // chặn interaction
            const selectedFiles = Array.from(e.target.files).slice(0, 30 - newFiles.length);
            const validFiles = selectedFiles.filter((f: any) => f.size < 3 * 1024 * 1024);
            setNewFiles([...newFiles, ...validFiles]);
        };

        const handleRemoveFile = (idx: number) => {
            if (isLoading) return;
            const filesCopy = [...newFiles];
            filesCopy.splice(idx, 1);
            setNewFiles(filesCopy);
        };

        const handleDeleteEmoji = (i: number) => {
            if (isLoading) return;
            const removed = emojis[i]._id;
            setDeletedEmojis([...deletedEmojis, removed]);
            const newEmojis = emojis.filter((_: any, idx: number) => idx !== i);
            setEmojis(newEmojis);
            setPack({ ...pack, emojis: newEmojis });
        };

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label className="font-semibold">Danh sách Emoji</Label>
                </div>

                <div className="border rounded-md p-2">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {emojis.map((emoji: any, i: number) => (
                            <div key={i} className="flex-shrink-0 w-32 p-3 border rounded-md">
                                <div className="flex justify-end mb-2">
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        disabled={isLoading} // ⬅ DISABLE XÓA
                                        onClick={() => handleDeleteEmoji(i)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                    {emoji.skins?.map((skin: any, idx: number) => (
                                        <img
                                            key={idx}
                                            src={skin.src.startsWith("http")
                                                ? skin.src
                                                : `${process.env.NEXT_PUBLIC_API_URL}${skin.src}`}
                                            className="w-12 h-12 rounded object-cover border"
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <Label>Emoji (tối đa 30 ảnh, &lt; 3MB mỗi ảnh)</Label>
                    <Input
                        type="file"
                        multiple
                        disabled={isLoading} // ⬅ DISABLE UPLOAD
                        accept="image/png, image/jpeg, image/webp, image/gif"
                        onChange={handleAddFiles}
                    />
                </div>

                {newFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {newFiles.map((file: any, idx: number) => (
                            <div
                                key={idx}
                                className="relative w-10 h-10 border rounded-md overflow-hidden"
                            >
                                <img
                                    src={URL.createObjectURL(file)}
                                    className="object-cover w-full h-full"
                                />
                                {!isLoading && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveFile(idx)}
                                        className="absolute top-0 right-0 bg-red-500 text-white px-1 rounded-bl-md text-xs"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ---------------- Render Dialog ----------------
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Chỉnh sửa Emoji Pack</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label>Tên</Label>
                        <Input
                            value={pack.name}
                            disabled={isLoading} // ⬅ DISABLE INPUT
                            onChange={(e) => setPack({ ...pack, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label>Giá</Label>
                        <Input
                            type="number"
                            value={pack.price}
                            disabled={isLoading}
                            onChange={(e) => setPack({ ...pack, price: +e.target.value })}
                        />
                    </div>

                    <EmojiEditor />
                </div>

                <DialogFooter>
                    <Button variant="outline" disabled={isLoading} onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>

                    <Button disabled={isLoading} onClick={handleSave}>
                        {isLoading ? "Đang lưu..." : "Lưu"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
