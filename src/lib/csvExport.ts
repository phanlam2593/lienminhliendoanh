import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function toCSV(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  return lines.join("\n");
}

export async function exportTableToCSV(table: string, filename: string) {
  const t = toast.loading("Đang xuất dữ liệu…");
  const { data, error } = await supabase.from(table as any).select("*");
  toast.dismiss(t);
  if (error) {
    toast.error(error.message);
    return;
  }
  const rows = data ?? [];
  if (rows.length === 0) {
    toast.error("Không có dữ liệu để xuất");
    return;
  }
  const csv = toCSV(rows);
  // Thêm BOM (\uFEFF) để Excel mở đúng tiếng Việt có dấu, không bị lỗi font
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Đã xuất ${rows.length} dòng`);
}
