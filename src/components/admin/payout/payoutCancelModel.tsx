"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Ban, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

export default function CancelPayoutModal({
  payoutId,
  onSuccess,
}: {
  payoutId: string;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  const handleCancel = async () => {
    if (!note.trim()) {
      return toast({
        variant: "destructive",
        title: "Note cannot be empty",
        description: "Please enter reason",
      });
    }

    try {
      setLoading(true);
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payout-settlement/cancel/${payoutId}`,
        { note },
        { withCredentials: true },
      );

      toast({
        title: "Cancel successfully",
        description: "Payout settlement status has been cancelled",
        variant: "success",
      });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error while cancelling",
        description: "Cannot cancel this settlement",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <Ban className="w-4 h-4 mr-1" /> Cancel
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[640px] max-w-[90vw] p-4">
        <DialogHeader>
          <DialogTitle>Cancel Payout Settlement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <Label>Reason</Label>
          <Textarea
            placeholder="Enter reason..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Back
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
