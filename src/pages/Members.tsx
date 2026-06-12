import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/lib/types";
import { Users, Phone } from "lucide-react";
import { StoredImage } from "@/components/StoredImage";

export default function Members() {
  const [members, setMembers] = useState<Profile[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      setMembers((data as Profile[]) || []);
    })();
  }, []);

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-extrabold">Thành viên</h1>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{members.length} thành viên trong cộng đồng</p>
      <div className="space-y-2">
        {members.map(m => (
          <div key={m.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/60 shadow-soft">
            <div className="w-11 h-11 rounded-full bg-gradient-brand text-white font-bold grid place-items-center overflow-hidden">
              {m.avatar_url ? <StoredImage path={m.avatar_url} className="w-full h-full object-cover" /> : (m.full_name || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{m.full_name}</div>
              {m.phone && <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Phone className="w-3 h-3" />{m.phone}</div>}
            </div>
            <div className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleDateString("vi-VN")}</div>
          </div>
        ))}
        {members.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">Chưa có thành viên</div>
        )}
      </div>
    </div>
  );
}
