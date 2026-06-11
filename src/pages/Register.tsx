import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/Logo";
import { BUSINESS_TYPE_LABELS, BusinessType } from "@/lib/types";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function Register() {
  const nav = useNavigate();
  const { registerUser, createBusiness } = useStore();

  const [form, setForm] = useState({
    name: "", phone: "", email: "", city: "",
    hasBusiness: "no" as "yes" | "no",
    bizName: "", bizType: "cafe" as BusinessType, bizAddress: "", bizDesc: "", bizOffer: "",
  });

  const submit = () => {
    if (!form.name || !form.phone || !form.city) {
      return toast.error("Vui lòng điền họ tên, SĐT và thành phố");
    }
    if (!/^0\d{8,10}$/.test(form.phone.replace(/\s/g, ""))) {
      return toast.error("Số điện thoại không hợp lệ");
    }
    const u = registerUser({
      name: form.name, phone: form.phone, email: form.email || undefined,
      city: form.city, hasBusiness: form.hasBusiness === "yes",
    });
    if (form.hasBusiness === "yes" && form.bizName) {
      createBusiness({
        name: form.bizName, type: form.bizType, city: form.city,
        address: form.bizAddress, description: form.bizDesc, offer: form.bizOffer,
        cover: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=70",
        logo: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=200&q=70",
        phone: form.phone, ownerId: u.id, code: "",
      } as any);
      toast.success("Đăng ký thành công! Doanh nghiệp đang chờ admin duyệt");
    } else {
      toast.success(`Chào mừng ${u.name} đến với Liên Minh!`);
    }
    nav("/");
  };

  return (
    <div className="min-h-screen bg-gradient-card">
      <div className="px-5 pt-5">
        <button onClick={() => nav(-1)} className="w-10 h-10 rounded-full bg-background grid place-items-center shadow-soft">
          <ArrowLeft className="w-4 h-4"/>
        </button>
      </div>
      <div className="px-5 pt-3 text-center">
        <Logo size={56} className="justify-center"/>
        <h1 className="text-2xl font-extrabold mt-3">Gia nhập Liên Minh</h1>
        <p className="text-sm text-muted-foreground">Một cộng đồng - Nhiều giá trị</p>
      </div>

      <div className="px-5 mt-5 space-y-3">
        <Field label="Họ và tên *" value={form.name} onChange={v => setForm({...form, name: v})}/>
        <Field label="Số điện thoại *" value={form.phone} onChange={v => setForm({...form, phone: v})} placeholder="09xx xxx xxx"/>
        <Field label="Email (tuỳ chọn)" value={form.email} onChange={v => setForm({...form, email: v})}/>
        <Field label="Thành phố *" value={form.city} onChange={v => setForm({...form, city: v})}/>

        <div>
          <Label>Bạn có đang kinh doanh?</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["no", "yes"] as const).map(v => (
              <button key={v} onClick={() => setForm({...form, hasBusiness: v})}
                className={`p-3 rounded-2xl text-sm font-bold border-2 transition ${
                  form.hasBusiness === v ? "border-primary bg-accent text-primary" : "border-border bg-card text-muted-foreground"
                }`}>
                {v === "no" ? "Chưa kinh doanh" : "Có kinh doanh"}
              </button>
            ))}
          </div>
        </div>

        {form.hasBusiness === "yes" && (
          <div className="space-y-3 p-4 rounded-2xl bg-card border-2 border-primary/20 animate-float-up">
            <div className="text-xs font-bold uppercase text-primary">Thông tin doanh nghiệp</div>
            <Field label="Tên doanh nghiệp" value={form.bizName} onChange={v => setForm({...form, bizName: v})}/>
            <div>
              <Label>Loại hình</Label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(BUSINESS_TYPE_LABELS) as BusinessType[]).map(t => (
                  <button key={t} onClick={() => setForm({...form, bizType: t})}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                      form.bizType === t ? "bg-gradient-brand text-white border-transparent" : "bg-background border-border text-muted-foreground"
                    }`}>{BUSINESS_TYPE_LABELS[t]}</button>
                ))}
              </div>
            </div>
            <Field label="Địa chỉ" value={form.bizAddress} onChange={v => setForm({...form, bizAddress: v})}/>
            <Field label="Mô tả ngắn" value={form.bizDesc} onChange={v => setForm({...form, bizDesc: v})} textarea/>
            <Field label="Ưu đãi cho cộng đồng" value={form.bizOffer} onChange={v => setForm({...form, bizOffer: v})}/>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-warning"/> Trạng thái: Chờ admin duyệt
            </div>
          </div>
        )}

        <button onClick={submit}
          className="w-full bg-gradient-brand text-white font-extrabold py-4 rounded-2xl shadow-brand active:scale-95 transition mt-4 mb-8">
          ĐĂNG KÝ THÀNH VIÊN
        </button>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-bold uppercase text-muted-foreground mb-1.5">{children}</div>;
}

function Field({ label, value, onChange, placeholder, textarea }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"/>
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"/>
      )}
    </div>
  );
}
