import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";

export function QuickFactsCard() {
  return (
    <Card>
      <CardContent className="pt-2">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="quick-facts" className="border-none">
            <AccordionTrigger className="py-4 hover:no-underline">
              <div className="space-y-1 text-left">
                <p className="font-semibold text-foreground">Quick Facts</p>
                <p className="text-sm font-normal leading-6 text-gray-600">
                  Open for policy reminders while reviewing.
                </p>
              </div>
            </AccordionTrigger>

            <AccordionContent className="pb-4">
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  Original work plus a valid self declaration may not need the
                  same review depth as translated or reposted work.
                </li>
                <li>
                  Translation, adaptation, and repost cases should keep a
                  stricter proof standard before approval.
                </li>
                <li>
                  Verified badge is separate from the basic ability to publish
                  the story.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
