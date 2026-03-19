export interface BackendNotification {
  _id: string;
  sender_id: string;
  receiver_id: string;
  title: string;
  body: string;
  is_read: boolean;
  is_save: boolean;
  createdAt: string;
}

export interface NotificationVM {
  _id: string;
  title: string;
  body: string;
  status: "Unread" | "Read";
  createdAt: string;
  receiver_id: string;
  sender_id: string;
  is_save: boolean;
}

export type StatusFilter = "All" | "Read" | "Unread";
export type SavedFilter = "All" | "Saved" | "Unsaved";
export type SortFilter = "Newest" | "Oldest" | "Title A-Z" | "Title Z-A";

export interface NotificationOverview {
  total: number;
  read: number;
  unread: number;
  saved: number;
}

export function mapToVM(n: BackendNotification): NotificationVM {
  return {
    _id: n._id,
    title: n.title,
    body: n.body,
    status: n.is_read ? "Read" : "Unread",
    createdAt: n.createdAt,
    receiver_id: n.receiver_id,
    sender_id: n.sender_id,
    is_save: Boolean(n.is_save),
  };
}