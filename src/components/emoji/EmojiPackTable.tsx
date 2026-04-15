"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, ArchiveRestore } from "lucide-react";

export default function EmojiPackTable({ packs, onEdit, onDelete }: any) {
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const totalPages = Math.ceil((packs?.length || 0) / pageSize);

    const paginatedPacks = (packs || []).slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    const getPages = () => {
        const pages: (number | string)[] = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
            return pages;
        }

        pages.push(1);

        if (page > 3) pages.push("...");

        const start = Math.max(2, page - 1);
        const end = Math.min(totalPages - 1, page + 1);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (page < totalPages - 2) pages.push("...");

        pages.push(totalPages);

        return pages;
    };

    return (
        <div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Pack Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Emoji Count</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {paginatedPacks.map((p: any) => (
                        <TableRow key={p._id}>
                            <TableCell>{p.name}</TableCell>
                            <TableCell>{p.price}</TableCell>
                            <TableCell>{p.emojis?.length ?? 0}</TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => onEdit(p)}>
                                        <Edit className="h-4 w-4 mr-1" /> Edit
                                    </Button>

                                    {p.is_hide ? (
                                        <Button
                                            variant="success"
                                            size="sm"
                                            onClick={() => onDelete(p._id)}
                                        >
                                            <ArchiveRestore className="h-4 w-4 mr-1" /> Restore
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => onDelete(p._id)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                >
                    Prev
                </Button>

                {getPages().map((p, idx) =>
                    p === "..." ? (
                        <span key={idx} className="px-2">
                            ...
                        </span>
                    ) : (
                        <Button
                            key={idx}
                            size="sm"
                            variant={page === p ? "default" : "outline"}
                            onClick={() => setPage(Number(p))}
                        >
                            {p}
                        </Button>
                    )
                )}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages || totalPages === 0}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}