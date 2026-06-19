export const finalStatusLabel: Record<string, string> = {
  pending: "قيد المراجعة",
  applied: "تم التطبيق",
  rejected: "مرفوض",
  cancelled: "ملغى",
};

export const finalStatusClass: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  applied: "bg-success/15 text-success",
  rejected: "bg-danger/15 text-danger",
  cancelled: "bg-muted/15 text-muted",
};

export const stepStatusLabel: Record<string, string> = {
  pending: "بانتظار",
  approved: "موافق",
  rejected: "مرفوض",
};
