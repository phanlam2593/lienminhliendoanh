// Trang Admin ghi dữ liệu qua edge function "admin-action" (CLAUDE.md #12, 18/11/2026) — kiểm admin + danh sách trắng ở server.
// Edge function CHƯA deploy (hoặc chưa tới nơi: lỗi 404 / "404 CORS preflight" → FunctionsFetchError) thì tự quay về đường cũ
// (ghi thẳng bảng — policy admin cũ vẫn còn) để trang Admin không bao giờ gãy giữa lúc chờ deploy.
import { supabase } from "@/integrations/supabase/client";

type Res = { error: { message: string } | null };
type AdminTable = "profiles" | "businesses" | "offers";
type DeletableTable = "businesses" | "offers" | "reviews" | "reports";
const db = supabase as any;

let edgeMissing = false; // đã thấy edge function chưa deploy trong phiên này → khỏi thử lại mỗi lần

async function viaEdge(body: Record<string, unknown>, direct: () => PromiseLike<Res>): Promise<Res> {
  if (!edgeMissing) {
    const { data, error } = await supabase.functions.invoke("admin-action", { body });
    if (!error) return { error: data?.error ? { message: String(data.error) } : null };
    const status = (error as any)?.context?.status as number | undefined;
    const notDeployed = error.name === "FunctionsFetchError" || error.name === "FunctionsRelayError" || status === 404;
    if (!notDeployed) {
      // Server từ chối có lý do (thiếu quyền, sai cột…) → báo đúng lỗi đó.
      let msg = error.message;
      try {
        const j = await (error as any).context?.json?.();
        if (j?.error) msg = String(j.error);
      } catch {
        /* giữ msg */
      }
      return { error: { message: msg } };
    }
    edgeMissing = true;
  }
  const { error } = await direct();
  return { error: error ? { message: error.message } : null };
}

export function adminUpdate(table: AdminTable, id: string, patch: Record<string, unknown>): Promise<Res> {
  return viaEdge({ action: "update", table, id, patch }, () => db.from(table).update(patch).eq("id", id));
}

export function adminDelete(table: DeletableTable, id: string): Promise<Res> {
  return viaEdge({ action: "delete", table, id }, async () => {
    if (table === "businesses") await db.from("offers").delete().eq("business_id", id);
    return db.from(table).delete().eq("id", id);
  });
}

export function adminInsertOffer(businessId: string, title: string): Promise<Res> {
  return viaEdge({ action: "insert_offer", business_id: businessId, title }, () =>
    db.from("offers").insert({ business_id: businessId, title, status: "active" }),
  );
}

export function adminBroadcast(senderId: string, receiverIds: string[], content: string): Promise<Res> {
  return viaEdge({ action: "broadcast", receiver_ids: receiverIds, content }, () =>
    db.from("messages").insert(
      receiverIds.filter((r) => r !== senderId).map((r) => ({ sender_id: senderId, receiver_id: r, content, type: "broadcast" })),
    ),
  );
}
