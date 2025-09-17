"use client"

import { useState } from "react"
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import AdminLayout from "../adminLayout/page"

// Mock data for genres
const genresData = [
  { id: 1, name: "Action", description: "Hành động, chiến đấu", storiesCount: 245, status: "Active" },
  { id: 2, name: "Romance", description: "Tình cảm, lãng mạn", storiesCount: 189, status: "Active" },
  { id: 3, name: "Fantasy", description: "Thần thoại, phép thuật", storiesCount: 156, status: "Active" },
  { id: 4, name: "Horror", description: "Kinh dị, ma quái", storiesCount: 78, status: "Active" },
  { id: 5, name: "Comedy", description: "Hài hước, vui nhộn", storiesCount: 134, status: "Active" },
  { id: 6, name: "Drama", description: "Tâm lý, cảm động", storiesCount: 167, status: "Active" },
  { id: 7, name: "Sci-Fi", description: "Khoa học viễn tưởng", storiesCount: 89, status: "Inactive" },
]

export default function GenreManagement() {
  const [genres, setGenres] = useState(genresData)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newGenre, setNewGenre] = useState({ name: "", description: "" })

  const filteredGenres = genres.filter(
    (genre) =>
      genre.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      genre.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddGenre = () => {
    if (newGenre.name && newGenre.description) {
      const newId = Math.max(...genres.map((g) => g.id)) + 1
      setGenres([
        ...genres,
        {
          id: newId,
          name: newGenre.name,
          description: newGenre.description,
          storiesCount: 0,
          status: "Active",
        },
      ])
      setNewGenre({ name: "", description: "" })
      setIsAddDialogOpen(false)
    }
  }

  const handleDeleteGenre = (id: number) => {
    setGenres(genres.filter((genre) => genre.id !== id))
  }

  return (
    <AdminLayout>
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Genre Management</h1>
          <p className="text-gray-600 mt-2">Quản lý các thể loại truyện</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Thêm Genre
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm Genre Mới</DialogTitle>
              <DialogDescription>Tạo thể loại truyện mới cho hệ thống</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Tên Genre</Label>
                <Input
                  id="name"
                  value={newGenre.name}
                  onChange={(e) => setNewGenre({ ...newGenre, name: e.target.value })}
                  placeholder="Nhập tên thể loại..."
                />
              </div>
              <div>
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={newGenre.description}
                  onChange={(e) => setNewGenre({ ...newGenre, description: e.target.value })}
                  placeholder="Nhập mô tả thể loại..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleAddGenre}>Thêm Genre</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Tìm kiếm Genre</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo tên hoặc mô tả..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Genres Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Genres ({filteredGenres.length})</CardTitle>
          <CardDescription>Quản lý tất cả thể loại truyện trong hệ thống</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên Genre</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Số lượng truyện</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGenres.map((genre) => (
                <TableRow key={genre.id}>
                  <TableCell className="font-medium">{genre.name}</TableCell>
                  <TableCell className="text-gray-600">{genre.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 text-blue-500 mr-1" />
                      {genre.storiesCount}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={genre.status === "Active" ? "default" : "secondary"}>{genre.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteGenre(genre.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  )
}
