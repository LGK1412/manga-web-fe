"use client";
import { useState } from "react";
import axios from "axios";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function AddEmojiPackDialog({
    open,
    onOpenChange,
    onSuccess,
}: any) {
    const [name, setName] = useState("");
    const [price, setPrice] = useState(0);
    const [files, setFiles] = useState<File[]>([]);
    const { toast } = useToast();

    const handleFileChange = (e: any) => {
        const selected = Array.from(e.target.files) as File[];

        // lọc file hợp lệ
        const validFiles = selected.filter((file) => {
            const isValidType = [
                "image/png",
                "image/jpeg",
                "image/webp",
                "image/gif",
            ].includes(file.type);
            const isValidSize = file.size <= 3 * 1024 * 1024; // 3MB
            return isValidType && isValidSize;
        });

        if (validFiles.length + files.length > 30) {
            toast({
                title: "Quá nhiều ảnh",
                description: "Tối đa chỉ được chọn 30 ảnh emoji.",
                variant: "destructive",
            });
            return;
        }

        if (validFiles.length !== selected.length) {
            toast({
                title: "Một số file bị loại bỏ",
                description: "Chỉ chấp nhận ảnh PNG, JPEG, WEBP, GIF nhỏ hơn 3MB.",
                variant: "destructive",
            });
        }

        setFiles([...files, ...validFiles]);
    };

    const handleRemoveFile = (index: number) => {
        const newFiles = [...files];
        newFiles.splice(index, 1);
        setFiles(newFiles);
    };

    const handleSubmit = async () => {
        if (!name) return toast({ title: "Nhập tên pack", variant: "destructive" });

        if (files.length === 0)
            return toast({
                title: "Chưa có emoji nào",
                description: "Cần tải lên ít nhất 1 emoji cho pack.",
                variant: "destructive",
            });

        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("price", price.toString());
            files.forEach((file) => formData.append("emojis", file));

            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/emoji-pack/create-emoji-pack`,
                formData,
                {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            // console.log(res);

            toast({ title: "Tạo emoji pack thành công" });
            setName("");
            setPrice(0);
            setFiles([]);
            onOpenChange(false);
            onSuccess();
        } catch (err: any) {
            // console.error(err);
            toast({
                title: "Lỗi khi thêm", description: err?.response?.data?.message || err?.message || "Có lỗi xảy ra", variant: "destructive"
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Thêm Emoji Pack</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label>Tên</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Tên pack..."
                        />
                    </div>

                    <div>
                        <Label>Giá</Label>
                        <Input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(+e.target.value)}
                        />
                    </div>

                    <div>
                        <Label>Emoji (tối đa 30 ảnh, &lt; 3MB mỗi ảnh)</Label>
                        <Input
                            type="file"
                            multiple
                            accept="image/png, image/jpeg, image/webp, image/gif"
                            onChange={handleFileChange}
                        />
                    </div>

                    {files.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {files.map((file, idx) => (
                                <div
                                    key={idx}
                                    className="relative w-10 h-10 border rounded-md overflow-hidden"
                                >
                                    <img
                                        src={URL.createObjectURL(file)}
                                        className="object-cover w-full h-full"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveFile(idx)}
                                        className="absolute top-0 right-0 bg-red-500 text-white px-1 rounded-bl-md text-xs"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button onClick={handleSubmit}>Thêm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
