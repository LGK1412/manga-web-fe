"use client"

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer
      role="contentinfo"
      className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <p className="order-2 md:order-1">
            {"© "}
            {year}
            {" Manga World. All rights reserved."}
          </p>
          {/* Keep the right side empty or add minimal links if needed later */}
          <div className="order-1 md:order-2" aria-hidden="true" />
        </div>
      </div>
    </footer>
  )
}
