"use client";

import { ExternalLink } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { OFFICIAL_LICENSE_REFERENCE_LINKS } from "../license-knowledge.data";

export function TheoryLookupCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Theory Lookup</CardTitle>
        <CardDescription>
          Official references for additional verification.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="rounded-xl border border-border/70 bg-gray-50 p-4">
          <p className="text-sm font-medium text-foreground">Official Sources</p>
          <div className="mt-3 flex flex-col gap-2">
            {OFFICIAL_LICENSE_REFERENCE_LINKS.map((reference) => (
              <a
                key={reference.href}
                href={reference.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-2 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 leading-6">{reference.label}</span>
              </a>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
