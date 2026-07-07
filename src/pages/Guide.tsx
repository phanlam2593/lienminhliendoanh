import { Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Gift, Users, UserCheck, Camera, Building2 } from "lucide-react";
import { BUSINESS_TYPE_LABEL, BusinessType } from "@/lib/types";

const BIZ_TIPS: Record<BusinessType, { headline: string; tips: string[] }> = {
  food: {
    headline: "Ăn uống",
    tips: [
      "Đăng ưu đãi theo giờ vắng khách (giảm giá buổi trưa/tối muộn) để kéo thêm khách",
      "Cập nhật đúng giờ mở/đóng — nhiều người xem giờ trước khi ghé",
      "Ảnh món ăn thật, sáng, rõ — ảnh đẹp tăng tỉ lệ khách bấm nhận ưu đãi",
    ],
  },
  service: {
    headline: "Dịch vụ",
    tips: [
      "Ưu đãi giảm % hoặc tặng thêm cho khách mới trong cộng đồng",
      "Ghi rõ SĐT + địa chỉ để khách liên hệ nhanh",
      "Follow lại khách đã dùng dịch vụ để dễ chăm sóc lần sau",
    ],
  },
  stay: {
    headline: "Lưu trú",
    tips: [
      "Ưu đãi theo mùa/ngày trong tuần (giá tốt hơn ngày thường)",
      "Ảnh phòng thật, đủ sáng — đây là yếu tố quyết định khách đặt hay không",
      "Trả lời tin nhắn nhanh, khách đặt phòng thường cần xác nhận gấp",
    ],
  },
  travel: {
    headline: "Du lịch",
    tips: [
      "Ưu đãi theo combo/tour trọn gói dễ thu hút hơn giảm giá lẻ",
      "Ghi rõ giờ khởi hành, điểm hẹn để khách chủ động sắp xếp",
      "Ảnh/video trải nghiệm thật tăng độ tin tưởng",
    ],
  },
  creator: {
    headline: "Sáng tạo nội dung",
    tips: [
      "Follow + tương tác với cộng đồng để tăng lượt theo dõi ngược lại",
      "Có thể đăng ưu đãi hợp tác quảng bá (review đổi ưu đãi) cho DN khác",
      "Chia sẻ nội dung về Đà Lạt lên Cộng đồng để mọi người biết bạn làm gì",
    ],
  },
  freelance: {
    headline: "Nghề tự do",
    tips: [
      "Giới thiệu rõ dịch vụ/kỹ năng trong mô tả hồ sơ",
      "Dùng tính năng Trao đổi để nhận job hoặc đổi dịch vụ với người khác trong cộng đồng",
      "Ưu đãi nhỏ cho khách đầu tiên giúp có review/uy tín ban đầu",
    ],
  },
  broker: {
    headline: "Môi giới",
    tips: [
      "Đăng tin rõ loại hình (nhà đất, lưu trú...) + khu vực để đúng đối tượng",
      "Cập nhật tin thường xuyên — tin cũ dễ bị bỏ qua",
      "Phản hồi nhanh, môi giới sống nhờ tốc độ",
    ],
  },
  other: {
    headline: "Khác",
    tips: [
      "Mô tả rõ bạn kinh doanh gì trong phần giới thiệu DN",
      "Vẫn có thể tạo ưu đãi cho thành viên như các loại hình khác",
    ],
  },
};

export default function Guide() {
  useEffect(() => {
    const hash = window.location.hash?.slice(1);
    if (hash) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, []);

  return (
    <div className="p-4 space-y-6 pb-10">
      <div className="flex items-center gap-2">
        <Link to="/ho-so" className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center" aria-label="Quay lại">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-lg">Hướng dẫn sử dụng</h1>
      </div>

      <section id="member" className="bg-card rounded-2xl p-4 shadow-sm space-y-2">
        <h2 className="font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Là thành viên, bạn có thể
        </h2>
        <ul className="space-y-1.5 text-sm">
          <li>🎁 Nhận ưu đãi từ doanh nghiệp trong cộng đồng, đưa mã cho DN khi dùng dịch vụ</li>
          <li>💬 Nhắn tin trực tiếp với bất kỳ thành viên/chủ doanh nghiệp nào</li>
          <li>👥 Tham gia chat Cộng đồng, gửi ảnh/sticker, kết bạn</li>
          <li>⭐ Follow doanh nghiệp hoặc người bạn quan tâm (xem mục Follow bên dưới)</li>
          <li>🏆 Tích điểm lên cấp, nhận huy hiệu khi hoạt động (claim ưu đãi, follow DN)</li>
          <li>📝 Viết dòng trạng thái riêng, hiện cho mọi người xem trong hồ sơ/cộng đồng</li>
        </ul>
      </section>

      <section id="follow" className="bg-card rounded-2xl p-4 shadow-sm space-y-2">
        <h2 className="font-bold flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" /> Follow là gì, để làm gì?
        </h2>
        <p className="text-sm">
          Follow 1 <b>doanh nghiệp</b> giúp bạn <b>nhận thông báo ngay khi họ có ưu đãi mới</b> — không cần tự vào
          kiểm tra. Follow 1 <b>thành viên</b> giúp bạn dễ theo dõi hoạt động và nhắn tin nhanh hơn.
        </p>
        <p className="text-sm">
          Nếu bạn là chủ doanh nghiệp, follow lại khách hàng cũ cũng là 1 cách chăm sóc khách hàng — họ biết bạn nhớ
          họ, và bạn dễ nhắn tin ưu đãi riêng khi cần.
        </p>
      </section>

      <section id="business" className="space-y-3">
        <h2 className="font-bold flex items-center gap-2 px-1">
          <Building2 className="w-4 h-4 text-primary" /> Là doanh nghiệp, gợi ý theo từng loại hình
        </h2>
        {(Object.keys(BIZ_TIPS) as BusinessType[]).map((t) => (
          <div id={`biz-${t}`} key={t} className="bg-card rounded-2xl p-4 shadow-sm space-y-1.5">
            <div className="font-semibold text-sm text-primary">{BUSINESS_TYPE_LABEL[t]}</div>
            <ul className="space-y-1 text-sm">
              {BIZ_TIPS[t].tips.map((tip, i) => (
                <li key={i}>• {tip}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section id="creator" className="bg-card rounded-2xl p-4 shadow-sm space-y-2">
        <h2 className="font-bold flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" /> Là người sáng tạo nội dung (TikToker, YouTuber...)
        </h2>
        <p className="text-sm">
          Tạo hồ sơ doanh nghiệp loại hình <b>"Sáng tạo nội dung"</b> để cộng đồng biết bạn làm gì. Bạn follow/tương
          tác với cộng đồng, cộng đồng cũng follow/tương tác lại bạn — cách đơn giản để tăng người theo dõi thật, ở
          ngay tại Đà Lạt.
        </p>
      </section>

      <div className="flex items-center gap-2 justify-center text-muted-foreground pt-2">
        <Gift className="w-4 h-4" />
        <span className="text-xs">Cho là nhận, nhận cũng là cho 🌿</span>
      </div>
    </div>
  );
}
