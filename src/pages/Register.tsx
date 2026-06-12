import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ACCEPT, uploadImage, validateImage } from "@/lib/upload";
import { CATEGORIES, CATEGORY_LABEL, BizCategory } from "@/lib/types";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Camera } from "lucide-react";

export default function Register() {
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState({
    full_name: "", email: "", phone: "", password: "", confirm: "",
    biz_name: "", biz_cat: "khac" as BizCategory, biz_desc: "",
  });

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files?.[0];
    if (!fl) return;
    const err = validateImage(fl);
    if (err) return toast.error(err);
    setFile(fl); setPreview(URL.createObjectURL(fl));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.full_name || !f.email || !f.phone || !f.password) return toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
    if (f.password.length < 6) return toast.error("Mật khẩu tối thiểu 6 ký tự");
    if (f.password !== f.confirm) return toast.error("Mật khẩu xác nhận không khớp");
    if (f.biz_name && !file) return toast.error("Vui lòng tải ảnh doanh nghiệp");

    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: f.email, password: f.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: f.full_name, phone: f.phone },
        },
      });
      if (error) throw error;

      if (f.biz_name && data.user && file) {
        const path = await uploadImage(file, "businesses");
        const { error: be } = await supabase.from("businesses").insert({
          owner_id: data.user.id, name: f.biz_name, category: f.biz_cat,
          description: f.biz_desc, phone: f.phone, image_url: path, status: "pending",
        });
        if (be) console.error(be);
        toast.success("Đăng ký thành công! Doanh nghiệp đang chờ admin duyệt");
      } else {
        toast.success(`Chào mừng ${f.full_name}!`);
      }
      nav("/");
    } catch (err: any) {
      toast.error(err.message || "Đăng ký thất bại");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-card pb-10">
      <div className="px-5 pt-5">
        <button onClick={() => nav("/")} className="w-10 h-10 rounded-full bg-background grid place-items-center shadow-soft">
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
      <div className="px-5 pt-3 text-center">
        <Logo size={56} className="justify-center" />
        <h1 className="text-2xl font-extrabold mt-3">Gia nhập Liên Minh</h1>
        <p className="text-sm text-muted-foreground">Một cộng đồng - Nhiều giá trị</p>
      </div>

      <form onSubmit={submit} className="px-5 mt-5 space-y-3">
        <Field label="Họ và tên *" value={f.full_name} onChange={v => setF({ ...f, full_name: v })} />
        <Field label="Email *" type="email" value={f.email} onChange={v => setF({ ...f, email: v })} />
        <Field label="Số điện thoại *" value={f.phone} onChange={v => setF({ ...f, phone: v })} />
        <Field label="Mật khẩu *" type="password" value={f.password} onChange={v => setF({ ...f, password: v })} />
        <Field label="Xác nhận mật khẩu *" type="password" value={f.confirm} onChange={v => setF({ ...f, confirm: v })} />

        <div className="p-4 rounded-2xl bg-card border-2 border-primary/20 space-y-3">
          <div className="text-xs font-bold uppercase text-primary">Doanh nghiệp (không bắt buộc)</div>
          <Field label="Tên doanh nghiệp" value={f.biz_name} onChange={v => setF({ ...f, biz_name: v })} />
          <div>
            <Label>Danh mục</Label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button type="button" key={c} onClick={() => setF({ ...f, biz_cat: c })}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${f.biz_cat === c ? "bg-gradient-brand text-white border-transparent" : "bg-background border-border text-muted-foreground"}`}>
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </div>
          <Field label="Mô tả doanh nghiệp" value={f.biz_desc} onChange={v => setF({ ...f, biz_desc: v })} textarea />
          <div>
            <Label>Hình ảnh doanh nghiệp</Label>
            <input ref={fileRef} type="file" accept={ACCEPT} onChange={onFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full h-32 rounded-xl border-2 border-dashed border-border bg-background flex flex-col items-center justify-center gap-1 overflow-hidden">
              {preview ? <img src={preview} className="w-full h-full object-cover" alt="preview" /> : (
                <><Camera className="w-6 h-6 text-muted-foreground" /><span className="text-xs text-muted-foreground">Chọn ảnh (JPG/PNG/WEBP, ≤5MB)</span></>
              )}
            </button>
          </div>
        </div>

        <button disabled={busy} className="w-full bg-gradient-brand text-white font-extrabold py-4 rounded-2xl shadow-brand active:scale-95 transition mt-4 disabled:opacity-60 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}ĐĂNG KÝ THÀNH VIÊN
        </button>
        <p className="text-center text-sm text-muted-foreground pt-2">
          Đã có tài khoản? <Link to="/auth/login" className="text-primary font-bold">Đăng nhập</Link>
        </p>
      </form>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-bold uppercase text-muted-foreground mb-1.5">{children}</div>;
}

function Field({ label, value, onChange, type = "text", textarea }: { label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      )}
    </div>
  );
}
