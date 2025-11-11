"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface NotificationFiltersProps {
  onTypeChange: (type: string) => void;
  onRoleChange: (role: string) => void;
  onStatusChange: (status: string) => void;
  onSearchChange: (search: string) => void;
}

export function NotificationFilters({
  onTypeChange,
  onRoleChange,
  onStatusChange,
  onSearchChange,
}: NotificationFiltersProps) {
  return (
    <div className="space-y-4 bg-white p-6 rounded-lg border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by title or message..."
            className="pl-10"
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <Select onValueChange={onTypeChange} defaultValue="All">
          <SelectTrigger>
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Types</SelectItem>
            <SelectItem value="Report">Report</SelectItem>
            <SelectItem value="System">System</SelectItem>
            <SelectItem value="Warning">Warning</SelectItem>
            <SelectItem value="Info">Info</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={onRoleChange} defaultValue="All">
          <SelectTrigger>
            <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Roles</SelectItem>
            <SelectItem value="User">User</SelectItem>
            <SelectItem value="Author">Author</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={onStatusChange} defaultValue="All">
          <SelectTrigger>
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Read">Read</SelectItem>
            <SelectItem value="Unread">Unread</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
