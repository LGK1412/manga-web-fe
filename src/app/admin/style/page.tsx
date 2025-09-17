"use client"

import { useState } from "react"
import { Plus, Search, Edit, Trash2, Eye, BookOpen, FileText, Headphones, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import AdminLayout from "../adminLayout/page"

// Mock data for story styles
const stylesData = [
  {
    id: 1,
    name: "Manga",
    description: "Truyện tranh Nhật Bản với hình ảnh và lời thoại",
    icon: "BookOpen",
    storiesCount: 1245,
    status: "Active",
    category: "Visual",
  },
  {
    id: 2,
    name: "Light Novel",
    description: "Tiểu thuyết nhẹ với minh họa, thiên về chữ",
    icon: "FileText",
    storiesCount: 567,
    status: "Active",
    category: "Text",
  },
  {
    id: 3,
    name: "Web Novel",
    description: "Tiểu thuyết web, chủ yếu là văn bản",
    icon: "FileText",
    storiesCount: 789,
    status: "Active",
    category: "Text",
  },
  {
    id: 4,
    name: "Manhwa",
    description: "Truyện tranh Hàn Quốc, đọc từ trên xuống",
    icon: "BookOpen",
    storiesCount: 234,
    status: "Active",
    category: "Visual",
  },
  {
    id: 5,
    name: "Manhua",
    description: "Truyện tranh Trung Quốc",
    icon: "BookOpen",
    storiesCount: 156,
    status: "Active",
    category: "Visual",
  },
  {
    id: 6,
    name: "Graphic Novel",
    description: "Tiểu thuyết đồ họa, kết hợp tranh và chữ",
    icon: "BookOpen",
    storiesCount: 89,
    status: "Active",
    category: "Hybrid",
  },
  {
    id: 7,
    name: "Audiobook",
    description: "Sách nói, truyện được đọc bằng giọng",
    icon: "Headphones",
    storiesCount: 45,
    status: "Active",
    category: "Audio",
  },
  {
    id: 8,
    name: "Visual Novel",
    description: "Truyện tương tác với lựa chọn",
    icon: "Play",
    storiesCount: 67,
    status: "Active",
    category: "Interactive",
  },
]

const iconMap = {
  BookOpen,
  FileText,
  Headphones,
  Play,
}

export default function StyleManagement() {
  const [styles, setStyles] = useState(stylesData)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newStyle, setNewStyle] = useState({ name: "", description: "", category: "", icon: "BookOpen" })

  const filteredStyles = styles.filter((style) => {
    const matchesSearch =
      style.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      style.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === "all" || style.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const handleAddStyle = () => {
    if (newStyle.name && newStyle.description && newStyle.category) {
      const newId = Math.max(...styles.map((s) => s.id)) + 1
      setStyles([
        ...styles,
        {
          id: newId,
          name: newStyle.name,
          description: newStyle.description,
          category: newStyle.category,
          icon: newStyle.icon,
          storiesCount: 0,
          status: "Active",
        },
      ])
      setNewStyle({ name: "", description: "", category: "", icon: "BookOpen" })
      setIsAddDialogOpen(false)
    }
  }

  const handleDeleteStyle = (id: number) => {
    setStyles(styles.filter((style) => style.id !== id))
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      Visual: "bg-blue-100 text-blue-800",
      Text: "bg-green-100 text-green-800",
      Audio: "bg-purple-100 text-purple-800",
      Interactive: "bg-orange-100 text-orange-800",
      Hybrid: "bg-pink-100 text-pink-800",
    }
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  return (
    <AdminLayout>
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Style Management</h1>
          <p className="text-gray-600 mt-2">Quản lý các loại hình thể hiện truyện</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Thêm Style
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm Style Mới</DialogTitle>
              <DialogDescription>Tạo loại hình thể hiện truyện mới</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Tên Style</Label>
                <Input
                  id="name"
                  value={newStyle.name}
                  onChange={(e) => setNewStyle({ ...newStyle, name: e.target.value })}
                  placeholder="Nhập tên loại hình..."
                />
              </div>
              <div>
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={newStyle.description}
                  onChange={(e) => setNewStyle({ ...newStyle, description: e.target.value })}
                  placeholder="Nhập mô tả loại hình..."
                />
              </div>
              <div>
                <Label htmlFor="category">Danh mục</Label>
                <Select
                  value={newStyle.category}
                  onValueChange={(value) => setNewStyle({ ...newStyle, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Visual">Visual (Hình ảnh)</SelectItem>
                    <SelectItem value="Text">Text (Văn bản)</SelectItem>
                    <SelectItem value="Audio">Audio (Âm thanh)</SelectItem>
                    <SelectItem value="Interactive">Interactive (Tương tác)</SelectItem>
                    <SelectItem value="Hybrid">Hybrid (Kết hợp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleAddStyle}>Thêm Style</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Tìm kiếm và Lọc</CardTitle>
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
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Lọc theo danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                <SelectItem value="Visual">Visual</SelectItem>
                <SelectItem value="Text">Text</SelectItem>
                <SelectItem value="Audio">Audio</SelectItem>
                <SelectItem value="Interactive">Interactive</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Styles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStyles.map((style) => {
          const IconComponent = iconMap[style.icon as keyof typeof iconMap]
          return (
            <Card key={style.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <IconComponent className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{style.name}</CardTitle>
                      <Badge className={getCategoryColor(style.category)} variant="secondary">
                        {style.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{style.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <Eye className="h-4 w-4 mr-1" />
                    {style.storiesCount} truyện
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteStyle(style.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
    </AdminLayout>
  )
}
