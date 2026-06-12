import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CATEGORIES, CATEGORY_LABEL, BizCategory } from "@/lib/types";
import { ACCEPT, uploadImage, validateImage } from "@/lib/upload";
import { ArrowLeft, Camera, Loader2, Lightbulb } from "lucide-react";
import { toast } from "sonner";

export default function Suggest() {
  const nav = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState({ name: "", category: "khac" as BizCategory, description: "", contact_info: "" });

  if (!user) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-muted-foreground mb-4">Vui lòng đăng nhập để đề xuất doanh nghiệp</p>
        <button onClick={() => nav("/auth/login")} className="bg-gradient-brand text-white font-bold px-6 py-3 rounded-xl shadow-brand">Đăng nhập</button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name || !f.contact_info) return toast.error("Vui lòng điền tên và thông tin liên hệ");
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (file) image_url = await uploadImage(file, "suggestions");
      const { error } = await supabase.from("business_suggestions").insert({
        suggested_by: user.id, name: f.name, category: f.category,
        description: f.description, contact_info: f.contact_info, image_url,
      });
      if (error) throw error;
      toast.success("Đã gửi đề xuất! Admin sẽ xem xét sớm."); nav("/");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="px-5 py-5">
      <button onClick={() => nav(-1)} className="w-10 h-10 rounded-full bg-card grid place-items-center shadow-soft mb-4">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 mb-1">
        <Lightbulb className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-extrabold">Đề xuất doanh nghiệp</h1>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Giới thiệu một doanh nghiệp bạn yêu thích để cộng đồng cùng hưởng ưu đãi</p>

      <form onSubmit={submit} className="space-y-3">
        <Fld label="Tên doanh nghiệp *" value={f.name} onChange={v => setF({ ...f, name: v })} />
        <div>
          <Label>Danh mục</Label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button type="button" key={c} onClick={() => setF({ ...f, category: c })}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${f.category === c ? "bg-gradient-brand text-white border-transparent" : "bg-card border-border text-muted-foreground"}`}>
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
        <Fld label="Mô tả" value={f.description} onChange={v => setF({ ...f, description: v })} textarea />
        <Fld label="Thông tin liên hệ * (SĐT, địa chỉ, FB...)" value={f.contact_info} onChange={v => setF({ ...f, contact_info: v })} textarea />
        <div>
          <Label>Hình ảnh</Label>
          <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={e => {
            const fl = e.target.files?.[0]; if (!fl) return;
            const err = validateImage(fl); if (err) return toast.error(err);
            setFile(fl); setPreview(URL.createObjectURL(fl));
          }} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full h-28 rounded-xl border-2 border-dashed border-border bg-card flex items-center justify-center overflow-hidden">
            {preview ? <img src={preview} className="w-full h-full object-cover" /> : <Camera className="w-5 h-5 text-muted-foreground" />}
          </button>
        </div>
        <button disabled={busy} className="w-full bg-gradient-brand text-white font-extrabold py-4 rounded-2xl shadow-brand mt-2 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}GỬI ĐỀ XUẤT
        </button>
      </form>
    </div>
  );
}

function Label({ children }: any) { return <div className="text-xs font-bold uppercase text-muted-foreground mb-1.5">{children}</div>; }
function Fld({ label, value, onChange, textarea }: any) {
  return (
    <div>
      <Label>{label}</Label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm" />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm" />
      )}
    </div>
  );
}
