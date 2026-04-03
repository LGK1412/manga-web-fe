import { Loader2 } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PublishingControlsCardProps = {
  isPublished?: boolean;
  isActionBusy: boolean;
  isPublishBusy: boolean;
  onTogglePublish: () => void;
};

export function PublishingControlsCard({
  isPublished,
  isActionBusy,
  isPublishBusy,
  onTogglePublish,
}: PublishingControlsCardProps) {
  return (
    <Card>
      <CardContent className="pt-2">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="publishing-controls" className="border-none">
            <AccordionTrigger className="py-4 hover:no-underline">
              <div className="space-y-1 text-left">
                <p className="font-semibold text-foreground">
                  Publishing Controls
                </p>
                <p className="text-sm font-normal leading-6 text-gray-600">
                  Open to manage live visibility separately from review.
                </p>
              </div>
            </AccordionTrigger>

            <AccordionContent className="space-y-4 pb-4">
              {typeof isPublished === "boolean" ? (
                <>
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <p className="text-sm font-medium">Current visibility</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {isPublished
                        ? "This story is currently published."
                        : "This story is currently saved as draft."}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={onTogglePublish}
                    disabled={isActionBusy}
                  >
                    {isPublishBusy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isPublished ? "Unpublish Story" : "Publish Story"}
                  </Button>

                  <p className="text-xs text-gray-500">
                    The backend can still block publication for enforcement or
                    copyright-claim cases even if this toggle is used.
                  </p>
                </>
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
                  Select a story to manage its publish state.
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
