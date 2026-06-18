import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BUSINESS_TYPES, BUSINESS_TYPE_LABEL, BusinessType } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Suggest() {
  const { user, isApproved } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState<BusinessType>("food");
  const [contact, setC] = useState("");
  const [desc, setD] = useState("");
  const [address, setAddr] = useState("");
  const [loading, setL] = useState(false);

  if (!user) return <div className="p-8 text-center text-sm text-muted-foreground">Cần đăng nhập</div>;
  if (!isApproved)
    return <div className="p-8 text-center text-sm text-muted-foreground">Tài khoản cần được admin duyệt trước</div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setL(true);
    const { error } = await supabase.from("suggestions").insert({
      user_id: user.id,
      business_name: name,
      business_type: type,
      contact_info: contact,
      description: desc,
    });
    setL(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã gửi đề xuất, chờ admin duyệt");
    nav("/");
  };

  return (
    <form onSubmit={submit} className="p-4 space-y-3 max-w-md">
      <h1 className="text-xl font-extrabold">Đề xuất doanh nghiệp</h1>
      <div className="space-y-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên doanh nghiệp *"
          required
          className="w-full px-3 py-2.5 rounded-lg border bg-card"
        />
        <p className="text-[11px] text-muted-foreground">Ví dụ: Nhà Hàng Hương Quê, Cafe Sương Mai</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {BUSINESS_TYPES.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setType(t)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm border",
              type === t ? "bg-primary text-primary-foreground border-primary" : "bg-card",
            )}
          >
            {BUSINESS_TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <input
        value={contact}
        onChange={(e) => setC(e.target.value)}
        placeholder="Liên hệ (SĐT/email) *"
        required
        className="w-full px-3 py-2.5 rounded-lg border bg-card"
      />
      <div className="space-y-1">
        <textarea
          value={desc}
          onChange={(e) => setD(e.target.value)}
          placeholder="Mô tả ngắn"
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg border bg-card"
        />
        <p className="text-[11px] text-muted-foreground">Mô tả ngắn gọn về không gian, phong cách, món đặc trưng</p>
      </div>
      <button
        disabled={loading}
        className="w-full py-3 rounded-xl bg-gradient-brand text-primary-foreground font-semibold"
      >
        {loading ? "Đang gửi…" : "Gửi đề xuất"}
      </button>
    </form>
  );
}
