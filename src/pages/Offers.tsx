import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Business, Offer } from "@/lib/types";
import { Ticket, Calendar, Store } from "lucide-react";
import { StoredImage } from "@/components/StoredImage";

export default function Offers() {
  const [items, setItems] = useState<(Offer & { business: Business })[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("offers")
        .select("*, business:businesses!inner(*)")
        .eq("business.status", "approved")
        .order("created_at", { ascending: false });
      setItems((data as any) || []);
    })();
  }, []);

  return (
    <div className="px-5 py-4">
      <h1 className="text-xl font-extrabold mb-3">Ưu đãi cộng đồng</h1>
      {items.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Chưa có ưu đãi nào</div>
      ) : (
        <div className="space-y-3">
          {items.map(o => (
            <Link key={o.id} to={`/dn/${o.business_id}`}
              className="block bg-card rounded-2xl shadow-card border border-border/60 overflow-hidden active:scale-[0.98] transition">
              <div className="flex">
                <div className="w-24 h-24 shrink-0 bg-muted">
                  <StoredImage path={o.image_url || o.business.image_url} className="w-full h-full object-cover" alt={o.title} />
                </div>
                <div className="flex-1 p-3 min-w-0">
                  <div className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase">
                    <Store className="w-3 h-3" />{o.business.name}
                  </div>
                  <div className="font-bold text-sm mt-0.5 line-clamp-1">{o.title}</div>
                  {o.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{o.description}</div>}
                  {o.end_date && (
                    <div className="flex items-center gap-1 text-[10px] text-warning mt-1">
                      <Calendar className="w-3 h-3" />Đến {new Date(o.end_date).toLocaleDateString("vi-VN")}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
