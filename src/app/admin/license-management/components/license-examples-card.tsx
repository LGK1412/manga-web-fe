"use client";

import Image from "next/image";
import { X } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const LICENSE_EXAMPLES = [
  {
    title: "Vietnam copyright registration certificate",
    imageSrc: "/license-examples/copyright-registration-vn-1.jpg",
    imageAlt: "Vietnam copyright registration certificate",
    width: 502,
    height: 709,
  },
  {
    title: "Vietnam copyright certificate",
    imageSrc: "/license-examples/copyright-registration-vn-2.jpg",
    imageAlt: "Vietnam copyright certificate",
    width: 2859,
    height: 3976,
  },
  {
    title: "Certificate of Copyright Registration",
    imageSrc: "/license-examples/copyright-registration-us.jpg",
    imageAlt: "Certificate of Copyright Registration",
    width: 314,
    height: 492,
  },
] as const;

export function LicenseExamplesCard() {
  return (
    <Card>
      <CardContent className="pt-3">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="license-examples" className="border-none">
            <AccordionTrigger className="items-center rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 px-4 py-4 shadow-sm transition hover:border-slate-300 hover:from-white hover:to-white hover:no-underline [&>svg]:size-9 [&>svg]:shrink-0 [&>svg]:translate-y-0 [&>svg]:rounded-full [&>svg]:border [&>svg]:border-slate-200 [&>svg]:bg-white [&>svg]:p-2 [&>svg]:text-slate-600">
              <div className="space-y-1 pr-3 text-left">
                <p className="font-semibold text-slate-900">Reference Examples</p>
                <p className="text-sm font-normal leading-6 text-slate-600">
                  3 sample documents.
                </p>
              </div>
            </AccordionTrigger>

            <AccordionContent className="space-y-3 pb-0 pt-3">
              {LICENSE_EXAMPLES.map((example) => (
                <Dialog key={example.imageSrc}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      aria-label={example.imageAlt}
                      className="block w-full rounded-2xl border border-border/70 bg-slate-50/70 p-3 text-left transition hover:border-slate-300 hover:bg-white"
                    >
                      <div className="overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm">
                        <Image
                          src={example.imageSrc}
                          alt={example.imageAlt}
                          width={example.width}
                          height={example.height}
                          className="h-auto w-full cursor-zoom-in"
                        />
                      </div>
                    </button>
                  </DialogTrigger>

                  <DialogContent
                    showCloseButton={false}
                    className="max-h-[90vh] w-[92vw] max-w-4xl overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-0 shadow-2xl"
                  >
                    <DialogHeader className="flex-row items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-4 py-4 text-left sm:px-6">
                      <div className="space-y-1">
                        <DialogTitle className="text-base font-semibold text-slate-900">
                          Reference Examples
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-600">
                          Open a larger view to compare it with the submission
                          under review.
                        </DialogDescription>
                      </div>

                      <DialogClose asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="rounded-full px-3"
                        >
                          <X className="h-4 w-4" />
                          <span>Close</span>
                        </Button>
                      </DialogClose>
                    </DialogHeader>

                    <div className="bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.6),_transparent_55%)] p-4 sm:p-6">
                      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                        <div className="relative mx-auto h-[65vh] w-full max-w-[760px] sm:h-[70vh]">
                          <Image
                            src={example.imageSrc}
                            alt={example.imageAlt}
                            fill
                            sizes="(max-width: 1280px) 88vw, 760px"
                            className="object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
