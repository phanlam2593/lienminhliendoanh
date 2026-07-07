import { Link } from "react-router-dom";
import { useState } from "react";
import {
  ArrowLeft,
  Users,
  Building2,
  Gift,
  ArrowLeftRight,
  UserCheck,
  Sparkles,
  MessageCircle,
  Send,
  Bell,
  Flag,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { BUSINESS_TYPE_LABEL, BUSINESS_TYPES, BusinessType } from "@/lib/types";

const BIZ_EXAMPLES: Record<BusinessType, string[]> = {
  food: ["Quán cà phê", "Nhà hàng", "Quán ăn vặt", "Tiệm bánh", "Quán chè", "Quán lẩu nướng", "Trà sữa", "Bar/Pub"],
  service: [
    "Giặt ủi",
    "Sửa xe",
    "Làm tóc/nail/spa",
    "Dọn nhà",
    "Sửa chữa điện nước",
    "In ấn",
    "Photo studio",
    "Cho thuê xe máy",
  ],
  stay: ["Homestay", "Khách sạn", "Villa", "Nhà nghỉ", "Hostel", "Farmstay"],
  travel: ["Tour trekking", "Xe ghép/đưa đón", "Hướng dẫn viên", "Cho thuê xe du lịch", "Tổ chức team building"],
  creator: ["TikToker", "YouTuber", "Chụp ảnh/quay video", "Food reviewer", "Blogger du lịch"],
  freelance: ["Thiết kế đồ hoạ", "Dịch thuật", "Dạy kèm", "Viết lách", "Lập trình freelance", "Kế toán dịch vụ"],
  broker: ["Mua bán/cho thuê nhà đất", "Môi giới homestay", "Tư vấn đầu tư bất động sản"],
  other: ["Bất kỳ mô hình nào khác — vẫn tạo ưu đãi, vẫn tham gia cộng đồng bình thường"],
};

interface SectionData {
  id: string;
  icon: any;
  title: string;
  summary: string;
  body: React.ReactNode;
}

function GuideSection({ data, open, onToggle }: { data: SectionData; open: boolean; onToggle: () => void }) {
  const Icon = data.icon;
  return (
    <div id={data.id} className="bg-card rounded-2xl shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-start gap-3 p-4 text-left">
        <span className="w-9 h-9 rounded-full bg-primary/10 grid place-items-center shrink-0">
          <Icon className="w-4.5 h-4.5 text-primary" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-bold text-sm">{data.title}</span>
            {open ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </span>
          <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-2">{data.summary}</span>
        </span>
      </button>
      {open && <div className="px-4 pb-4 pl-[52px] space-y-2">{data.body}</div>}
    </div>
  );
}

function BizTypeItem({ type }: { type: BusinessType }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-accent/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="text-sm font-semibold">{BUSINESS_TYPE_LABEL[type]}</span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
          {BIZ_EXAMPLES[type].map((ex, i) => (
            <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-card text-muted-foreground">
              {ex}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Guide() {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  const sections: SectionData[] = [
    {
      id: "member",
      icon: Users,
      title: "Thành viên",
      summary: "Khám phá địa điểm, dịch vụ theo khu vực Đà Lạt — trải nghiệm và nhận ưu đãi.",
      body: (
        <ul className="space-y-1.5 text-sm">
          <li>🔍 Khám phá địa điểm, dịch vụ theo từng khu vực ở Đà Lạt</li>
          <li>🎁 Nhận ưu đãi từ doanh nghiệp, đưa mã khi trải nghiệm dịch vụ</li>
          <li>🏆 Tích điểm lên cấp, nhận huy hiệu khi hoạt động</li>
        </ul>
      ),
    },
    {
      id: "business",
      icon: Building2,
      title: "Doanh nghiệp",
      summary: "Tạo & quản lý nhiều doanh nghiệp, chia theo nhiều loại hình.",
      body: (
        <div className="space-y-2">
          <p className="text-sm">
            Mỗi thành viên có thể tạo & quản lý <b>nhiều doanh nghiệp</b> cùng lúc, chia theo 8 loại hình cố định. Bấm
            vào từng loại hình bên dưới để xem ví dụ ngành nghề:
          </p>
          <div className="space-y-1.5">
            {BUSINESS_TYPES.map((t) => (
              <BizTypeItem key={t} type={t} />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "offers",
      icon: Gift,
      title: "Ưu đãi",
      summary: "Biến điểm yếu thành lợi thế — cho đi để nhận lại nhiều hơn.",
      body: (
        <div className="space-y-1.5 text-sm">
          <p>Liên Doanh tin: mỗi doanh nghiệp đều có thứ để cho đi, để được nhận lại nhiều hơn.</p>
          <ul className="space-y-1">
            <li>☀️ Sáng vắng khách → ưu đãi giờ sáng → tăng doanh thu giờ trống</li>
            <li>📅 Tháng thấp điểm → ưu đãi cả tháng → kéo khách mùa thấp điểm</li>
            <li>🎁 Mua 5 tặng 1, freeship... — hãy cho đi để nhận lại</li>
          </ul>
        </div>
      ),
    },
    {
      id: "exchange",
      icon: ArrowLeftRight,
      title: "Trao đổi chéo",
      summary: "Kết nối với người cùng ngành — cho và nhận cùng lúc.",
      body: (
        <p className="text-sm">
          Đang hoạt động sáng tạo nội dung, cần thêm follow? Khám phá và kết bạn với người cùng ngành, trao đổi follow
          qua lại — cho và nhận cùng lúc.
        </p>
      ),
    },
    {
      id: "follow",
      icon: UserCheck,
      title: "Theo dõi",
      summary: "Lưu lại nơi quen, nhận ưu đãi mới ngay khi có.",
      body: (
        <p className="text-sm">
          Follow doanh nghiệp để lưu lại nơi quen, nhận thông báo ngay khi có ưu đãi mới — không cần tự vào kiểm tra.
          Doanh nghiệp cũng có thể follow lại khách hàng cũ để chăm sóc trực tiếp, gửi ưu đãi riêng khi cần.
        </p>
      ),
    },
    {
      id: "status",
      icon: Sparkles,
      title: "Thanh trạng thái",
      summary: "Đăng nhu cầu ngay trên hồ sơ — tuyển người, tìm việc, hay một lời chào.",
      body: (
        <p className="text-sm">
          Đăng nhu cầu ngay trên hồ sơ: tuyển nhân viên, đang tìm việc, có ưu đãi mới, kiếm đối tác — hoặc đơn giản chỉ
          là một lời chào gửi đến cộng đồng.
        </p>
      ),
    },
    {
      id: "community-chat",
      icon: MessageCircle,
      title: "Trò chuyện cùng cộng đồng",
      summary: "Chia sẻ, trò chuyện, đăng nhu cầu cùng cả cộng đồng.",
      body: (
        <p className="text-sm">
          Chia sẻ kinh nghiệm, trò chuyện, đăng nhu cầu — cùng trò chuyện với cả cộng đồng theo thời gian thực.
        </p>
      ),
    },
    {
      id: "messages",
      icon: Send,
      title: "Nhắn tin",
      summary: "Tương tác trực tiếp với thành viên, doanh nghiệp, bạn bè.",
      body: (
        <p className="text-sm">
          Nhắn tin trực tiếp với bất kỳ ai trong cộng đồng — thành viên, doanh nghiệp, hay bạn bè.
        </p>
      ),
    },
    {
      id: "notifications",
      icon: Bell,
      title: "Thông báo",
      summary: "Bật/tắt riêng từng loại trong Cài đặt.",
      body: (
        <p className="text-sm">
          Bật/tắt riêng từng loại thông báo trong Cài đặt: tin nhắn mới, người theo dõi mới, ưu đãi mới từ doanh nghiệp
          đang theo dõi, hoặc thông báo từ admin.
        </p>
      ),
    },
    {
      id: "report",
      icon: Flag,
      title: "Báo cáo, góp ý",
      summary: "Doanh nghiệp không giữ đúng ưu đãi? Có lỗi hay góp ý? Báo cáo tại đây.",
      body: (
        <p className="text-sm">
          Doanh nghiệp không giữ đúng ưu đãi đã đăng trên cộng đồng? Gặp lỗi hay có góp ý gì? Hãy báo cáo trực tiếp cho
          Ban quản lý app tại đây.
        </p>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-3 pb-10">
      <div className="flex items-center gap-2">
        <Link
          to="/ho-so"
          className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center"
          aria-label="Quay lại"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-lg">Bảng hướng dẫn</h1>
      </div>

      {sections.map((s) => (
        <GuideSection key={s.id} data={s} open={openId === s.id} onToggle={() => toggle(s.id)} />
      ))}

      <div className="flex items-center gap-2 justify-center text-muted-foreground pt-2">
        <Gift className="w-4 h-4" />
        <span className="text-xs">Cho là nhận, nhận cũng là cho 🌿</span>
      </div>
    </div>
  );
}
