export const categoryLabel: Record<string, string> = {
  teacher: "شكوى من المعلم",
  student: "شكوى من طالب",
  schedule: "مشكلة في الجدول",
  payment: "مشكلة في الدفع",
  technical: "مشكلة تقنية",
  suggestion: "اقتراح تطوير",
  other: "أخرى",
};

export const studentCategories = ["teacher", "schedule", "payment", "technical", "suggestion", "other"];
export const teacherCategories = ["student", "schedule", "technical", "suggestion", "other"];

export const statusLabel: Record<string, string> = {
  Open: "مفتوحة",
  "In Progress": "قيد المعالجة",
  "Waiting For User": "بانتظار ردّك",
  Resolved: "محلولة",
  Closed: "مغلقة",
};

export const statusClass: Record<string, string> = {
  Open: "bg-info/15 text-info",
  "In Progress": "bg-warning/15 text-warning",
  "Waiting For User": "bg-warning/15 text-warning",
  Resolved: "bg-success/15 text-success",
  Closed: "bg-muted/15 text-muted",
};

export const priorityLabel: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};

export const adminStatuses = ["Open", "In Progress", "Waiting For User", "Resolved", "Closed"];

export function basePathFor(userType: string) {
  return userType === "admin" ? "/admin" : userType === "teacher" ? "/teacher" : "/student";
}
