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
    const [isLoading, setIsLoading] = useState(false);

    const { toast } = useToast();

    const handleFileChange = (e: any) => {
        if (isLoading) return; // chặn luôn

        const selected = Array.from(e.target.files) as File[];

        const validFiles = selected.filter((file) => {
            const isValidType = [
                "image/png",
                "image/jpeg",
                "image/webp",
                "image/gif",
            ].includes(file.type);
            const isValidSize = file.size <= 3 * 1024 * 1024;
            return isValidType && isValidSize;
        });

        if (validFiles.length + files.length > 30) {
            toast({
                title: "Too many images",
                description: "Maximum 30 emoji images allowed.",
                variant: "destructive",
            });
            return;
        }

        if (validFiles.length !== selected.length) {
            toast({
                title: "Some files removed",
                description: "Only PNG, JPEG, WEBP, GIF images smaller than 3MB are accepted.",
                variant: "destructive",
            });
        }

        setFiles([...files, ...validFiles]);
    };

    const handleRemoveFile = (index: number) => {
        if (isLoading) return; // đang load thì không cho xoá
        const newFiles = [...files];
        newFiles.splice(index, 1);
        setFiles(newFiles);
    };

    const handleSubmit = async () => {
        if (isLoading) return;
        setIsLoading(true);

        if (!name) {
            setIsLoading(false);
            return toast({ title: "Enter pack name", variant: "destructive" });
        }

        if (files.length === 0) {
            setIsLoading(false);
            return toast({
                title: "No emoji yet",
                description: "Please upload at least 1 emoji.",
                variant: "destructive",
            });
        }

        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("price", price.toString());
            files.forEach((file) => formData.append("emojis", file));

            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/emoji-pack/create-emoji-pack`,
                formData,
                {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            toast({ title: "Emoji pack created successfully" });
            setName("");
            setPrice(0);
            setFiles([]);
            onOpenChange(false);
            onSuccess();
        } catch (err: any) {
            toast({
                title: "Error adding",
                description: err?.response?.data?.message || err?.message || "An error occurred",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Emoji Pack</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label>Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                            placeholder="Pack name..."
                        />
                    </div>

                    <div>
                        <Label>Price</Label>
                        <Input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(+e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <Label>Emoji (max 30 images, &lt; 3MB each)</Label>
                        <Input
                            type="file"
                            multiple
                            accept="image/png, image/jpeg, image/webp, image/gif"
                            onChange={handleFileChange}
                            disabled={isLoading}
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

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? "Adding..." : "Add"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
