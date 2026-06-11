import { useStore } from "@/lib/store";
import { Link } from "react-router-dom";
import { Tag, CheckCircle2, Clock, Ticket } from "lucide-react";

export default function MyOffers() {
  const { usages, currentUser } = useStore();
  const mine = currentUser ? usages.filter(u => u.userId === currentUser.id) : usages.slice(0, 5);

  return (
    <div className="px-5 pt-4">
      <h1 className="text-xl font-extrabold mb-1">Mã ưu đãi của tôi</h1>
      <p className="text-xs text-muted-foreground mb-4">
        {currentUser ? `Tổng ${mine.length} mã đã nhận` : "Đăng nhập để xem mã của bạn (đang hiện demo)"}
      </p>

      {mine.length === 0 ? (
        <div className="text-center py-16">
          <Ticket className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3"/>
          <div className="font-bold mb-1">Chưa có mã nào</div>
          <div className="text-xs text-muted-foreground mb-4">Khám phá doanh nghiệp và nhận ưu đãi</div>
          <Link to="/kham-pha" className="inline-block px-5 py-2.5 rounded-xl bg-gradient-brand text-white font-bold text-sm">Khám phá ngay</Link>
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {mine.map(u => (
            <div key={u.id} className="rounded-2xl bg-card border border-border overflow-hidden shadow-soft">
              <div className="bg-gradient-brand text-white px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Tag className="w-3.5 h-3.5"/> {u.businessName}
                </div>
                {u.redeemed ? (
                  <span className="flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3"/> Đã dùng
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3"/> Chưa dùng
                  </span>
                )}
              </div>
              <div className="p-4 text-center">
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Mã ưu đãi</div>
                <div className="text-2xl font-extrabold font-mono tracking-widest text-gradient-brand mt-1">{u.code}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(u.createdAt).toLocaleString("vi-VN")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
