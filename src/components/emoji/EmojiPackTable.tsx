"use client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, ArchiveRestore } from "lucide-react";

export default function EmojiPackTable({ packs, onEdit, onDelete }: any) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Tên Pack</TableHead>
                    <TableHead>Giá</TableHead>
                    <TableHead>Số lượng Emoji</TableHead>
                    <TableHead>Hành động</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {packs.map((p: any) => (
                    <TableRow key={p._id}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.price}</TableCell>
                        <TableCell>{p.emojis?.length ?? 0}</TableCell>
                        <TableCell>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => onEdit(p)}>
                                    <Edit className="h-4 w-4 mr-1" /> Sửa
                                </Button>
                                {p.is_hide ? (
                                    <Button variant="success" size="sm" onClick={() => onDelete(p._id)}>
                                        <ArchiveRestore className="h-4 w-4 mr-1" /> Khôi phục
                                    </Button>
                                ) : (
                                    <Button variant="destructive" size="sm" onClick={() => onDelete(p._id)}>
                                        <Trash2 className="h-4 w-4 mr-1" /> Xoá
                                    </Button>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
