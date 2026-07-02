export interface CreateNotificationInput {
  schoolId: string;
  title: string;
  body: string;
  type?: string;
  targetUserIds?: string[];
  targetRoles?: string[];
  metadata?: Record<string, unknown>;
}
