import { Card } from "@/components/ui/card";

export function ContentViewer({
  title,
  author,
  html,
  updatedAt,
}: { title: string; author: string; html: string; updatedAt?: string }) {
  return (
    <Card className="p-6 h-full">
      <div className="mb-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground">Author: {author}{updatedAt ? ` · ${new Date(updatedAt).toLocaleString()}` : ""}</p>
      </div>

      <div
        className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg text-sm leading-relaxed overflow-y-auto max-h-[32rem]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Card>
  );
}
