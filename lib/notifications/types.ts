// ============================================================
// أنواع نظام الإشعارات والإعلانات
// ============================================================

export type NotificationTargetType =
  | "all"
  | "students"
  | "teachers"
  | "class"
  | "section"
  | "person";

export type NotificationPriority = "normal" | "important" | "urgent";

export type NotificationCategory =
  | "general"
  | "exams"
  | "homework"
  | "holiday"
  | "financial"
  | "activity";

export type NotificationStatus = "draft" | "sent" | "failed";

export type NotificationType = "insite" | "push" | "email";

export type AnnouncementMediaType = "image" | "video" | "pdf" | "link";

export type NotificationMediaType = "image" | "video" | "link";

export type NotificationTemplate =
  | "default"
  | "alert"
  | "celebration"
  | "info"
  | "reminder";

// ----------------------------------------------------------------
// Targeting
// ----------------------------------------------------------------
export interface NotificationTargetConfig {
  targetType: NotificationTargetType;
  targetClass?: string;
  targetSection?: string;
  targetUserId?: string;
  targetUserIds?: string[];
  branchId?: string;
}

// ----------------------------------------------------------------
// Create inputs
// ----------------------------------------------------------------
export interface CreateNotificationInput {
  schoolId: string;
  branchId?: string;
  type?: NotificationType;
  title: string;
  body: string;
  target: NotificationTargetConfig;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  template?: NotificationTemplate;
  mediaUrl?: string;
  mediaType?: NotificationMediaType;
  sentByUserId: string;
  channels?: NotificationType[];
}

export interface CreateAnnouncementInput {
  schoolId: string;
  branchId?: string;
  title: string;
  body: string;
  mediaUrl?: string;
  mediaType?: AnnouncementMediaType;
  isPinned?: boolean;
  expiresAt?: string;
  createdBy: string;
}

// ----------------------------------------------------------------
// List items returned by queries
// ----------------------------------------------------------------
export interface NotificationListItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  targetType: NotificationTargetType;
  targetClass: string | null;
  targetSection: string | null;
  priority: NotificationPriority;
  category: NotificationCategory;
  template: NotificationTemplate;
  mediaUrl: string | null;
  mediaType: NotificationMediaType | null;
  status: NotificationStatus;
  recipientCount: number;
  createdAt: string;
  sentAt: string | null;
}

export interface NotificationWithReadStatus {
  id: string;
  notificationId: string;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface AnnouncementListItem {
  id: string;
  schoolId: string;
  branchId: string | null;
  title: string;
  body: string;
  mediaUrl: string | null;
  mediaType: AnnouncementMediaType | null;
  isPinned: boolean;
  expiresAt: string | null;
  createdAt: string;
}

// ----------------------------------------------------------------
// Stats
// ----------------------------------------------------------------
export interface NotificationStatsData {
  totalSent: number;
  totalThisWeek: number;
  totalAnnouncements: number;
  totalPinned: number;
}

// ----------------------------------------------------------------
// API response shapes
// ----------------------------------------------------------------
export interface UnreadCountResponse {
  ok: true;
  count: number;
}

export interface NotificationDeliveryStats {
  targeted: number;
  sent: number;
  failed: number;
  firstError?: string;
}

export interface SendNotificationResponse {
  ok: true;
  notificationId: string;
  recipientCount: number;
  delivery: NotificationDeliveryStats;
  partial?: true;
  push?: { sent: number; failed: number };
}
