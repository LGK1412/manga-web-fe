"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Plus,
  Search,
  Edit,
  Eye,
  BookOpen,
  FileText,
  Headphones,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminLayout from "../adminLayout/page";
import { useToast } from "@/hooks/use-toast";

const iconMap = {
  BookOpen,
  FileText,
  Headphones,
  Play,
};

interface Style {
  _id: string;
  name: string;
  description: string;
  icon: string;
  storiesCount: number;
  status: "normal" | "hide";
  category: string;
}

export default function StyleManagement() {
  const [styles, setStyles] = useState<Style[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all"); // (kept, even if not used yet)
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [newStyle, setNewStyle] = useState({
    name: "",
    description: "",
    icon: "BookOpen",
  });

  const [editStyle, setEditStyle] = useState<Style | null>(null);
  const { toast } = useToast();

  // Fetch styles from API
  const fetchStyles = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/styles`,
        { withCredentials: true }
      );
      setStyles(res.data);
    } catch (error) {
      console.error("Error fetching styles:", error);
      toast({
        title: "Failed to load styles",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchStyles();
  }, []);

  // Add style
  const handleAddStyle = async () => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/styles`,
        { ...newStyle, status: "normal" },
        { withCredentials: true }
      );

      toast({ title: "Style added successfully" });

      setIsAddDialogOpen(false);
      setNewStyle({ name: "", description: "", icon: "BookOpen" });
      fetchStyles();
    } catch (error) {
      console.error("Error adding style:", error);
      toast({
        title: "Failed to add style",
        variant: "destructive",
      });
    }
  };

  // Update style
  const handleUpdateStyle = async () => {
    if (!editStyle) return;

    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/styles/${editStyle._id}`,
        editStyle,
        { withCredentials: true }
      );

      toast({ title: "Style updated successfully" });

      setIsEditDialogOpen(false);
      fetchStyles();
    } catch (error) {
      console.error("Error updating style:", error);
      toast({
        title: "Failed to update style",
        variant: "destructive",
      });
    }
  };

  // Filter list
  const filteredStyles = styles.filter((style) => {
    const matchesSearch =
      style.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      style.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      filterCategory === "all" || style.category === filterCategory;

    const matchesStatus =
      filterStatus === "all" || style.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      Visual: "bg-blue-100 text-blue-800",
      Text: "bg-green-100 text-green-800",
      Audio: "bg-purple-100 text-purple-800",
      Interactive: "bg-orange-100 text-orange-800",
      Hybrid: "bg-pink-100 text-pink-800",
    };
    return (
      colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800"
    );
  };

  const getStatusColor = (status: string) => {
    return status === "normal"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Style Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage story presentation styles
            </p>
          </div>

          {/* Add Style */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Style
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Style</DialogTitle>
                <DialogDescription>
                  Create a new story presentation style
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Style Name</Label>
                  <Input
                    id="name"
                    value={newStyle.name}
                    onChange={(e) =>
                      setNewStyle({ ...newStyle, name: e.target.value })
                    }
                    placeholder="Enter style name..."
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newStyle.description}
                    onChange={(e) =>
                      setNewStyle({
                        ...newStyle,
                        description: e.target.value,
                      })
                    }
                    placeholder="Enter style description..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddStyle}>Add Style</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="hide">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Styles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStyles.map((style) => {
            const IconComponent =
              iconMap[style.icon as keyof typeof iconMap] || BookOpen;

            return (
              <Card
                key={style._id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <IconComponent className="h-6 w-6 text-blue-600" />
                      </div>

                      <div>
                        <CardTitle className="text-lg">{style.name}</CardTitle>
                        <div className="flex gap-2 mt-1">
                          <Badge className={getCategoryColor(style.category)}>
                            {style.category}
                          </Badge>
                          <Badge className={getStatusColor(style.status)}>
                            {style.status === "normal" ? "Normal" : "Hidden"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-gray-600 mb-4">{style.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <Eye className="h-4 w-4 mr-1" />
                      {style.storiesCount} stories
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditStyle(style);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Edit Dialog */}
        {editStyle && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Style</DialogTitle>
                <DialogDescription>
                  Update style information
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Style Name</Label>
                  <Input
                    id="edit-name"
                    value={editStyle.name}
                    onChange={(e) =>
                      setEditStyle({ ...editStyle, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editStyle.description}
                    onChange={(e) =>
                      setEditStyle({
                        ...editStyle,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select
                    value={editStyle.status}
                    onValueChange={(value: "normal" | "hide") =>
                      setEditStyle({ ...editStyle, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="hide">Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateStyle}>Update</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}
