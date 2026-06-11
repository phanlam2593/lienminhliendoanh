import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { BUSINESS_TYPE_LABELS, BusinessType } from "@/lib/types";
import { toast } from "sonner";

export default function Suggest() {
  const nav = useNavigate();
  const { suggestBusiness } = useStore();
  const [f, setF] = useState({ name: "", type: "cafe" as BusinessType, address: "", phone: "", facebook: "" });

  const submit = () => {
    if (!f.name || !f.address || !f.phone) return toast.error("Vui lòng điền tên, địa chỉ và SĐT");
    suggestBusiness(f);
    toast.success("Cảm ơn bạn đã đề xuất!");
    nav("/");
  };

  return (
    <div className="px-5 pt-5">
      <button onClick={() => nav(-1)} className="w-10 h-10 rounded-full bg-card border border-border grid place-items-center mb-4">
        <ArrowLeft className="w-4 h-4"/>
      </button>
      <h1 className="text-xl font-extrabold">Đề xuất doanh nghiệp</h1>
      <p className="text-sm text-muted-foreground mb-5">Giới thiệu nơi bạn yêu thích cho cộng đồng</p>

      <div className="space-y-3">
        <div>
          <div className="text-xs font-bold uppercase text-muted-foreground mb-1.5">Loại hình</div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(BUSINESS_TYPE_LABELS) as BusinessType[]).map(t => (
              <button key={t} onClick={() => setF({...f, type: t})}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                  f.type === t ? "bg-gradient-brand text-white border-transparent" : "bg-card border-border text-muted-foreground"
                }`}>{BUSINESS_TYPE_LABELS[t]}</button>
            ))}
          </div>
        </div>
        <Inp label="Tên *" v={f.name} on={v => setF({...f, name: v})}/>
        <Inp label="Địa chỉ *" v={f.address} on={v => setF({...f, address: v})}/>
        <Inp label="Số điện thoại *" v={f.phone} on={v => setF({...f, phone: v})}/>
        <Inp label="Facebook (tuỳ chọn)" v={f.facebook} on={v => setF({...f, facebook: v})}/>
        <button onClick={submit} className="w-full mt-4 py-4 rounded-2xl bg-gradient-brand text-white font-extrabold shadow-brand active:scale-95">
          GỬI ĐỀ XUẤT
        </button>
      </div>
    </div>
  );
}

function Inp({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase text-muted-foreground mb-1.5">{label}</div>
      <input value={v} onChange={e => on(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"/>
    </div>
  );
}
