import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Offer } from "@/lib/types";

interface OfferWithBiz extends Offer { business?: { id: string; name: string; cover_url: string | null } | null }

export default function Offers() {
  const [list, setList] = useState<OfferWithBiz[]>([]);

  useEffect(() => {
    supabase.from("offers").select("*, business:businesses(id, name, cover_url)")
      .eq("status", "active").order("created_at", { ascending: false })
      .then(({ data }) => setList((data ?? []) as OfferWithBiz[]));
  }, []);

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-extrabold">Ưu đãi</h1>
      {list.length === 0 ? (
        <p className="text-sm text-center py-12 text-muted-foreground">Chưa có ưu đãi nào</p>
      ) : (
        <div className="space-y-3">
          {list.map(o => (
            <Link key={o.id} to={`/dn/${o.business?.id}`} className="block p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-950/30 dark:to-sky-950/30 border border-emerald-100 dark:border-emerald-900 shadow-sm"
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-brand text-white grid place-items-center"><Tag className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{o.title}</div>
                  {o.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{o.description}</div>}
                  <div className="text-xs text-primary font-semibold mt-1">{o.business?.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Đã có {o.claim_count ?? 0} người nhận ưu đãi này</div>
                </div>
                {o.code && <div className="text-xs font-mono font-bold bg-white px-2 py-1 rounded border border-dashed">{o.code}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
