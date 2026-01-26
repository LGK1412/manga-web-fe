"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

interface Genre {
  _id: string;
  name: string;
  description: string;
  storiesCount: number;
  status: "normal" | "hide";
}

export default function GenreManagement() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "normal" | "hide">(
    "all"
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newGenre, setNewGenre] = useState({ name: "", description: "" });
  const [editGenre, setEditGenre] = useState<Genre | null>(null);
  const { toast } = useToast();

  // Fetch genres từ API
  const fetchGenres = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/genre`,
        {
          withCredentials: true,
        }
      );
      setGenres(res.data);
    } catch (error) {
      console.error("Error fetching genres:", error);
      toast({
        title: "Lỗi tải dữ liệu",
        description: "Không thể lấy danh sách thể loại",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  // Add genre
  const handleAddGenre = async () => {
    if (!newGenre.name || !newGenre.description) return;

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/genre`,
        { ...newGenre, status: "active" },
        { withCredentials: true }
      );

      setGenres([...genres, res.data]);
      setNewGenre({ name: "", description: "" });
      setIsAddDialogOpen(false);

      toast({
        title: "Thêm thành công",
        description: `Đã thêm thể loại ${res.data.name}`,
      });
    } catch (error) {
      console.error("Error adding genre:", error);
      toast({
        title: "Lỗi thêm thể loại",
        description: "Vui lòng thử lại sau",
        variant: "destructive",
      });
    }
  };

  // Update genre
  const handleUpdateGenre = async () => {
    if (!editGenre) return;

    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/genre/${editGenre._id}`,
        editGenre,
        { withCredentials: true }
      );

      toast({ title: "Cập nhật thành công" });
      setIsEditDialogOpen(false);
      fetchGenres();
    } catch (error) {
      console.error("Error updating genre:", error);
      toast({
        title: "Lỗi cập nhật thể loại",
        description: "Vui lòng thử lại sau",
        variant: "destructive",
      });
    }
  };

  // Toggle status thay vì delete
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "normal" ? "hide" : "normal";

    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/genre/${id}/toggle-status`,
        { status: newStatus },
        { withCredentials: true }
      );

      setGenres(
        genres.map((g) => (g._id === id ? { ...g, status: newStatus } : g))
      );

      toast({
        title: "Cập nhật thành công",
        description: `Thể loại đã được chuyển sang trạng thái ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating genre status:", error);
      toast({
        title: "Lỗi cập nhật trạng thái",
        description: "Vui lòng thử lại sau",
        variant: "destructive",
      });
    }
  };

  // Lọc theo search + filter trạng thái
  const filteredGenres = genres.filter((genre) => {
    const matchesSearch =
      genre.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      genre.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ? true : genre.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Genre Management
            </h1>
            <p className="text-gray-600 mt-2">Managing story genres</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Genre
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Genre</DialogTitle>
                <DialogDescription>
                  Create a new genre for the system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Genre's Name</Label>
                  <Input
                    id="name"
                    value={newGenre.name}
                    onChange={(e) =>
                      setNewGenre({ ...newGenre, name: e.target.value })
                    }
                    placeholder="Enter genre name..."
                  />
                </div>
                <div>
                  <Label htmlFor="description">Short Description</Label>
                  <Textarea
                    id="description"
                    value={newGenre.description}
                    onChange={(e) =>
                      setNewGenre({ ...newGenre, description: e.target.value })
                    }
                    placeholder="Enter a description of the category..."
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
                <Button onClick={handleAddGenre}>Add Genre</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search + Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                className="border rounded-md px-3 py-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="normal">Normal</option>
                <option value="hide">Hide</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>List of Genres ({filteredGenres.length})</CardTitle>
            <CardDescription>
              Manage all types of stories in the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Genre's Name</TableHead>
                  <TableHead>Short Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quantity of stories</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGenres.map((genre) => (
                  <TableRow key={genre._id}>
                    <TableCell className="font-medium">{genre.name}</TableCell>
                    <TableCell className="text-gray-600">
                      {genre.description}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          genre.status === "normal" ? "default" : "secondary"
                        }
                      >
                        {genre.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 text-blue-500 mr-1" />
                        {genre.storiesCount ?? 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditGenre(genre);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" /> Update
                        </Button>
                        {/* <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(genre._id, genre.status)}
                        >
                          {genre.status === "active" ? "Ẩn" : "Kích hoạt"}
                        </Button> */}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        {editGenre && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Genre</DialogTitle>
                <DialogDescription>
                  Update Information of the genre
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Genre's Name</Label>
                  <Input
                    id="edit-name"
                    value={editGenre.name}
                    onChange={(e) =>
                      setEditGenre({ ...editGenre, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Short Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editGenre.description}
                    onChange={(e) =>
                      setEditGenre({
                        ...editGenre,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editGenre.status}
                    onValueChange={(value: "normal" | "hide") =>
                      setEditGenre({ ...editGenre, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="hide">Hide</SelectItem>
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
                <Button onClick={handleUpdateGenre}>Update</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}
