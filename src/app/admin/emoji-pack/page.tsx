"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import AdminLayout from "../adminLayout/page";
import { useToast } from "@/hooks/use-toast";
import AddEmojiPackDialog from "@/components/emoji/AddEmojiPackDialog";
import EditEmojiPackDialog from "@/components/emoji/EditEmojiPackDialog";
import EmojiPackTable from "@/components/emoji/EmojiPackTable";
import { confirmAlert } from "react-confirm-alert";

export default function EmojiPackManagement() {
  const [packs, setPacks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editPack, setEditPack] = useState<any | null>(null);
  const { toast } = useToast();

  const fetchPacks = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/emoji-pack`,
        {
          withCredentials: true,
        }
      );
      setPacks(res.data);
    } catch (err) {
      console.error(err);
      toast({
        title: "Failed to load data",
        description: "Unable to fetch the emoji pack list.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPacks();
  }, []);

  const handleDelete = (id: string) => {
    confirmAlert({
      title: "Confirm action",
      message: "Are you sure you want to proceed with this action?",
      buttons: [
        {
          label: "Cancel",
          onClick: () => {
            // Close modal only
          },
        },
        {
          label: "Confirm",
          onClick: async () => {
            try {
              await axios.delete(
                `${process.env.NEXT_PUBLIC_API_URL}/api/emoji-pack/delete-pack/${id}`,
                { withCredentials: true }
              );

              toast({
                title: "Emoji pack deleted",
                description: "The emoji pack has been removed successfully.",
              });

              fetchPacks(); // reload list
            } catch (err) {
              console.error(err);
              toast({
                title: "Delete failed",
                description: "Unable to delete this emoji pack.",
                variant: "destructive",
              });
            }
          },
        },
      ],
      overlayClassName: "bg-black/50",
      closeOnEscape: true,
      closeOnClickOutside: true,
    });
  };

  const filteredPacks = packs.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Emoji Pack Management</h1>
            <p className="text-gray-600 mt-1">
              Manage emoji pack collections in the system.
            </p>
          </div>

          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Emoji Pack
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Search emoji packs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <EmojiPackTable
          packs={filteredPacks}
          onEdit={setEditPack}
          onDelete={handleDelete}
        />

        {isAddDialogOpen && (
          <AddEmojiPackDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onSuccess={fetchPacks}
          />
        )}

        {editPack && (
          <EditEmojiPackDialog
            open={!!editPack}
            onOpenChange={() => setEditPack(null)}
            emojiPack={editPack}
            onSuccess={fetchPacks}
          />
        )}
      </div>
    </AdminLayout>
  );
}
