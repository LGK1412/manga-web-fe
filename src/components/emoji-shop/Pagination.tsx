import { Button } from "@/components/ui/button";

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}) {
    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
            >
                ←
            </Button>
            {[...Array(totalPages)].map((_, i) => (
                <Button
                    key={i}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(i + 1)}
                >
                    {i + 1}
                </Button>
            ))}
            <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
            >
                →
            </Button>
        </div>
    );
}
