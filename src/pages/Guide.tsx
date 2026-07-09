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
  Search,
  Award,
  Sun,
  CalendarDays,
  Repeat,
  Heart,
  Briefcase,
  Settings,
  AlertCircle,
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

const BIZ_OFFER_IDEAS: Record<BusinessType, string[]> = {
  food: [
    "Giảm 10% hoá đơn",
    "Miễn phí ship",
    "Mua 5 tặng 1",
    "Tặng nước/tráng miệng kèm món chính",
    "Giảm 15% khung giờ vắng khách",
    "Combo giá cố định (vd 179k bao ăn uống)",
  ],
  service: [
    "Giảm 10-20% cho khách mới",
    "Miễn phí tư vấn/kiểm tra ban đầu",
    "Tặng thêm 1 dịch vụ nhỏ đi kèm",
    "Giảm giá khi đặt combo nhiều dịch vụ",
  ],
  stay: ["Giảm giá đêm thứ 2 trở đi", "Tặng bữa sáng miễn phí", "Miễn phí đưa đón", "Giảm 10% khi đặt trước"],
  travel: ["Giảm giá theo nhóm đông", "Tặng nước/đồ ăn nhẹ trên xe", "Giảm 10% đặt sớm", "Combo trọn gói giá cố định"],
  creator: ["Đổi review lấy ưu đãi", "Giảm giá gói quay dài hạn", "Tặng ảnh/video hậu kỳ nhanh"],
  freelance: ["Giảm giá dự án đầu tiên", "Tặng 1 buổi tư vấn miễn phí", "Giảm % phí khi có khách giới thiệu"],
  broker: ["Giảm 10% phí hoa hồng", "Miễn phí định giá/đo đạc", "Tặng tư vấn pháp lý cơ bản"],
  other: ["Mua 1 tặng 1", "Giảm giá theo dịp đặc biệt", "Miễn phí vận chuyển"],
};

interface SectionData {
  id: string;
  icon: any;
  title: string;
  summary: string;
  body: React.ReactNode;
}

function IconBullet({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="w-5 h-5 rounded-full bg-primary/10 grid place-items-center shrink-0 mt-0.5">
        <Icon className="w-3 h-3 text-primary" />
      </span>
      <span className="text-sm leading-snug">{children}</span>
    </li>
  );
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
        <div className="px-3 pb-3 space-y-2.5">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground mb-1">Ví dụ ngành nghề</div>
            <div className="flex flex-wrap gap-1.5">
              {BIZ_EXAMPLES[type].map((ex, i) => (
                <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-card text-muted-foreground">
                  {ex}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-primary mb-1">💡 Gợi ý ưu đãi nên thử</div>
            <div className="flex flex-wrap gap-1.5">
              {BIZ_OFFER_IDEAS[type].map((idea, i) => (
                <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {idea}
                </span>
              ))}
            </div>
          </div>
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
      summary: "Khám phá theo khu vực, trải nghiệm và nhận ưu đãi.",
      body: (
        <ul className="space-y-2">
          <IconBullet icon={Search}>Khám phá địa điểm, dịch vụ theo từng khu vực</IconBullet>
          <IconBullet icon={Gift}>Nhận ưu đãi, đưa mã khi trải nghiệm</IconBullet>
          <IconBullet icon={Award}>Tích điểm, lên cấp, nhận huy hiệu</IconBullet>
        </ul>
      ),
    },
    {
      id: "business",
      icon: Building2,
      title: "Doanh nghiệp",
      summary: "Tạo & quản lý nhiều doanh nghiệp, chia theo loại hình.",
      body: (
        <div className="space-y-2">
          <p className="text-sm">
            Mỗi thành viên tạo được <b>nhiều doanh nghiệp</b>, chia theo 8 loại hình. Bấm vào 1 loại hình để xem ví dụ
            ngành nghề + gợi ý ưu đãi:
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
      summary: "Biến điểm yếu thành lợi thế.",
      body: (
        <ul className="space-y-2">
          <IconBullet icon={Sun}>Sáng vắng khách → ưu đãi giờ sáng</IconBullet>
          <IconBullet icon={CalendarDays}>Tháng thấp điểm → ưu đãi cả tháng</IconBullet>
          <IconBullet icon={Gift}>Mua 5 tặng 1, freeship... cho đi để nhận lại</IconBullet>
        </ul>
      ),
    },
    {
      id: "exchange",
      icon: ArrowLeftRight,
      title: "Trao đổi chéo",
      summary: "Kết nối cùng ngành, cho và nhận cùng lúc.",
      body: (
        <ul className="space-y-2">
          <IconBullet icon={Users}>Kết bạn với người cùng ngành</IconBullet>
          <IconBullet icon={Repeat}>Trao đổi follow, hỗ trợ qua lại</IconBullet>
        </ul>
      ),
    },
    {
      id: "follow",
      icon: UserCheck,
      title: "Theo dõi",
      summary: "Lưu nơi quen, nhận ưu đãi mới ngay khi có.",
      body: (
        <ul className="space-y-2">
          <IconBullet icon={Bell}>Nhận thông báo ngay khi có ưu đãi mới</IconBullet>
          <IconBullet icon={Heart}>DN follow lại khách cũ để chăm sóc</IconBullet>
        </ul>
      ),
    },
    {
      id: "status",
      icon: Sparkles,
      title: "Thanh trạng thái",
      summary: "Đăng nhu cầu ngay trên hồ sơ.",
      body: (
        <ul className="space-y-2">
          <IconBullet icon={Briefcase}>Tuyển người, tìm việc, tìm đối tác</IconBullet>
          <IconBullet icon={MessageCircle}>Hoặc đơn giản là một lời chào</IconBullet>
        </ul>
      ),
    },
    {
      id: "community-chat",
      icon: MessageCircle,
      title: "Trò chuyện cùng cộng đồng",
      summary: "Chia sẻ, trò chuyện cùng cả cộng đồng.",
      body: (
        <ul className="space-y-2">
          <IconBullet icon={Users}>Trò chuyện, chia sẻ kinh nghiệm</IconBullet>
          <IconBullet icon={Send}>Đăng nhu cầu ngay trong chat chung</IconBullet>
        </ul>
      ),
    },
    {
      id: "messages",
      icon: Send,
      title: "Nhắn tin",
      summary: "Tương tác trực tiếp 1-1.",
      body: (
        <ul className="space-y-2">
          <IconBullet icon={MessageCircle}>Nhắn trực tiếp thành viên, DN, bạn bè</IconBullet>
        </ul>
      ),
    },
    {
      id: "notifications",
      icon: Bell,
      title: "Thông báo",
      summary: "Bật/tắt riêng từng loại trong Cài đặt.",
      body: (
        <ul className="space-y-2">
          <IconBullet icon={Settings}>Bật/tắt riêng từng loại trong Cài đặt</IconBullet>
          <IconBullet icon={Bell}>Tin nhắn, follow mới, ưu đãi, admin</IconBullet>
        </ul>
      ),
    },
    {
      id: "report",
      icon: Flag,
      title: "Báo cáo",
      summary: "Gặp vấn đề? Báo cáo trực tiếp cho BQT.",
      body: (
        <ul className="space-y-2">
          <IconBullet icon={AlertCircle}>DN không giữ đúng ưu đãi đã đăng</IconBullet>
          <IconBullet icon={Flag}>Có lỗi gì đó — gửi thẳng cho BQT, bạn sẽ nhận được phản hồi ngay trong mục "Báo cáo của tôi"</IconBullet>
        </ul>
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
