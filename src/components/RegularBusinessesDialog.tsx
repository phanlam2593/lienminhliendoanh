import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { StoredImage } from "@/components/StoredImage";
import { useLanguage } from "@/lib/i18n";

interface RegularBiz {
  id: string;
  name: string;
  cover_url: string | null;
  visits: number;
  lastVisit: string | null;
  notifOn: boolean;
}

export function RegularBusinessesDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, lang } = useLanguage();
  const [rows, setRows] = useState<RegularBiz[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: regulars } = await supabase
        .from("business_regulars")
        .select("business_id, visit_count, last_visit_at")
        .eq("member_id", userId)
        .order("visit_count", { ascending: false });

      const ids = (regulars ?? []).map((r: any) => r.business_id);
      if (ids.length === 0) {
        setRows([]);
        return;
      }
      const [{ data: bizList }, { data: notifRows }] = await Promise.all([
        supabase.from("businesses").select("id, name, cover_url").in("id", ids),
        supabase
          .from("follows")
          .select("followee_business_id")
          .eq("follower_id", userId)
          .in("followee_business_id", ids),
      ]);
      const bizMap = new Map((bizList ?? []).map((b: any) => [b.id, b]));
      const notifSet = new Set((notifRows ?? []).map((r: any) => r.followee_business_id));

      setRows(
        (regulars ?? []).map((r: any) => ({
          id: r.business_id,
          name: bizMap.get(r.business_id)?.name ?? t("regulars.defaultBizName"),
          cover_url: bizMap.get(r.business_id)?.cover_url ?? null,
          visits: r.visit_count,
          lastVisit: r.last_visit_at,
          notifOn: notifSet.has(r.business_id),
        })),
      );
    } catch (e: any) {
      toast.error(e.message || t("follow.loadFail"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, userId]);

  const toggleNotif = async (biz: RegularBiz) => {
    if (biz.notifOn) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("followee_business_id", biz.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: userId, followee_business_id: biz.id });
      if (error) return toast.error(error.message);
    }
    setRows((prev) => prev.map((r) => (r.id === biz.id ? { ...r, notifOn: !r.notifOn } : r)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>
            {t("regulars.title")} {rows.length > 0 ? `(${rows.length})` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">{t("regulars.empty")}</div>
          ) : (
            <ul className="space-y-1">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                  <Link
                    to={`/dn/${r.id}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                      <StoredImage path={r.cover_url} alt={r.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{r.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {t("regulars.visitsCount", { n: r.visits })}
                        {r.lastVisit
                          ? t("regulars.lastVisitSuffix", {
                              date: new Date(r.lastVisit).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US"),
                            })
                          : ""}
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => toggleNotif(r)}
                    aria-label={r.notifOn ? t("regulars.notifOff") : t("regulars.notifOn")}
                    className={`h-8 w-8 rounded-lg border grid place-items-center shrink-0 ${
                      r.notifOn ? "text-primary border-primary/40 bg-primary/10" : "text-muted-foreground"
                    }`}
                  >
                    {r.notifOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
