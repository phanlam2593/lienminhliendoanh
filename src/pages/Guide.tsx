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
import { useLanguage } from "@/lib/i18n";

const BIZ_EXAMPLES: Record<BusinessType, { vi: string[]; en: string[] }> = {
  food: {
    vi: ["Quán cà phê", "Nhà hàng", "Quán ăn vặt", "Tiệm bánh", "Quán chè", "Quán lẩu nướng", "Trà sữa", "Bar/Pub"],
    en: [
      "Coffee shop",
      "Restaurant",
      "Street food stall",
      "Bakery",
      "Sweet soup shop",
      "Hotpot & BBQ",
      "Milk tea shop",
      "Bar/Pub",
    ],
  },
  service: {
    vi: [
      "Giặt ủi",
      "Sửa xe",
      "Làm tóc/nail/spa",
      "Dọn nhà",
      "Sửa chữa điện nước",
      "In ấn",
      "Photo studio",
      "Cho thuê xe máy",
    ],
    en: [
      "Laundry",
      "Motorbike repair",
      "Hair/nail/spa",
      "House cleaning",
      "Electrical/plumbing repair",
      "Printing",
      "Photo studio",
      "Motorbike rental",
    ],
  },
  stay: {
    vi: ["Homestay", "Khách sạn", "Villa", "Nhà nghỉ", "Hostel", "Farmstay"],
    en: ["Homestay", "Hotel", "Villa", "Guesthouse", "Hostel", "Farmstay"],
  },
  travel: {
    vi: ["Tour trekking", "Xe ghép/đưa đón", "Hướng dẫn viên", "Cho thuê xe du lịch", "Tổ chức team building"],
    en: ["Trekking tour", "Ride-sharing/transfer", "Tour guide", "Travel vehicle rental", "Team building organizer"],
  },
  creator: {
    vi: ["TikToker", "YouTuber", "Chụp ảnh/quay video", "Food reviewer", "Blogger du lịch"],
    en: ["TikToker", "YouTuber", "Photo/video shooting", "Food reviewer", "Travel blogger"],
  },
  freelance: {
    vi: ["Thiết kế đồ hoạ", "Dịch thuật", "Dạy kèm", "Viết lách", "Lập trình freelance", "Kế toán dịch vụ"],
    en: ["Graphic design", "Translation", "Tutoring", "Writing", "Freelance programming", "Accounting services"],
  },
  broker: {
    vi: ["Mua bán/cho thuê nhà đất", "Môi giới homestay", "Tư vấn đầu tư bất động sản"],
    en: ["Real estate sale/rental", "Homestay brokerage", "Real estate investment consulting"],
  },
  other: {
    vi: ["Bất kỳ mô hình nào khác — vẫn tạo ưu đãi, vẫn tham gia cộng đồng bình thường"],
    en: ["Any other type — you can still create offers and join the community as usual"],
  },
};

const BIZ_OFFER_IDEAS: Record<BusinessType, { vi: string[]; en: string[] }> = {
  food: {
    vi: [
      "Giảm 10% hoá đơn",
      "Miễn phí ship",
      "Mua 5 tặng 1",
      "Tặng nước/tráng miệng kèm món chính",
      "Giảm 15% khung giờ vắng khách",
      "Combo giá cố định (vd 179k bao ăn uống)",
    ],
    en: [
      "10% off the bill",
      "Free shipping",
      "Buy 5 get 1 free",
      "Free drink/dessert with main dish",
      "15% off during quiet hours",
      "Fixed-price combo (e.g. 179k all-inclusive)",
    ],
  },
  service: {
    vi: [
      "Giảm 10-20% cho khách mới",
      "Miễn phí tư vấn/kiểm tra ban đầu",
      "Tặng thêm 1 dịch vụ nhỏ đi kèm",
      "Giảm giá khi đặt combo nhiều dịch vụ",
    ],
    en: [
      "10-20% off for new customers",
      "Free initial consultation/check",
      "Free small add-on service",
      "Discount for service combos",
    ],
  },
  stay: {
    vi: ["Giảm giá đêm thứ 2 trở đi", "Tặng bữa sáng miễn phí", "Miễn phí đưa đón", "Giảm 10% khi đặt trước"],
    en: ["Discount from the 2nd night onward", "Free breakfast", "Free pickup/drop-off", "10% off for advance booking"],
  },
  travel: {
    vi: ["Giảm giá theo nhóm đông", "Tặng nước/đồ ăn nhẹ trên xe", "Giảm 10% đặt sớm", "Combo trọn gói giá cố định"],
    en: [
      "Group discount",
      "Free drinks/snacks on board",
      "10% off for early booking",
      "Fixed-price all-inclusive combo",
    ],
  },
  creator: {
    vi: ["Đổi review lấy ưu đãi", "Giảm giá gói quay dài hạn", "Tặng ảnh/video hậu kỳ nhanh"],
    en: ["Trade a review for a deal", "Discount on long-term shoot packages", "Fast photo/video editing bonus"],
  },
  freelance: {
    vi: ["Giảm giá dự án đầu tiên", "Tặng 1 buổi tư vấn miễn phí", "Giảm % phí khi có khách giới thiệu"],
    en: ["Discount on first project", "Free consultation session", "Referral fee discount"],
  },
  broker: {
    vi: ["Giảm 10% phí hoa hồng", "Miễn phí định giá/đo đạc", "Tặng tư vấn pháp lý cơ bản"],
    en: ["10% off commission fee", "Free appraisal/measurement", "Free basic legal consultation"],
  },
  other: {
    vi: ["Mua 1 tặng 1", "Giảm giá theo dịp đặc biệt", "Miễn phí vận chuyển"],
    en: ["Buy 1 get 1 free", "Special occasion discount", "Free shipping"],
  },
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
  const { lang, t } = useLanguage();
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
            <div className="text-[11px] font-semibold text-muted-foreground mb-1">{t("guide.examples")}</div>
            <div className="flex flex-wrap gap-1.5">
              {BIZ_EXAMPLES[type][lang].map((ex, i) => (
                <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-card text-muted-foreground">
                  {ex}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-primary mb-1">{t("guide.offerIdeas")}</div>
            <div className="flex flex-wrap gap-1.5">
              {BIZ_OFFER_IDEAS[type][lang].map((idea, i) => (
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
  const { t } = useLanguage();
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  const sections: SectionData[] = [
    {
      id: "member",
      icon: Users,
      title: t("guide.memberTitle"),
      summary: t("guide.memberSummary"),
      body: (
        <ul className="space-y-2">
          <IconBullet icon={Search}>{t("guide.memberB1")}</IconBullet>
          <IconBullet icon={Gift}>{t("guide.memberB2")}</IconBullet>
          <IconBullet icon={Award}>{t("guide.memberB3")}</IconBullet>
        </ul>
      ),
    },
    {
      id: "business",
      icon: Building2,
      title: t("guide.bizTitle"),
      summary: t("guide.bizSummary"),
      body: (
        <div className="space-y-2">
          <p className="text-sm">
            {t("guide.bizBody1")}
            <b>{t("guide.bizBodyBold")}</b>
            {t("guide.bizBody2")}
          </p>
          <div className="space-y-1.5">
            {BUSINESS_TYPES.map((bt) => (
              <BizTypeItem key={bt} type={bt} />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "offers",
      icon: Gift,
      title: t("guide.offersTitle"),
      summary: t("guide.offersSummary"),
      body: (
        <ul className="space-y-2">
          <IconBullet icon={Sun}>{t("guide.offersB1")}</IconBullet>
          <IconBullet icon={CalendarDays}>{t("guide.offersB2")}</IconBullet>
          <IconBullet icon={Gift}>{t("guide.offersB3")}</IconBullet>
        </ul>
      ),
    },
    {
      id: "exchange",
      icon: ArrowLeftRight,
      title: t("guide.exchangeTitle"),
      summary: t("guide.exchangeSummary"),
      body: (
        <ul className="space-y-2">
          <IconBullet icon={Users}>{t("guide.exchangeB1")}</IconBullet>
          <IconBullet icon={Repeat}>{t("guide.exchangeB2")}</IconBullet>
        </ul>
      ),
    },
    {
      id: "follow",
      icon: UserCheck,
      title: t("guide.followTitle"),
      summary: t("guide.followSummary"),
      body: (
        <ul className="space-y-2">
          <IconBullet icon={Bell}>{t("guide.followB1")}</IconBullet>
          <IconBullet icon={Heart}>{t("guide.followB2")}</IconBullet>
        </ul>
      ),
    },
    {
      id: "status",
      icon: Sparkles,
      title: t("guide.statusTitle"),
      summary: t("guide.statusSummary"),
      body: (
        <ul className="space-y-2">
          <IconBullet icon={Briefcase}>{t("guide.statusB1")}</IconBullet>
          <IconBullet icon={MessageCircle}>{t("guide.statusB2")}</IconBullet>
        </ul>
      ),
    },
    {
      id: "community-chat",
      icon: MessageCircle,
      title: t("guide.chatTitle"),
      summary: t("guide.chatSummary"),
      body: (
        <ul className="space-y-2">
          <IconBullet icon={Users}>{t("guide.chatB1")}</IconBullet>
          <IconBullet icon={Send}>{t("guide.chatB2")}</IconBullet>
        </ul>
      ),
    },
    {
      id: "messages",
      icon: Send,
      title: t("guide.msgTitle"),
      summary: t("guide.msgSummary"),
      body: (
        <ul className="space-y-2">
          <IconBullet icon={MessageCircle}>{t("guide.msgB1")}</IconBullet>
        </ul>
      ),
    },
    {
      id: "notifications",
      icon: Bell,
      title: t("guide.notifTitle"),
      summary: t("guide.notifSummary"),
      body: (
        <ul className="space-y-2">
          <IconBullet icon={Settings}>{t("guide.notifB1")}</IconBullet>
          <IconBullet icon={Bell}>{t("guide.notifB2")}</IconBullet>
        </ul>
      ),
    },
    {
      id: "report",
      icon: Flag,
      title: t("guide.reportTitle"),
      summary: t("guide.reportSummary"),
      body: (
        <ul className="space-y-2">
          <IconBullet icon={AlertCircle}>{t("guide.reportB1")}</IconBullet>
          <IconBullet icon={Flag}>{t("guide.reportB2")}</IconBullet>
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
        <h1 className="font-bold text-lg">{t("guide.pageTitle")}</h1>
      </div>

      {sections.map((s) => (
        <GuideSection key={s.id} data={s} open={openId === s.id} onToggle={() => toggle(s.id)} />
      ))}

      <div className="flex items-center gap-2 justify-center text-muted-foreground pt-2">
        <Gift className="w-4 h-4" />
        <span className="text-xs">{t("guide.tagline")}</span>
      </div>

      <div className="pt-2 flex justify-center">
        <Link
          to="/ho-so"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t("common.back")}
        </Link>
      </div>
    </div>
  );
}
