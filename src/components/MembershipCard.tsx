import { Crown, Sparkles } from "lucide-react";
import {
  getMemberTierProgress,
  getMembershipDiscountPct,
  getMembershipPrice,
  MEMBERSHIP_BASE_PRICE,
} from "@/lib/types";

export function MembershipCard({ points }: { points: number }) {
  const { current, next, pct } = getMemberTierProgress(points);
  const discount = getMembershipDiscountPct(points);
  const price = getMembershipPrice(points);

  return (
    <div
      className="rounded-2xl p-5 text-white space-y-3"
      style={{ background: "linear-gradient(135deg, #00c9a7 0%, #0891b2 100%)" }}
    >
      <div className="flex items-center gap-2">
        <Crown className="w-5 h-5" />
        <h3 className="font-bold text-lg">Liên Minh Membership</h3>
      </div>
      <p className="text-sm opacity-90">Ưu đãi độc quyền hàng tháng cho thành viên</p>

      <div className="bg-white/10 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="opacity-80">Bậc hiện tại</span>
          <span className="font-semibold">{current ? `${current.emoji} ${current.label}` : "Chưa đạt bậc nào"}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="opacity-80">Ưu đãi của bạn</span>
          <span className="font-semibold">{discount > 0 ? `Giảm ${discount}%` : "Chưa có ưu đãi"}</span>
        </div>
        {next && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[11px] opacity-75">
              <span>
                Tới {next.emoji} {next.label}
              </span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2">
        {discount > 0 && (
          <span className="text-sm line-through opacity-60">{MEMBERSHIP_BASE_PRICE.toLocaleString("vi-VN")}đ</span>
        )}
        <span className="text-2xl font-extrabold">{price.toLocaleString("vi-VN")}đ</span>
        <span className="text-sm opacity-80 mb-1">/ tháng</span>
      </div>

      <button
        disabled
        className="w-full py-2.5 rounded-xl bg-white/20 font-semibold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
      >
        <Sparkles className="w-4 h-4" /> Sắp ra mắt
      </button>
    </div>
  );
}
