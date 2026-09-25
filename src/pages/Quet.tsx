import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useBackToClose } from "@/lib/navigation";
import {
  Heart,
  X,
  Flame,
  MessageCircle,
  Trash2,
  Camera,
  Gamepad2,
  Scale,
  Briefcase,
  Settings,
  ChevronLeft,
  MoreVertical,
  Ban,
  Flag,
  Undo2,
  Info,
  SlidersHorizontal,
  UserX,
  Pencil,
  Plus,
  Car,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useOnlineUsers } from "@/lib/onlineUsers";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ReportDialog } from "@/components/ReportDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadImage, validateImage, getSignedUrl, ACCEPT } from "@/lib/upload";
import type { NeedType, SwipeNeed, SwipeMatch } from "@/lib/types";

// Bảng swipe_needs/swipe_actions/swipe_matches được tạo trực tiếp qua SQL (không qua
// Lovable migration UI) nên CHƯA có trong types.ts generated — dùng (supabase as any)
// để bỏ qua kiểm tra type nghiêm ngặt của Database generic CHỈ cho 3 bảng này.
const db = supabase as any;

// Bỏ dấu tiếng Việt để gợi ý khu vực không phân biệt có dấu/không dấu (giống bộ lọc
// Khám phá) — gõ "Da" hay "đà" đều khớp được với "Đà Lạt".
function normalizeVi(str: string): string {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Danh sách gợi ý "loại hình" cho Trao đổi (mua/bán, thuê/cho thuê) — gộp bất động sản +
// xe cộ/đồ dùng/dịch vụ, mỗi mục gắn category để suy ra bộ tuỳ chọn "Tình trạng" phù hợp.
const LOAI_HINH_SEED: { label: string; category: "real_estate" | "goods" }[] = [
  { label: "Nhà nguyên căn", category: "real_estate" },
  { label: "Phòng trọ", category: "real_estate" },
  { label: "Căn hộ", category: "real_estate" },
  { label: "Đất", category: "real_estate" },
  { label: "Mặt bằng kinh doanh", category: "real_estate" },
  { label: "Xe máy", category: "goods" },
  { label: "Ô tô", category: "goods" },
  { label: "Đồ điện tử", category: "goods" },
  { label: "Đồ nội thất", category: "goods" },
  { label: "Đồ gia dụng", category: "goods" },
  { label: "Dịch vụ", category: "goods" },
  { label: "Khác", category: "goods" },
];

// Suy ra "Tình trạng" nên hỏi kiểu bất động sản (còn trống/có người ở) hay kiểu đồ vật
// (mới/đã dùng) dựa trên loại hình đã chọn/gõ — khớp danh sách gợi ý trước, không khớp thì
// đoán qua từ khoá, mặc định về "goods" (áp dụng rộng hơn).
function classifyLoaiHinh(text: string): "real_estate" | "goods" {
  const norm = normalizeVi(text.trim());
  if (!norm) return "goods";
  const seedMatch = LOAI_HINH_SEED.find((s) => normalizeVi(s.label) === norm);
  if (seedMatch) return seedMatch.category;
  if (/nha|dat|phong tro|can ho|mat bang/.test(norm)) return "real_estate";
  return "goods";
}

type ViewTab = "category" | "swipe" | "matches";
const VALID_TABS: ViewTab[] = ["category", "swipe", "matches"];
type CategoryStep = "grid" | "manage" | "form";

// 4 mục cố định của Quẹt (round 29.1: chia lại thành 3 trang — chọn mục / quẹt / kết nối;
// round 29.2: field theo từng mục chi tiết hơn + lọc giới tính kiểu Tinder cho Làm quen;
// round 35: bỏ giới hạn 1 nhu cầu/mục — mỗi mục cho phép nhiều nhu cầu, quản lý qua danh sách).
const CATEGORIES: { type: NeedType; Icon: LucideIcon }[] = [
  { type: "game", Icon: Gamepad2 },
  { type: "lam_quen", Icon: Heart },
  { type: "trao_doi", Icon: Scale },
  { type: "tim_viec", Icon: Briefcase },
];
const CATEGORY_ICON: Record<NeedType, LucideIcon> = {
  game: Gamepad2,
  lam_quen: Heart,
  trao_doi: Scale,
  tim_viec: Briefcase,
};

// Công việc: ngày + ca có thể làm (lưu dạng chuỗi "t2,t3" / "sang,toi" trong details)
const AVAIL_DAYS = ["t2", "t3", "t4", "t5", "t6", "t7", "cn"] as const;
const AVAIL_SHIFTS = ["sang", "chieu", "toi", "dem"] as const;
// Nhà đất: tiện ích xung quanh
const GAN_DAU = ["cho", "sieuThi", "truongHoc", "benhVien", "trungTam", "congVien", "benXe"] as const;
const splitCsv = (v?: string) => (v ? v.split(",").filter(Boolean) : []);

function ChipToggleGroup({
  options,
  value,
  onChange,
  labelFor,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  labelFor: (k: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((k) => {
        const on = value.includes(k);
        return (
          <button
            key={k}
            type="button"
            onClick={() =>
              onChange(on ? value.filter((x) => x !== k) : options.filter((o) => o === k || value.includes(o)))
            }
            className={cn(
              "h-8 px-3 rounded-full text-xs font-semibold border transition",
              on ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground",
            )}
          >
            {labelFor(k)}
          </button>
        );
      })}
    </div>
  );
}

function CategoryIcon({ type, className }: { type: NeedType; className?: string }) {
  const Icon = CATEGORY_ICON[type];
  return <Icon className={className} />;
}

// Ghép các thông tin phụ (lương, tuổi, giới tính, tên game, hình thức trao đổi...) theo
// từng loại nhu cầu (và theo role tìm-việc/tuyển-người) thành 1 dòng nhãn ngắn — giờ chỉ
// hiện trong màn "Chi tiết" (round 35 rút gọn mặt trước thẻ quẹt xuống tên/tuổi/giới thiệu).
function needDetailChips(need: SwipeNeed, t: (key: string, vars?: Record<string, string>) => string): string[] {
  const d = (need.details as Record<string, string>) ?? {};
  const chips: string[] = [];
  if (need.need_type === "tim_viec") {
    const isHirer = d.role === "hirer";
    chips.push(isHirer ? t("quet.roleHirer") : t("quet.roleSeeker"));
    if (d.nganhNghe) chips.push(t(`quet.nganhNghe.${d.nganhNghe}`));
    if (d.salary) chips.push(`💰 ${d.salary}`);
    const days = splitCsv(d.availDays);
    if (days.length) chips.push(`📅 ${days.map((k) => t(`quet.day.${k}`)).join(", ")}`);
    const shifts = splitCsv(d.availShifts);
    if (shifts.length) chips.push(`🕒 ${shifts.map((k) => t(`quet.shift.${k}`)).join(", ")}`);
    if (isHirer) {
      if (d.ageRange) chips.push(`🎂 ${d.ageRange}`);
      if (d.gender === "male") chips.push(t("quet.gender.male"));
      if (d.gender === "female") chips.push(t("quet.gender.female"));
    } else {
      if (d.age) chips.push(t("quet.ageYearsOld", { age: d.age }));
      if (d.skills) chips.push(`🛠️ ${d.skills}`);
    }
  }
  if (need.need_type === "lam_quen") {
    if (d.gender === "male") chips.push(t("quet.gender.male"));
    if (d.gender === "female") chips.push(t("quet.gender.female"));
    if (d.gender === "lgbt") chips.push(t("quet.gender.lgbt"));
    if (d.age) chips.push(t("quet.ageYearsOld", { age: d.age }));
  }
  if (need.need_type === "trao_doi") {
    if (d.tradeType === "buy_sell" || d.tradeType === "rent") {
      const dirKey =
        d.direction === "buy"
          ? "buy"
          : d.direction === "rent_seek"
            ? "rentSeek"
            : d.direction === "rent_offer"
              ? "rentOffer"
              : "sell";
      chips.push(t(`quet.tradeDirection.${dirKey}`));
      if (d.loaiHinh) chips.push(d.loaiHinh);
      if (d.dienTich) chips.push(`${d.dienTich} m²`);
      if (d.phongNgu) chips.push(t("quet.chip.phongNgu", { n: d.phongNgu }));
      if (d.phongTam) chips.push(t("quet.chip.phongTam", { n: d.phongTam }));
      if (d.choDauXe) chips.push(`🅿️ ${t(`quet.choDauXe.${d.choDauXe}`)}`);
      const gan = splitCsv(d.ganDau);
      if (gan.length) chips.push(`📍 ${t("quet.chip.ganDau")} ${gan.map((k) => t(`quet.ganDau.${k}`)).join(", ")}`);
      if (d.gia) chips.push(`💰 ${d.gia}`);
    } else {
      chips.push(t("quet.tradeType.interaction"));
    }
  }
  if (need.need_type === "game") {
    if (d.gameName) chips.push(d.gameName);
    chips.push(d.mode === "trade" ? t("quet.modeTrade") : t("quet.modePlaymate"));
  }
  return chips;
}

// Các field dạng văn bản dài (yêu cầu, kinh nghiệm, đối tượng mong muốn...) hiển thị riêng
// từng dòng trong màn "Chi tiết".
function needExtraLines(
  need: SwipeNeed,
  t: (key: string, vars?: Record<string, string>) => string,
): { label: string; value: string }[] {
  const d = (need.details as Record<string, string>) ?? {};
  const lines: { label: string; value: string }[] = [];
  if (need.need_type === "tim_viec" && d.role !== "hirer" && d.experience) {
    lines.push({ label: t("quet.field.experience"), value: d.experience });
  }
  if ((need.need_type === "lam_quen" || need.need_type === "game") && d.requirement) {
    lines.push({ label: t("quet.field.requirement"), value: d.requirement });
  }
  if (need.need_type === "trao_doi" && d.target) {
    lines.push({ label: t("quet.field.target"), value: d.target });
  }
  if (need.need_type === "trao_doi" && d.tinhTrang) {
    const validKeys = ["trong", "coNguoiO", "moi", "daSuDung"];
    if (validKeys.includes(d.tinhTrang)) {
      lines.push({ label: t("quet.field.tinhTrang"), value: t(`quet.tinhTrang.${d.tinhTrang}`) });
    }
  }
  return lines;
}

// Tuổi hiển thị ở mặt trước thẻ (kiểu Tinder "Tên, Tuổi") — chỉ có ý nghĩa khi là tuổi CỦA
// CHÍNH người đăng (Làm quen, hoặc Tìm việc với vai trò người tìm việc); "Độ tuổi yêu cầu"
// của bên tuyển người là tuổi họ MONG MUỐN ở ứng viên, không phải tuổi của họ, nên bỏ qua.
function needFrontAge(need: SwipeNeed): string | null {
  const d = (need.details as Record<string, string>) ?? {};
  if (need.need_type === "lam_quen" && d.age) return d.age;
  if (need.need_type === "tim_viec" && d.role !== "hirer" && d.age) return d.age;
  return null;
}

interface OwnerInfo {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

type MatchRow = SwipeMatch & {
  otherUser: OwnerInfo | null;
  myNeed: SwipeNeed | null;
  otherNeed: SwipeNeed | null;
};

interface DetailTarget {
  need: SwipeNeed;
  owner: OwnerInfo | null;
  distanceKm: number | null;
}

// Ảnh nền của thẻ quẹt lưu "path" trong storage (giống avatar) chứ không phải URL thẳng —
// tự resolve qua getSignedUrl (có cache sẵn trong lib/upload) rồi mới render <img>.
function CardPhoto({ path, className }: { path: string | null | undefined; className?: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let cancelled = false;
    setUrl("");
    if (!path) return;
    getSignedUrl(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);
  if (!url) return null;
  return (
    <img src={url} alt="" draggable={false} className={cn("absolute inset-0 w-full h-full object-cover", className)} />
  );
}

// Chùm "pháo giấy" bung ra khi match — thuần CSS/inline, không cần thư viện ngoài.
// Toạ độ đích (tx/ty) và góc xoay random hoá 1 lần mỗi khi component này được mount
// (mount lại mỗi lần mở modal match mới, nên mỗi lần match sẽ ra 1 chùm pháo khác nhau).
function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.4;
        const distance = 80 + Math.random() * 70;
        return {
          id: i,
          tx: Math.cos(angle) * distance,
          ty: Math.sin(angle) * distance,
          rot: Math.round(Math.random() * 360),
          delay: Math.round(Math.random() * 150),
          color: ["#00c9a7", "#0891b2", "#fbbf24", "#f97316", "#ec4899", "#8b5cf6"][i % 6],
          size: 5 + Math.random() * 5,
        };
      }),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute left-1/2 top-1/2 rounded-sm confetti-piece"
          style={
            {
              width: `${p.size}px`,
              height: `${p.size * 0.4}px`,
              backgroundColor: p.color,
              "--tx": `${p.tx}px`,
              "--ty": `${p.ty}px`,
              "--rot": `${p.rot}deg`,
              animationDelay: `${p.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function MatchSkeleton() {
  return (
    <div className="w-full flex items-center gap-3 rounded-xl border bg-card p-3 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-muted shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-3.5 bg-muted rounded w-1/3" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
      <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
    </div>
  );
}

function NeedRowSkeleton() {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card p-3 animate-pulse">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-3.5 bg-muted rounded w-2/5" />
        <div className="h-3 bg-muted rounded w-3/5" />
      </div>
      <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
      <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
    </div>
  );
}

// Ngưỡng quẹt tính theo % chiều rộng THẬT của thẻ (đo qua cardRef lúc bắt đầu kéo),
// KHÔNG dùng số px cố định — màn nhỏ/to đều cảm giác "nhẹ tay" như nhau (nguyên tắc #44).
const SWIPE_THRESHOLD_RATIO = 0.28;
const SWIPE_THRESHOLD_MIN = 80;
const SWIPE_THRESHOLD_MAX = 160;
const TAP_MOVE_TOLERANCE = 10;
const TAP_MAX_DURATION = 300;
// Sau khi "bỏ qua" 1 nhu cầu, không ẩn vĩnh viễn nữa — sau PASS_COOLDOWN_HOURS giờ (hoặc sớm
// hơn nếu người đăng đã sửa bài) nhu cầu đó sẽ hiện lại để cân nhắc lần nữa, tránh cạn "kho"
// ứng viên ở các mục ít người đăng. "Thích" thì vẫn ẩn vĩnh viễn như cũ.
const PASS_COOLDOWN_HOURS = 48;

export default function Quet() {
  const { user, profile, isApproved } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const onlineUsers = useOnlineUsers();

  const initialTabParam = searchParams.get("tab");
  const initialTab: ViewTab = VALID_TABS.includes(initialTabParam as ViewTab)
    ? (initialTabParam as ViewTab)
    : "category";

  const [tab, setTab] = useState<ViewTab>(initialTab);
  const [activeCategory, setActiveCategory] = useState<NeedType | null>(null);
  const [categoryStep, setCategoryStep] = useState<CategoryStep>("grid");
  const [manageCategory, setManageCategory] = useState<NeedType | null>(null);
  const [editingNeed, setEditingNeed] = useState<SwipeNeed | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // ── Điều hướng trong Quẹt gắn với URL (25/09) ──
  // Mỗi màn (lưới 4 mục → quản lý → form, quẹt theo mục, Kết nối) là 1 mục lịch sử riêng →
  // nút Back Android / nút ← trong app quay lại ĐÚNG màn trước thay vì thoát hẳn khỏi Quẹt.
  // URL: ?tab=swipe|matches  &cat=<need_type>  &step=manage|form. quetDepth (location.state)
  // = số màn Quẹt đã đẩy vào lịch sử, để biết nav(-1) có còn nằm trong Quẹt hay không.
  const quetDepth = (location.state as { quetDepth?: number } | null)?.quetDepth ?? 0;
  type QuetScreen = { tab: ViewTab; cat?: NeedType | null; step?: CategoryStep };
  const goScreen = (sc: QuetScreen, replace = false) => {
    const p = new URLSearchParams();
    if (sc.tab !== "category") p.set("tab", sc.tab);
    if (sc.cat) p.set("cat", sc.cat);
    if (sc.tab === "category" && sc.step && sc.step !== "grid") p.set("step", sc.step);
    setSearchParams(p, { replace, state: { quetDepth: replace ? quetDepth : quetDepth + 1 } });
  };
  const backScreen = (parent: QuetScreen) => {
    if (quetDepth > 0) nav(-1);
    else goScreen(parent, true);
  };
  const backToRoot = () => {
    if (quetDepth > 0) nav(-quetDepth);
    else goScreen({ tab: "category" }, true);
  };

  // URL → state (chạy cả khi bấm Back/Forward, bấm thông báo lúc đang ở sẵn trang Quẹt, hay
  // bấm lại tab Quẹt ở thanh dưới).
  useEffect(() => {
    const qTab = searchParams.get("tab");
    const urlTab: ViewTab = VALID_TABS.includes(qTab as ViewTab) ? (qTab as ViewTab) : "category";
    const qCat = searchParams.get("cat");
    const urlCat = (["trao_doi", "lam_quen", "tim_viec", "game"] as NeedType[]).includes(qCat as NeedType)
      ? (qCat as NeedType)
      : null;
    const qStep = searchParams.get("step");
    if (urlTab === "swipe") {
      if (urlCat) {
        setActiveCategory(urlCat);
        setTab("swipe");
      } else setTab("category");
    } else setTab(urlTab);
    if (urlTab !== "category") return;
    if (qStep === "form" && urlCat) {
      // Form chỉ mở được bằng thao tác (cần nạp sẵn dữ liệu) — nạp lại trang / Forward tới
      // mà form chưa mở thì hiện màn quản lý của mục đó.
      setCategoryStep((cur) => (cur === "form" ? cur : "manage"));
      setManageCategory(urlCat);
    } else if ((qStep === "manage" || qStep === "form") && urlCat) {
      setCategoryStep("manage");
      setManageCategory(urlCat);
      setEditingNeed(null);
      setConfirmingDelete(false);
    } else {
      setCategoryStep("grid");
      setManageCategory(null);
      setEditingNeed(null);
      setConfirmingDelete(false);
    }
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<SwipeNeed[]>([]);
  const [owners, setOwners] = useState<Record<string, OwnerInfo>>({});

  const [myNeeds, setMyNeeds] = useState<SwipeNeed[]>([]);
  const [myNeedsLoading, setMyNeedsLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [formType, setFormType] = useState<NeedType>("trao_doi");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formRole, setFormRole] = useState<"seeker" | "hirer">("seeker");
  const [formMode, setFormMode] = useState<"playmate" | "trade">("playmate");
  const [formSalary, setFormSalary] = useState("");
  const [formAgeRange, setFormAgeRange] = useState("");
  const [formAge, setFormAge] = useState("");
  const [formGender, setFormGender] = useState("any");
  const [formTargetGender, setFormTargetGender] = useState("any");
  const [formTargetText, setFormTargetText] = useState("");
  const [formRequirement, setFormRequirement] = useState("");
  const [formExperience, setFormExperience] = useState("");
  const [formSkills, setFormSkills] = useState("");
  const [formGameName, setFormGameName] = useState("");
  const [formTradeType, setFormTradeType] = useState<"interaction" | "buy_sell" | "rent">("interaction");
  const [formTradeDirection, setFormTradeDirection] = useState<"sell" | "buy" | "rent_offer" | "rent_seek">("sell");
  const [formLoaiHinh, setFormLoaiHinh] = useState("");
  const [formGiaText, setFormGiaText] = useState("");
  const [formTinhTrang, setFormTinhTrang] = useState("");
  const [formDienTich, setFormDienTich] = useState("");
  const [formNganhNghe, setFormNganhNghe] = useState("");
  const [formAvailDays, setFormAvailDays] = useState<string[]>([]);
  const [formAvailShifts, setFormAvailShifts] = useState<string[]>([]);
  const [formPhongNgu, setFormPhongNgu] = useState("");
  const [formPhongTam, setFormPhongTam] = useState("");
  const [formChoDauXe, setFormChoDauXe] = useState("");
  const [formGanDau, setFormGanDau] = useState<string[]>([]);
  const [loaiHinhCounts, setLoaiHinhCounts] = useState<[string, number][]>([]);
  const [loaiHinhSuggestOpen, setLoaiHinhSuggestOpen] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);
  const [formLat, setFormLat] = useState<number | null>(null);
  const [formLng, setFormLng] = useState<number | null>(null);
  const [locatingForm, setLocatingForm] = useState(false);

  // Gợi ý khu vực (giống bên Khám phá) + vị trí để tính khoảng cách khi quẹt.
  const [areaCounts, setAreaCounts] = useState<[string, number][]>([]);
  const [areaSuggestOpen, setAreaSuggestOpen] = useState(false);
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "requesting" | "granted" | "denied" | "unsupported">("idle");

  // Kéo-thả kiểu Tinder cho thẻ trên cùng.
  // Trong lúc kéo KHÔNG dùng React state (re-render mỗi pointermove gây giật) —
  // cập nhật transform trực tiếp qua ref + requestAnimationFrame.
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ x: 0, y: 0, active: false });
  const cardRef = useRef<HTMLDivElement>(null);
  const likeRef = useRef<HTMLDivElement>(null);
  const passRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const pointerDownTimeRef = useRef(0);
  const swipeThresholdRef = useRef(SWIPE_THRESHOLD_MIN * 1.5); // đo thật lại ở onPointerDown
  const [frontEntering, setFrontEntering] = useState(false);
  const enteredIdRef = useRef<string | null>(null);
  const cardWrapRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  // Giới hạn 10 lượt quẹt/ngày cho người chưa là thành viên — chốt ở server (trigger
  // enforce_swipe_daily_limit), client chỉ hiển thị số lượt còn lại + popup khi hết.
  const [swipeQuota, setSwipeQuota] = useState<{ unlimited: boolean; limit: number; used: number } | null>(null);
  const [swipeLimitOpen, setSwipeLimitOpen] = useState(false);

  const [matchInfo, setMatchInfo] = useState<{ owner: OwnerInfo | null; needTitle: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Bo loc ban kinh + menu "..." (bao cao/chan) + hoan tac quet nham.
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [cardMenuOpen, setCardMenuOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [menuTargetOwnerId, setMenuTargetOwnerId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{
    need: SwipeNeed;
    actionId: string | null;
    matchId: string | null;
  } | null>(null);

  // Bộ lọc theo từng mục (round 35) — độ tuổi (Làm quen/Tìm việc), ngành nghề (Tìm việc),
  // loại giao dịch (Trao đổi), chế độ (Game). Reset mỗi khi đổi mục để không lọc nhầm sang
  // mục khác.
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAgeMin, setFilterAgeMin] = useState("");
  const [filterAgeMax, setFilterAgeMax] = useState("");
  const [filterNganhNghe, setFilterNganhNghe] = useState<string>("all");
  const [filterTradeType, setFilterTradeType] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<string>("all");

  // Ảnh đang xem trong bộ ảnh (tối đa 4) của thẻ trên cùng — chạm nửa trái/phải ảnh (KHÔNG
  // kéo) để chuyển ảnh, chỉ like/dislike khi thật sự quẹt/bấm nút.
  const [photoIndex, setPhotoIndex] = useState(0);

  // Modal "Chi tiết" dùng chung cho cả thẻ quẹt lẫn danh sách Kết nối.
  const [detailFor, setDetailFor] = useState<DetailTarget | null>(null);
  // Ảnh đang xem trong khung "Chi tiết" (bấm vào ảnh nhỏ bên dưới để đổi ảnh chính).
  const [detailPhotoIndex, setDetailPhotoIndex] = useState(0);
  // Back (Android) khi đang mở màn Kết nối / Chi tiết → chỉ đóng màn đó.
  useBackToClose(!!matchInfo, () => setMatchInfo(null));
  useBackToClose(!!detailFor, () => setDetailFor(null));

  // Hủy kết nối (unmatch) từ tab Kết nối.
  const [unmatchTarget, setUnmatchTarget] = useState<MatchRow | null>(null);

  // Toàn bộ màn quẹt phải vừa đúng 1 màn hình: đo không gian còn lại thật (viewport thật -
  // vị trí thẻ - nav dưới) rồi cho thẻ co giãn LẤP ĐẦY phần còn lại — nút bấm và hàng
  // danh mục/bộ lọc giờ nổi ĐÈ lên trên ảnh (absolute, không còn nằm ngoài luồng bên dưới
  // thẻ nữa) nên không cần trừ chiều cao của chúng, và cũng không giới hạn trần cứng
  // (trước đây cap 520px khiến ảnh bỏ trống khoảng trắng phía dưới khi màn hình còn dư chỗ).
  useEffect(() => {
    if (tab !== "swipe" || !activeCategory) return;
    const measure = () => {
      const el = cardWrapRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const navRaw = getComputedStyle(document.documentElement).getPropertyValue("--bottom-nav-h");
      const navH = navRaw.trim().endsWith("rem") ? parseFloat(navRaw) * 16 : parseFloat(navRaw) || 80;
      const avail = vh - top - navH - 12;
      setCardH(Math.round(Math.max(240, avail)));
    };
    window.scrollTo(0, 0);
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [tab, activeCategory, locStatus, radiusKm, loading]);

  const myId = user?.id;

  const needByType = (type: NeedType) => myNeeds.find((n) => n.need_type === type);
  const needsOfType = (type: NeedType) => myNeeds.filter((n) => n.need_type === type);

  useEffect(() => {
    void supabase.rpc("business_area_counts").then(({ data }) => {
      setAreaCounts(((data ?? []) as any[]).map((r) => [r.area as string, Number(r.cnt)]));
    });
    void db.rpc("quet_loai_hinh_counts").then(({ data }: any) => {
      setLoaiHinhCounts(((data ?? []) as any[]).map((r) => [r.loai_hinh as string, Number(r.cnt)]));
    });
  }, []);

  // Round 35: hỏi vị trí ngay khi vừa vào trang Quẹt (thay vì bắt bấm nút thủ công) — vẫn
  // giữ nút "📍 Bật định vị" cũ để bấm lại thủ công nếu lúc đầu bị từ chối/lỗi.
  useEffect(() => {
    if (!isApproved) return;
    if (!navigator.geolocation) {
      setLocStatus("unsupported");
      return;
    }
    setLocStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("granted");
      },
      // Chỉ báo "denied" (kèm banner bảo vào cài đặt trình duyệt) khi đúng là bị TỪ CHỐI
      // quyền (code 1) — timeout/chưa bắt được GPS (code 2/3) thì quay về "idle" để khỏi
      // báo nhầm "bạn đã từ chối" trong khi người dùng chưa từ chối gì; nút "📍 Bật định
      // vị" vẫn còn đó để bấm thử lại.
      (err) => setLocStatus(err.code === 1 ? "denied" : "idle"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApproved]);

  const loadCandidates = async () => {
    if (!myId || !activeCategory) return;
    setLoading(true);
    const { data: swiped } = await db.from("swipe_actions").select("need_id, action, created_at").eq("actor_id", myId);
    // "Thích" thì ẩn vĩnh viễn; "Bỏ qua" thì nhớ thời điểm bỏ qua để tính hạn hồi phục bên dưới.
    const likedIds = new Set<string>();
    const passedAt = new Map<string, string>();
    (swiped ?? []).forEach((s: any) => {
      if (s.action === "like") likedIds.add(s.need_id);
      else if (s.action === "pass") passedAt.set(s.need_id, s.created_at);
    });
    const cooldownCutoff = Date.now() - PASS_COOLDOWN_HOURS * 60 * 60 * 1000;

    let q = db
      .from("swipe_needs")
      .select("*")
      .eq("is_active", true)
      .eq("need_type", activeCategory)
      .neq("user_id", myId);

    // Làm quen: lọc 2 chiều kiểu Tinder — chỉ hiện người có giới tính khớp với "muốn tìm"
    // của mình, VÀ "muốn tìm" của họ khớp với giới tính của mình (hoặc để "Không yêu cầu").
    if (activeCategory === "lam_quen") {
      const myNeed = needByType("lam_quen");
      const myDetails = (myNeed?.details as Record<string, string>) ?? {};
      if (myDetails.target && myDetails.target !== "any") {
        q = q.eq("details->>gender", myDetails.target);
      }
      if (myDetails.gender) {
        q = q.or(`details->>target.eq.${myDetails.gender},details->>target.eq.any`);
      }
    }

    const { data, error } = await q.order("created_at", { ascending: false }).limit(50);
    if (error) {
      toast.error(t("common.error"));
      setLoading(false);
      return;
    }
    const filtered: SwipeNeed[] = (data ?? []).filter((n: SwipeNeed) => {
      if (likedIds.has(n.id)) return false;
      const passedTime = passedAt.get(n.id);
      if (!passedTime) return true;
      const editedSincePass = new Date(n.updated_at).getTime() > new Date(passedTime).getTime();
      const cooldownExpired = new Date(passedTime).getTime() < cooldownCutoff;
      return editedSincePass || cooldownExpired;
    });
    setCandidates(filtered);

    const ownerIds = Array.from(new Set(filtered.map((n) => n.user_id)));
    if (ownerIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles_public")
        .select("id, username, full_name, avatar_url")
        .in("id", ownerIds);
      const map: Record<string, OwnerInfo> = {};
      (profs ?? []).forEach((p: any) => (map[p.id] = p));
      setOwners(map);
    }
    setLoading(false);
  };

  const loadMyNeeds = async () => {
    if (!myId) return;
    const { data } = await db
      .from("swipe_needs")
      .select("*")
      .eq("user_id", myId)
      .order("created_at", { ascending: false });
    setMyNeeds(data ?? []);
    setMyNeedsLoading(false);
  };

  const loadMatches = async () => {
    if (!myId) return;
    const { data } = await db
      .from("swipe_matches")
      .select("*")
      .or(`user_a.eq.${myId},user_b.eq.${myId}`)
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    if (rows.length === 0) {
      setMatches([]);
      setMatchesLoading(false);
      return;
    }
    const needIds = Array.from(new Set(rows.flatMap((r: any) => [r.need_id_a, r.need_id_b])));
    const otherIds = Array.from(new Set(rows.map((r: any) => (r.user_a === myId ? r.user_b : r.user_a)))) as string[];
    const [{ data: needs }, { data: profs }] = await Promise.all([
      db.from("swipe_needs").select("*").in("id", needIds),
      supabase.from("profiles_public").select("id, username, full_name, avatar_url").in("id", otherIds),
    ]);
    const needMap: Record<string, SwipeNeed> = {};
    (needs ?? []).forEach((n: SwipeNeed) => (needMap[n.id] = n));
    const profMap: Record<string, OwnerInfo> = {};
    (profs ?? []).forEach((p: any) => (profMap[p.id] = p));

    setMatches(
      rows.map((r: any) => {
        const otherUserId = r.user_a === myId ? r.user_b : r.user_a;
        // Sửa lỗi: need_id_a/need_id_b được gán theo LEAST/GREATEST(uuid) lúc tạo match (DB
        // trigger handle_swipe_match), KHÔNG cố định tương ứng với user_a/user_b — phải tra
        // chủ sở hữu thật của need_id_a mới biết đâu là nhu cầu của mình, tránh hiện NHẦM
        // nhu cầu của người kia thành "của mình" (và ngược lại) trong tab Kết nối.
        const needAOwner = needMap[r.need_id_a]?.user_id;
        const myNeedId = needAOwner === myId ? r.need_id_a : r.need_id_b;
        const otherNeedId = myNeedId === r.need_id_a ? r.need_id_b : r.need_id_a;
        return {
          ...r,
          otherUser: profMap[otherUserId] ?? null,
          myNeed: needMap[myNeedId] ?? null,
          otherNeed: needMap[otherNeedId] ?? null,
        };
      }),
    );
    setMatchesLoading(false);
  };

  useEffect(() => {
    if (!myId || tab !== "swipe" || !activeCategory) return;
    void loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, tab, activeCategory]);

  useEffect(() => {
    if (tab === "swipe" && !activeCategory) setTab("category");
  }, [tab, activeCategory]);

  useEffect(() => {
    if (!myId) return;
    if (tab === "category") void loadMyNeeds();
    if (tab === "matches") void loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, tab]);

  // Đổi mục quẹt → xoá bộ lọc cũ (tránh lọc nhầm sang mục không liên quan).
  useEffect(() => {
    setFilterAgeMin("");
    setFilterAgeMax("");
    setFilterNganhNghe("all");
    setFilterTradeType("all");
    setFilterMode("all");
    setFilterOpen(false);
  }, [activeCategory]);

  // Hiệu ứng match: chữ/avatar "trồi" lên trước, pháo giấy bung SAU một nhịp ngắn
  // (khớp đúng ý muốn "hiện chữ rồi pháo bông" thay vì bung cùng lúc).
  useEffect(() => {
    if (!matchInfo) {
      setShowConfetti(false);
      return;
    }
    const timer = setTimeout(() => setShowConfetti(true), 260);
    return () => clearTimeout(timer);
  }, [matchInfo]);

  const act = async (need: SwipeNeed, action: "like" | "pass") => {
    if (!myId || busy) return;
    if (swipeQuota && !swipeQuota.unlimited && swipeQuota.used >= swipeQuota.limit) {
      setSwipeLimitOpen(true);
      return;
    }
    setBusy(true);
    const likedOwner = owners[need.user_id] ?? null;
    setCandidates((prev) => prev.filter((n) => n.id !== need.id));
    // upsert (không phải insert) để chống lỗi khi swipe_actions cũ cho đúng nhu cầu này
    // (vd vừa "bỏ qua" rồi "hoàn tác" — hàng cũ có thể đang trong quá trình xoá) vẫn còn —
    // upsert ghi đè action mới thay vì báo lỗi trùng khoá.
    const { data: actionRow, error } = await db
      .from("swipe_actions")
      .upsert(
        { need_id: need.id, actor_id: myId, action, created_at: new Date().toISOString() },
        { onConflict: "need_id,actor_id" },
      )
      .select("id")
      .single();
    if (error) {
      if (String(error.message ?? "").includes("SWIPE_LIMIT")) {
        setSwipeQuota((q) => (q ? { ...q, used: q.limit } : q));
        setSwipeLimitOpen(true);
      } else {
        toast.error(t("common.error"));
      }
      setCandidates((prev) => (prev.some((n) => n.id === need.id) ? prev : [need, ...prev]));
      setBusy(false);
      return;
    }
    setSwipeQuota((q) => (q && !q.unlimited ? { ...q, used: q.used + 1 } : q));
    let matchId: string | null = null;
    if (action === "like") {
      // QUAN TRỌNG (sửa lỗi round 35): trước đây tìm "match GẦN NHẤT có liên quan tới need
      // này" — nếu need này đã từng match với người KHÁC trước đó (vd dữ liệu test), sẽ vô
      // tình lấy nhầm match CŨ đó, và nếu sau đó bấm "hoàn tác" sẽ XOÁ NHẦM match không liên
      // quan. Giờ chỉ tìm match đúng giữa NHU CẦU CỦA MÌNH và nhu cầu vừa thích.
      const myNeedId = activeCategory ? needByType(activeCategory)?.id : null;
      if (myNeedId) {
        const { data: newMatch } = await db
          .from("swipe_matches")
          .select("id")
          .or(
            `and(need_id_a.eq.${need.id},need_id_b.eq.${myNeedId}),and(need_id_a.eq.${myNeedId},need_id_b.eq.${need.id})`,
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (newMatch) {
          matchId = newMatch.id;
          setMatchInfo({ owner: likedOwner, needTitle: need.title });
        }
      }
    }
    setLastAction({ need, actionId: actionRow?.id ?? null, matchId });
    setBusy(false);
  };

  useEffect(() => {
    if (!myId) return;
    void db.rpc("get_my_swipe_quota").then(({ data }: { data: any }) => {
      if (data) setSwipeQuota(data);
    });
  }, [myId]);

  // "Hoan tac" chi co tac dung trong it giay sau khi quet.
  useEffect(() => {
    if (!lastAction) return;
    const timer = setTimeout(() => setLastAction(null), 6000);
    return () => clearTimeout(timer);
  }, [lastAction]);

  const undoLastAction = async () => {
    if (!lastAction || busy) return;
    setBusy(true);
    const { need, actionId, matchId } = lastAction;
    setLastAction(null);
    if (matchId) {
      await db.from("swipe_matches").delete().eq("id", matchId);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
    }
    if (actionId) {
      await db.from("swipe_actions").delete().eq("id", actionId);
    }
    setCandidates((prev) => (prev.some((n) => n.id === need.id) ? prev : [need, ...prev]));
    setBusy(false);
    toast.success(t("quet.undoDone"));
  };

  const blockOwner = async () => {
    if (!myId || !menuTargetOwnerId) return;
    const blockedId = menuTargetOwnerId;
    setConfirmBlockOpen(false);
    const { error: blockError } = await supabase.from("blocks").insert({ blocker_id: myId, blocked_id: blockedId });
    if (blockError) {
      toast.error(t("common.error"));
      return;
    }
    setCandidates((prev) => prev.filter((n) => n.user_id !== blockedId));
    toast.success(t("block.blocked"));
  };

  const unmatch = async () => {
    if (!unmatchTarget) return;
    const id = unmatchTarget.id;
    setUnmatchTarget(null);
    const { error } = await db.from("swipe_matches").delete().eq("id", id);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    setMatches((prev) => prev.filter((m) => m.id !== id));
    toast.success(t("quet.unmatchDone"));
  };

  // Kích hoạt quẹt (từ kéo-thả HOẶC bấm nút) — cho thẻ bay ra rồi mới thật sự gọi act(),
  // để animation và cập nhật dữ liệu khớp nhịp với nhau.
  const triggerSwipe = (dir: "left" | "right") => {
    if (!topCard || exiting || busy) return;
    dragRef.current.active = false;
    setDragging(false);
    setExiting(dir);
    setTimeout(() => {
      void act(topCard, dir === "right" ? "like" : "pass");
      setExiting(null);
      dragRef.current = { x: 0, y: 0, active: false };
    }, 220);
  };

  // Vẽ lại vị trí thẻ theo ngón tay — chạy trong 1 rAF, KHÔNG qua React state.
  const paintDrag = () => {
    rafRef.current = null;
    const el = cardRef.current;
    if (!el) return;
    const { x, y } = dragRef.current;
    const rot = Math.max(-18, Math.min(18, x / 12));
    el.style.transform = `translate3d(${x}px, ${y * 0.4}px, 0) rotate(${rot}deg)`;
    if (likeRef.current)
      likeRef.current.style.opacity = String(Math.max(0, Math.min(1, x / swipeThresholdRef.current)));
    if (passRef.current)
      passRef.current.style.opacity = String(Math.max(0, Math.min(1, -x / swipeThresholdRef.current)));
  };
  const schedulePaint = () => {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(paintDrag);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (exiting) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragRef.current = { x: 0, y: 0, active: true };
    pointerDownTimeRef.current = Date.now();
    // Đo chiều rộng THẬT của thẻ đang kéo (không đoán theo window.innerWidth vì trang có
    // thể có khung/padding riêng) để tính ngưỡng quẹt theo tỉ lệ, không phải số px cố định.
    const cardW = cardRef.current?.getBoundingClientRect().width ?? 0;
    swipeThresholdRef.current = cardW
      ? Math.max(SWIPE_THRESHOLD_MIN, Math.min(SWIPE_THRESHOLD_MAX, cardW * SWIPE_THRESHOLD_RATIO))
      : SWIPE_THRESHOLD_MIN * 1.5;
    if (cardRef.current) cardRef.current.style.transition = "none";
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    dragRef.current.x = e.clientX - dragStart.current.x;
    dragRef.current.y = e.clientY - dragStart.current.y;
    schedulePaint();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const x = dragRef.current.x;
    const y = dragRef.current.y;
    if (Math.abs(x) > swipeThresholdRef.current) {
      triggerSwipe(x > 0 ? "right" : "left");
      return;
    }
    // Bật lại về giữa mượt (spring nhẹ) rồi mới trả quyền vẽ cho React.
    const el = cardRef.current;
    if (el) {
      el.style.transition = "transform 300ms cubic-bezier(0.2,0.9,0.2,1)";
      el.style.transform = "translate3d(0, 0, 0) rotate(0deg)";
    }
    if (likeRef.current) likeRef.current.style.opacity = "0";
    if (passRef.current) passRef.current.style.opacity = "0";
    // Chạm nhẹ (không kéo, không giữ lâu) trên nửa trái/phải ảnh → chuyển ảnh trước/sau,
    // giống Instagram/Tinder — KHÔNG tính là quẹt thích/bỏ qua.
    const dt = Date.now() - pointerDownTimeRef.current;
    if (
      Math.abs(x) < TAP_MOVE_TOLERANCE &&
      Math.abs(y) < TAP_MOVE_TOLERANCE &&
      dt < TAP_MAX_DURATION &&
      topPhotoList.length > 1 &&
      el
    ) {
      const rect = el.getBoundingClientRect();
      const tapX = e.clientX - rect.left;
      setPhotoIndex((i) => {
        if (tapX > rect.width / 2) return Math.min(i + 1, topPhotoList.length - 1);
        return Math.max(i - 1, 0);
      });
    }
    dragRef.current = { x: 0, y: 0, active: false };
    setDragging(false);
  };

  // Đưa toàn bộ field của form về mặc định (tạo mới) hoặc điền sẵn từ 1 nhu cầu có sẵn (sửa).
  const resetFormFields = (type: NeedType, need?: SwipeNeed | null) => {
    setFormType(type);
    setFormTitle(need?.title ?? "");
    setFormDesc(need?.description ?? "");
    setFormArea(need?.area ?? "");
    setFormLat(need?.latitude ?? null);
    setFormLng(need?.longitude ?? null);
    setNewPhotoFiles([]);
    setNewPhotoPreviews([]);
    setExistingPhotos(need?.photo_urls?.length ? need.photo_urls : need?.photo_url ? [need.photo_url] : []);
    const d = (need?.details as Record<string, string>) ?? {};
    setFormRole(d.role === "hirer" ? "hirer" : "seeker");
    setFormMode(d.mode === "trade" ? "trade" : "playmate");
    setFormSalary(d.salary ?? "");
    setFormAgeRange(d.ageRange ?? "");
    setFormAge(d.age ?? "");
    setFormGender(d.gender ?? (type === "tim_viec" ? "any" : "male"));
    setFormTargetGender(type === "lam_quen" ? (d.target ?? "any") : "any");
    setFormTargetText(type === "trao_doi" ? (d.target ?? "") : "");
    setFormRequirement(d.requirement ?? "");
    setFormExperience(d.experience ?? "");
    setFormSkills(d.skills ?? "");
    setFormGameName(d.gameName ?? "");
    const tt = d.tradeType === "buy_sell" ? "buy_sell" : d.tradeType === "rent" ? "rent" : "interaction";
    setFormTradeType(tt);
    setFormTradeDirection(
      d.direction === "buy" || d.direction === "sell" || d.direction === "rent_seek" || d.direction === "rent_offer"
        ? d.direction
        : tt === "rent"
          ? "rent_offer"
          : "sell",
    );
    setFormLoaiHinh(d.loaiHinh ?? "");
    setFormGiaText(d.gia ?? "");
    setFormTinhTrang(d.tinhTrang ?? "");
    setFormDienTich(d.dienTich ?? "");
    setFormNganhNghe(d.nganhNghe ?? "");
    setFormAvailDays(splitCsv(d.availDays));
    setFormAvailShifts(splitCsv(d.availShifts));
    setFormPhongNgu(d.phongNgu ?? "");
    setFormPhongTam(d.phongTam ?? "");
    setFormChoDauXe(d.choDauXe ?? "");
    setFormGanDau(splitCsv(d.ganDau));
  };

  // Bấm thẻ mục lớn: có nhu cầu ĐANG HOẠT ĐỘNG thuộc mục này thì vào quẹt luôn; chưa có (hoặc
  // toàn bộ đang tạm dừng) thì mở màn quản lý danh sách để tạo mới.
  const handleCategoryClick = (type: NeedType) => {
    const hasActive = myNeeds.some((n) => n.need_type === type && n.is_active);
    if (hasActive) {
      goScreen({ tab: "swipe", cat: type });
      return;
    }
    goScreen({ tab: "category", step: "manage", cat: type });
  };

  const openManage = (type: NeedType) => {
    goScreen({ tab: "category", step: "manage", cat: type });
  };

  const openCreateForm = (type: NeedType) => {
    resetFormFields(type, null);
    setEditingNeed(null);
    setConfirmingDelete(false);
    setCategoryStep("form");
    goScreen({ tab: "category", step: "form", cat: type });
  };

  const openEdit = (need: SwipeNeed) => {
    resetFormFields(need.need_type, need);
    setEditingNeed(need);
    setConfirmingDelete(false);
    setCategoryStep("form");
    goScreen({ tab: "category", step: "form", cat: need.need_type });
  };

  // Game/Trao đổi không còn field Tiêu đề riêng — bắt buộc phải có Mô tả/Giới thiệu thay thế.
  const canSave = formType === "game" || formType === "trao_doi" ? !!formDesc.trim() : !!formTitle.trim();

  const saveNeed = async () => {
    if (!myId || !canSave) return;
    setSaving(true);
    let finalPhotoUrls: string[] = existingPhotos;
    if (newPhotoFiles.length > 0) {
      try {
        const uploaded = await Promise.all(newPhotoFiles.map((f) => uploadImage(f, "quet", myId)));
        finalPhotoUrls = [...existingPhotos, ...uploaded].slice(0, 4);
      } catch {
        toast.error(t("common.error"));
        setSaving(false);
        return;
      }
    }
    const details: Record<string, string> = {};
    let finalTitle = formTitle.trim();
    if (formType === "tim_viec") {
      details.role = formRole;
      if (formNganhNghe) details.nganhNghe = formNganhNghe;
      if (formAvailDays.length) details.availDays = formAvailDays.join(",");
      if (formAvailShifts.length) details.availShifts = formAvailShifts.join(",");
      if (formRole === "hirer") {
        if (formSalary.trim()) details.salary = formSalary.trim();
        if (formAgeRange.trim()) details.ageRange = formAgeRange.trim();
        details.gender = formGender;
      } else {
        if (formSalary.trim()) details.salary = formSalary.trim();
        if (formAge.trim()) details.age = formAge.trim();
        if (formExperience.trim()) details.experience = formExperience.trim();
        if (formSkills.trim()) details.skills = formSkills.trim();
      }
    }
    if (formType === "lam_quen") {
      details.gender = formGender;
      details.target = formTargetGender;
      if (formAge.trim()) details.age = formAge.trim();
      if (formRequirement.trim()) details.requirement = formRequirement.trim();
    }
    if (formType === "trao_doi") {
      details.tradeType = formTradeType;
      if (formTradeType === "interaction") {
        if (formTargetText.trim()) details.target = formTargetText.trim();
      } else {
        details.direction = formTradeDirection;
        if (formLoaiHinh.trim()) details.loaiHinh = formLoaiHinh.trim();
        if (classifyLoaiHinh(formLoaiHinh) === "real_estate") {
          if (formDienTich.trim()) details.dienTich = formDienTich.trim();
          if (formPhongNgu) details.phongNgu = formPhongNgu;
          if (formPhongTam) details.phongTam = formPhongTam;
          if (formChoDauXe) details.choDauXe = formChoDauXe;
          if (formGanDau.length) details.ganDau = formGanDau.join(",");
        }
        if (formGiaText.trim()) details.gia = formGiaText.trim();
        const isOffering = formTradeDirection === "sell" || formTradeDirection === "rent_offer";
        if (isOffering && formTinhTrang) details.tinhTrang = formTinhTrang;
      }
      finalTitle = t(`quet.tradeType.${formTradeType}`);
    }
    if (formType === "game") {
      details.mode = formMode;
      if (formGameName.trim()) details.gameName = formGameName.trim();
      if (formRequirement.trim()) details.requirement = formRequirement.trim();
      finalTitle = formGameName.trim() || t("quet.type.game");
    }
    const payload = {
      need_type: formType,
      title: finalTitle,
      description: formDesc.trim() || null,
      area: formArea.trim() || null,
      latitude: formLat,
      longitude: formLng,
      details,
      photo_url: finalPhotoUrls[0] ?? null,
      photo_urls: finalPhotoUrls,
    };
    let error;
    if (editingNeed) {
      ({ error } = await db.from("swipe_needs").update(payload).eq("id", editingNeed.id));
    } else {
      ({ error } = await db.from("swipe_needs").insert({ user_id: myId, is_active: true, ...payload }));
    }
    setSaving(false);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("common.saved"));
    await loadMyNeeds();
    setEditingNeed(null);
    // Round 35: quay về danh sách quản lý (không nhảy thẳng vào quẹt nữa) — vì giờ 1 mục có
    // thể có nhiều nhu cầu, người dùng có thể muốn thêm/sửa tiếp trước khi bắt đầu quẹt.
    // (thay thế mục lịch sử của form → Back từ màn quản lý không mở lại form đã lưu)
    goScreen({ tab: "category", step: "manage", cat: formType }, true);
  };

  const togglePauseEditing = async () => {
    if (!editingNeed) return;
    const next = !editingNeed.is_active;
    await db.from("swipe_needs").update({ is_active: next }).eq("id", editingNeed.id);
    setEditingNeed({ ...editingNeed, is_active: next });
    void loadMyNeeds();
  };

  const deleteEditing = async () => {
    if (!editingNeed) return;
    const type = editingNeed.need_type;
    await db.from("swipe_needs").delete().eq("id", editingNeed.id);
    setEditingNeed(null);
    goScreen({ tab: "category", step: "manage", cat: type }, true);
    void loadMyNeeds();
  };

  const deleteFromManageList = async (id: string) => {
    setDeleteTargetId(null);
    await db.from("swipe_needs").delete().eq("id", id);
    void loadMyNeeds();
  };

  const visibleCandidates = useMemo(() => {
    let list = candidates;
    if (radiusKm != null && myPos) {
      list = list.filter((n) => {
        if (n.latitude == null || n.longitude == null) return true;
        return haversineKm(myPos.lat, myPos.lng, n.latitude, n.longitude) <= radiusKm;
      });
    }
    const ageMin = filterAgeMin.trim() ? Number(filterAgeMin) : null;
    const ageMax = filterAgeMax.trim() ? Number(filterAgeMax) : null;
    if ((activeCategory === "lam_quen" || activeCategory === "tim_viec") && (ageMin != null || ageMax != null)) {
      list = list.filter((n) => {
        const d = (n.details as Record<string, string>) ?? {};
        const ageStr = activeCategory === "tim_viec" && d.role === "hirer" ? null : d.age;
        if (!ageStr) return true;
        const age = Number(ageStr);
        if (Number.isNaN(age)) return true;
        if (ageMin != null && age < ageMin) return false;
        if (ageMax != null && age > ageMax) return false;
        return true;
      });
    }
    if (activeCategory === "tim_viec" && filterNganhNghe !== "all") {
      list = list.filter((n) => ((n.details as Record<string, string>)?.nganhNghe ?? "") === filterNganhNghe);
    }
    if (activeCategory === "trao_doi" && filterTradeType !== "all") {
      list = list.filter(
        (n) => ((n.details as Record<string, string>)?.tradeType ?? "interaction") === filterTradeType,
      );
    }
    if (activeCategory === "game" && filterMode !== "all") {
      list = list.filter((n) => ((n.details as Record<string, string>)?.mode ?? "playmate") === filterMode);
    }
    return list;
  }, [
    candidates,
    myPos,
    radiusKm,
    activeCategory,
    filterAgeMin,
    filterAgeMax,
    filterNganhNghe,
    filterTradeType,
    filterMode,
  ]);

  const filterActive =
    !!filterAgeMin.trim() ||
    !!filterAgeMax.trim() ||
    filterNganhNghe !== "all" ||
    filterTradeType !== "all" ||
    filterMode !== "all" ||
    radiusKm != null;

  const topCard = visibleCandidates[0];
  const nextCard = visibleCandidates[1];
  // Bộ ảnh của thẻ trên cùng (dùng để giới hạn chỉ số ảnh khi chạm chuyển ảnh trong
  // onPointerUp phía trên — closure đó chỉ thực sự chạy lúc người dùng thả tay, tức LÀ SAU
  // khi lượt render này đã hoàn tất, nên tham chiếu một biến khai báo sau nó trong cùng hàm
  // vẫn đọc đúng giá trị mới nhất, không bị lỗi thứ tự khai báo).
  const topPhotoList: string[] = topCard?.photo_urls?.length
    ? topCard.photo_urls.slice(0, 4)
    : topCard?.photo_url
      ? [topCard.photo_url]
      : [];
  const topOwner = topCard ? owners[topCard.user_id] : null;
  const topOwnerOnline = topOwner ? onlineUsers.has(topOwner.id) : false;
  const topDistanceKm =
    myPos && topCard?.latitude != null && topCard?.longitude != null
      ? haversineKm(myPos.lat, myPos.lng, topCard.latitude, topCard.longitude)
      : null;
  const topFrontAge = topCard ? needFrontAge(topCard) : null;
  const [descExpanded, setDescExpanded] = useState(false);
  useEffect(() => {
    setDescExpanded(false);
    setPhotoIndex(0);
  }, [topCard?.id]);

  // Khi thẻ đầu đổi (sau khi quẹt xong, đổi sang người kế tiếp) → phát 1 hiệu ứng
  // "trồi lên" ngắn (bắt đầu ở dáng nhỏ/mờ như lúc còn là thẻ phía sau, rồi mới
  // animate về đúng vị trí) thay vì thẻ mới bật ra đột ngột/giật lại từ vị trí cũ.
  useEffect(() => {
    if (!topCard) return;
    if (enteredIdRef.current === topCard.id) return;
    enteredIdRef.current = topCard.id;
    setFrontEntering(true);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFrontEntering(false));
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topCard?.id]);

  let cardStyle: React.CSSProperties;
  if (exiting) {
    const flyX = exiting === "right" ? 700 : -700;
    cardStyle = {
      transform: `translate3d(${flyX}px, ${dragRef.current.y}px, 0) rotate(${exiting === "right" ? 24 : -24}deg)`,
      opacity: 0,
      transition: "transform 220ms ease-out, opacity 220ms ease-out",
    };
  } else if (dragging) {
    // Trong lúc kéo, transform do paintDrag() ghi trực tiếp — React không quản lý nữa.
    cardStyle = { transition: "none" };
  } else if (frontEntering) {
    // Vị trí xuất phát của hiệu ứng "trồi lên": y hệt dáng vẻ lúc còn là thẻ phía sau
    // (scale nhỏ hơn + hạ xuống + mờ hơn), CHƯA có transition — để frame sau mới bật
    // transition rồi đổi giá trị thì trình duyệt mới thật sự animate được.
    cardStyle = { transform: "scale(0.95) translateY(8px) rotate(0deg)", opacity: 0.7, transition: "none" };
  } else {
    cardStyle = {
      transform: "scale(1) translateY(0) rotate(0deg)",
      opacity: 1,
      transition: "transform 280ms cubic-bezier(0.2,0.8,0.2,1), opacity 280ms ease-out",
    };
  }

  const openDetail = (need: SwipeNeed, owner: OwnerInfo | null, distanceKm: number | null) => {
    setDetailFor({ need, owner, distanceKm });
    setDetailPhotoIndex(0);
  };

  if (!isApproved) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
        {t("quet.loginRequired")}
      </div>
    );
  }

  const detailChips = detailFor ? needDetailChips(detailFor.need, t) : [];
  const detailExtraLines = detailFor ? needExtraLines(detailFor.need, t) : [];
  const detailPhotos = detailFor
    ? detailFor.need.photo_urls?.length
      ? detailFor.need.photo_urls.slice(0, 4)
      : detailFor.need.photo_url
        ? [detailFor.need.photo_url]
        : []
    : [];

  const swipeFloating = tab === "swipe" && !!activeCategory;

  return (
    <div className={cn("relative space-y-4", tab === "swipe" ? "" : "p-4")}>
      <div
        className={cn("flex items-center justify-between transition", swipeFloating && "absolute top-3 inset-x-3 z-40")}
      >
        <h1
          onClick={backToRoot}
          className={cn(
            "text-xl font-extrabold flex items-center gap-1.5 cursor-pointer",
            swipeFloating && "bg-black/35 backdrop-blur-sm rounded-full px-3 py-1.5 text-white",
          )}
        >
          <Flame className="w-5 h-5 text-primary" /> {t("quet.title")}
        </h1>
        <div
          className={cn(
            "flex items-center gap-1 rounded-full p-1 text-xs font-semibold",
            swipeFloating ? "bg-black/25 backdrop-blur-sm" : "bg-muted",
          )}
        >
          <button
            onClick={() => {
              if (tab === "matches" || tab === "swipe") backToRoot();
            }}
            className={cn(
              "px-3 py-1.5 rounded-full transition",
              tab !== "matches"
                ? swipeFloating
                  ? "bg-white/90 text-primary shadow-soft"
                  : "bg-card shadow-soft text-primary"
                : swipeFloating
                  ? "text-white/80"
                  : "text-muted-foreground",
            )}
          >
            {t("quet.tabSwipe")}
          </button>
          <button
            onClick={() => {
              if (tab !== "matches") goScreen({ tab: "matches" });
            }}
            className={cn(
              "px-3 py-1.5 rounded-full transition",
              tab === "matches"
                ? swipeFloating
                  ? "bg-white/90 text-primary shadow-soft"
                  : "bg-card shadow-soft text-primary"
                : swipeFloating
                  ? "text-white/80"
                  : "text-muted-foreground",
            )}
          >
            {t("quet.tabMatches")}
          </button>
        </div>
      </div>

      {tab === "category" && categoryStep === "grid" && (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">{t("quet.category.subtitle")}</div>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(({ type, Icon }) => {
              return (
                <div
                  key={type}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCategoryClick(type)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCategoryClick(type);
                    }
                  }}
                  className="h-full w-full rounded-2xl border bg-card p-4 pb-3 flex flex-col items-center gap-2 text-center cursor-pointer active:scale-95 transition"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-brand text-primary-foreground grid place-items-center">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="font-bold text-sm">{t(`quet.type.${type}`)}</div>
                  <div className="text-[11px] text-muted-foreground leading-snug">
                    {t(`quet.category.${type}.brief`)}
                  </div>
                  {/* Nút Quản lý nằm GỌN TRONG khung thẻ (trước đây là nút rời bên dưới khung) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openManage(type);
                    }}
                    className="mt-auto w-full h-8 rounded-xl bg-muted/60 text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1.5 active:scale-95 transition"
                  >
                    <Settings className="w-3.5 h-3.5" /> {t("quet.category.manage")}
                  </button>
                </div>
              );
            })}
          </div>
          {/* Đưa đón & giao hàng — thẻ ngang dưới 4 mục */}
          <button
            type="button"
            onClick={() => nav("/dua-don")}
            className="w-full rounded-2xl border bg-card p-3 flex items-center gap-3 text-left active:scale-[0.98] transition"
          >
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-brand text-primary-foreground grid place-items-center">
              <Car className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{t("quet.rides.title")}</div>
              <div className="text-[11px] text-muted-foreground leading-snug">{t("quet.rides.brief")}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {tab === "category" && categoryStep === "manage" && manageCategory && (
        <div className="space-y-3">
          <button
            onClick={() => backScreen({ tab: "category" })}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> {t("quet.backToCategories")}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand text-primary-foreground grid place-items-center">
              <CategoryIcon type={manageCategory} className="w-5 h-5" />
            </div>
            <div className="font-extrabold">{t(`quet.type.${manageCategory}`)}</div>
          </div>

          <div className="space-y-2">
            {myNeedsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <NeedRowSkeleton key={i} />
                ))}
              </div>
            ) : needsOfType(manageCategory).length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">{t("quet.noNeedsYet")}</div>
            ) : (
              needsOfType(manageCategory).map((n) => (
                <div key={n.id} className="flex items-center gap-2 rounded-xl border bg-card p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm truncate">{n.title}</span>
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                          n.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {n.is_active ? t("quet.category.active") : t("quet.category.paused")}
                      </span>
                    </div>
                    {n.description && <div className="text-xs text-muted-foreground truncate">{n.description}</div>}
                  </div>
                  <button
                    onClick={() => openEdit(n)}
                    aria-label={t("quet.editNeed")}
                    className="w-8 h-8 rounded-full border grid place-items-center text-muted-foreground shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTargetId(n.id)}
                    aria-label={t("quet.deleteNeed")}
                    className="w-8 h-8 rounded-full border border-destructive/40 grid place-items-center text-destructive shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => openCreateForm(manageCategory)}
            className="w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold text-muted-foreground flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" /> {t("quet.addNeed")}
          </button>
        </div>
      )}

      {tab === "category" && categoryStep === "form" && (
        <div className="space-y-3">
          <button
            onClick={() => backScreen({ tab: "category", step: "manage", cat: formType })}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> {t("quet.backToCategories")}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand text-primary-foreground grid place-items-center">
              <CategoryIcon type={formType} className="w-5 h-5" />
            </div>
            <div className="font-extrabold">{t(`quet.type.${formType}`)}</div>
          </div>

          {/* ── Field mở đầu riêng theo từng mục ── */}
          {formType === "tim_viec" && (
            <Select value={formRole} onValueChange={(v) => setFormRole(v as "seeker" | "hirer")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seeker">{t("quet.roleSeeker")}</SelectItem>
                <SelectItem value="hirer">{t("quet.roleHirer")}</SelectItem>
              </SelectContent>
            </Select>
          )}
          {formType === "tim_viec" && (
            <Select value={formNganhNghe} onValueChange={setFormNganhNghe}>
              <SelectTrigger>
                <SelectValue placeholder={t("quet.field.nganhNghe")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fnb">{t("quet.nganhNghe.fnb")}</SelectItem>
                <SelectItem value="banHang">{t("quet.nganhNghe.banHang")}</SelectItem>
                <SelectItem value="giaoHang">{t("quet.nganhNghe.giaoHang")}</SelectItem>
                <SelectItem value="cskh">{t("quet.nganhNghe.cskh")}</SelectItem>
                <SelectItem value="lamDep">{t("quet.nganhNghe.lamDep")}</SelectItem>
                <SelectItem value="xayDung">{t("quet.nganhNghe.xayDung")}</SelectItem>
                <SelectItem value="vanPhong">{t("quet.nganhNghe.vanPhong")}</SelectItem>
                <SelectItem value="congNghe">{t("quet.nganhNghe.congNghe")}</SelectItem>
                <SelectItem value="giaoDuc">{t("quet.nganhNghe.giaoDuc")}</SelectItem>
                <SelectItem value="khac">{t("quet.nganhNghe.khac")}</SelectItem>
              </SelectContent>
            </Select>
          )}
          {formType === "tim_viec" && (
            <div className="space-y-1.5 rounded-xl border p-3">
              <div className="text-xs font-semibold text-muted-foreground">
                {formRole === "hirer" ? t("quet.field.availHirer") : t("quet.field.availSeeker")}
              </div>
              <ChipToggleGroup
                options={AVAIL_DAYS}
                value={formAvailDays}
                onChange={setFormAvailDays}
                labelFor={(k) => t(`quet.day.${k}`)}
              />
              <ChipToggleGroup
                options={AVAIL_SHIFTS}
                value={formAvailShifts}
                onChange={setFormAvailShifts}
                labelFor={(k) => t(`quet.shift.${k}`)}
              />
            </div>
          )}
          {formType === "game" && (
            <>
              <Select value={formMode} onValueChange={(v) => setFormMode(v as "playmate" | "trade")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="playmate">{t("quet.modePlaymate")}</SelectItem>
                  <SelectItem value="trade">{t("quet.modeTrade")}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder={t("quet.field.gameName")}
                value={formGameName}
                onChange={(e) => setFormGameName(e.target.value)}
              />
            </>
          )}
          {formType === "trao_doi" && (
            <Select
              value={formTradeType}
              onValueChange={(v) => {
                const tt = v as "interaction" | "buy_sell" | "rent";
                setFormTradeType(tt);
                setFormTradeDirection(tt === "rent" ? "rent_offer" : "sell");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interaction">{t("quet.tradeType.interaction")}</SelectItem>
                <SelectItem value="buy_sell">{t("quet.tradeType.buySell")}</SelectItem>
                <SelectItem value="rent">{t("quet.tradeType.rent")}</SelectItem>
              </SelectContent>
            </Select>
          )}
          {formType === "trao_doi" && formTradeType !== "interaction" && (
            <Select
              value={formTradeDirection}
              onValueChange={(v) => setFormTradeDirection(v as "sell" | "buy" | "rent_offer" | "rent_seek")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formTradeType === "buy_sell" ? (
                  <>
                    <SelectItem value="sell">{t("quet.tradeDirection.sell")}</SelectItem>
                    <SelectItem value="buy">{t("quet.tradeDirection.buy")}</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="rent_offer">{t("quet.tradeDirection.rentOffer")}</SelectItem>
                    <SelectItem value="rent_seek">{t("quet.tradeDirection.rentSeek")}</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          )}

          {/* Tiêu đề — CHỈ còn ở Làm quen ("Tên") và Công việc, Game/Trao đổi bỏ hẳn */}
          {(formType === "lam_quen" || formType === "tim_viec") && (
            <Input
              placeholder={t(`quet.field.title.${formType}`)}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
          )}

          {/* ── Công việc: field khác nhau hẳn giữa Tìm việc và Tuyển người ── */}
          {formType === "tim_viec" && formRole === "seeker" && (
            <>
              <Input
                placeholder={t("quet.field.desiredSalary")}
                value={formSalary}
                onChange={(e) => setFormSalary(e.target.value)}
              />
              <Input placeholder={t("quet.field.age")} value={formAge} onChange={(e) => setFormAge(e.target.value)} />
              <Input
                placeholder={t("quet.field.experience")}
                value={formExperience}
                onChange={(e) => setFormExperience(e.target.value)}
              />
              <Input
                placeholder={t("quet.field.skills")}
                value={formSkills}
                onChange={(e) => setFormSkills(e.target.value)}
              />
            </>
          )}
          {formType === "tim_viec" && formRole === "hirer" && (
            <>
              <Input
                placeholder={t("quet.field.salary")}
                value={formSalary}
                onChange={(e) => setFormSalary(e.target.value)}
              />
              <Input
                placeholder={t("quet.field.ageRange")}
                value={formAgeRange}
                onChange={(e) => setFormAgeRange(e.target.value)}
              />
              <Select value={formGender} onValueChange={setFormGender}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("quet.gender.male")}</SelectItem>
                  <SelectItem value="female">{t("quet.gender.female")}</SelectItem>
                  <SelectItem value="any">{t("quet.gender.any")}</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {/* ── Làm quen: giới tính của mình + muốn tìm ai (lọc 2 chiều kiểu Tinder) + tuổi ── */}
          {formType === "lam_quen" && (
            <>
              <div>
                <div className="text-xs font-semibold mb-1 text-muted-foreground">{t("quet.field.gender")}</div>
                <Select value={formGender} onValueChange={setFormGender}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t("quet.gender.male")}</SelectItem>
                    <SelectItem value="female">{t("quet.gender.female")}</SelectItem>
                    <SelectItem value="lgbt">{t("quet.gender.lgbt")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs font-semibold mb-1 text-muted-foreground">{t("quet.field.targetGender")}</div>
                <Select value={formTargetGender} onValueChange={setFormTargetGender}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t("quet.gender.male")}</SelectItem>
                    <SelectItem value="female">{t("quet.gender.female")}</SelectItem>
                    <SelectItem value="any">{t("quet.gender.any")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder={t("quet.field.age")} value={formAge} onChange={(e) => setFormAge(e.target.value)} />
            </>
          )}

          {/* ── Mô tả/Giới thiệu — dùng chung, nhãn đổi theo từng mục ── */}
          <Textarea
            placeholder={
              formType === "trao_doi" &&
              formTradeType !== "interaction" &&
              (formTradeDirection === "buy" || formTradeDirection === "rent_seek")
                ? t("quet.field.descRequest")
                : t(`quet.field.desc.${formType}`)
            }
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            rows={3}
          />

          {/* ── Field đứng SAU phần mô tả theo từng mục ── */}
          {(formType === "lam_quen" || formType === "game") && (
            <Textarea
              placeholder={t("quet.field.requirement")}
              value={formRequirement}
              onChange={(e) => setFormRequirement(e.target.value)}
              rows={2}
            />
          )}
          {formType === "trao_doi" && formTradeType === "interaction" && (
            <Input
              placeholder={t("quet.field.target")}
              value={formTargetText}
              onChange={(e) => setFormTargetText(e.target.value)}
            />
          )}
          {formType === "trao_doi" && formTradeType !== "interaction" && (
            <div className="relative">
              <Input
                placeholder={
                  formTradeDirection === "sell" || formTradeDirection === "rent_offer"
                    ? t("quet.field.loaiHinh")
                    : t("quet.field.loaiHinhWanted")
                }
                value={formLoaiHinh}
                onChange={(e) => {
                  setFormLoaiHinh(e.target.value);
                  setLoaiHinhSuggestOpen(true);
                }}
                onFocus={() => setLoaiHinhSuggestOpen(true)}
                onBlur={() => setTimeout(() => setLoaiHinhSuggestOpen(false), 150)}
              />
              {loaiHinhSuggestOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border bg-card shadow-soft max-h-48 overflow-y-auto">
                  {(() => {
                    const q = normalizeVi(formLoaiHinh.trim());
                    const seedLabels = LOAI_HINH_SEED.map((s) => s.label);
                    const dataLabels = loaiHinhCounts.map(([a]) => a).filter((a) => !seedLabels.includes(a));
                    const all = [...seedLabels, ...dataLabels];
                    return all
                      .filter((a) => !q || normalizeVi(a).includes(q))
                      .slice(0, 8)
                      .map((a) => (
                        <button
                          key={a}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setFormLoaiHinh(a);
                            setLoaiHinhSuggestOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent/60"
                        >
                          {a}
                        </button>
                      ));
                  })()}
                </div>
              )}
            </div>
          )}
          {formType === "trao_doi" &&
            formTradeType !== "interaction" &&
            classifyLoaiHinh(formLoaiHinh) === "real_estate" && (
              <Input
                placeholder={
                  formTradeDirection === "sell" || formTradeDirection === "rent_offer"
                    ? t("quet.field.dienTich")
                    : t("quet.field.dienTichWanted")
                }
                value={formDienTich}
                onChange={(e) => setFormDienTich(e.target.value)}
              />
            )}
          {formType === "trao_doi" &&
            formTradeType !== "interaction" &&
            classifyLoaiHinh(formLoaiHinh) === "real_estate" && (
              <div className="space-y-2 rounded-xl border p-3">
                <div className="grid grid-cols-3 gap-2">
                  <Select value={formPhongNgu} onValueChange={setFormPhongNgu}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("quet.field.phongNgu")} />
                    </SelectTrigger>
                    <SelectContent>
                      {["1", "2", "3", "4", "5+"].map((n) => (
                        <SelectItem key={n} value={n}>
                          {t("quet.chip.phongNgu", { n })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={formPhongTam} onValueChange={setFormPhongTam}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("quet.field.phongTam")} />
                    </SelectTrigger>
                    <SelectContent>
                      {["1", "2", "3", "4+"].map((n) => (
                        <SelectItem key={n} value={n}>
                          {t("quet.chip.phongTam", { n })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={formChoDauXe} onValueChange={setFormChoDauXe}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("quet.field.choDauXe")} />
                    </SelectTrigger>
                    <SelectContent>
                      {["none", "xeMay", "oto"].map((k) => (
                        <SelectItem key={k} value={k}>
                          {t(`quet.choDauXe.${k}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs font-semibold text-muted-foreground">{t("quet.field.ganDau")}</div>
                <ChipToggleGroup
                  options={GAN_DAU}
                  value={formGanDau}
                  onChange={setFormGanDau}
                  labelFor={(k) => t(`quet.ganDau.${k}`)}
                />
              </div>
            )}
          {formType === "trao_doi" && formTradeType !== "interaction" && (
            <Input
              placeholder={
                formTradeDirection === "sell" || formTradeDirection === "rent_offer"
                  ? t("quet.field.gia")
                  : t("quet.field.nganSach")
              }
              value={formGiaText}
              onChange={(e) => setFormGiaText(e.target.value)}
            />
          )}
          {formType === "trao_doi" &&
            formTradeType !== "interaction" &&
            (formTradeDirection === "sell" || formTradeDirection === "rent_offer") && (
              <Select value={formTinhTrang} onValueChange={setFormTinhTrang}>
                <SelectTrigger>
                  <SelectValue placeholder={t("quet.field.tinhTrang")} />
                </SelectTrigger>
                <SelectContent>
                  {classifyLoaiHinh(formLoaiHinh) === "real_estate" ? (
                    <>
                      <SelectItem value="trong">{t("quet.tinhTrang.trong")}</SelectItem>
                      <SelectItem value="coNguoiO">{t("quet.tinhTrang.coNguoiO")}</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="moi">{t("quet.tinhTrang.moi")}</SelectItem>
                      <SelectItem value="daSuDung">{t("quet.tinhTrang.daSuDung")}</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            )}

          <div className="relative">
            <Input
              placeholder={t("quet.needArea")}
              value={formArea}
              onChange={(e) => {
                setFormArea(e.target.value);
                setAreaSuggestOpen(true);
              }}
              onFocus={() => setAreaSuggestOpen(true)}
              onBlur={() => setTimeout(() => setAreaSuggestOpen(false), 150)}
            />
            {areaSuggestOpen && areaCounts.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border bg-card shadow-soft max-h-48 overflow-y-auto">
                {areaCounts
                  .filter(([a]) => !formArea.trim() || normalizeVi(a).includes(normalizeVi(formArea.trim())))
                  .slice(0, 8)
                  .map(([a, n]) => (
                    <button
                      key={a}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setFormArea(a);
                        setAreaSuggestOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent/60 flex items-center justify-between gap-2"
                    >
                      <span>{a}</span>
                      <span className="text-[10px] text-muted-foreground">{n}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!navigator.geolocation) {
                toast.error(t("explore.locationUnsupported"));
                return;
              }
              setLocatingForm(true);
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setFormLat(pos.coords.latitude);
                  setFormLng(pos.coords.longitude);
                  setLocatingForm(false);
                },
                () => {
                  setLocatingForm(false);
                  toast.error(t("common.error"));
                },
                { enableHighAccuracy: true, timeout: 10000 },
              );
            }}
            className={cn(
              "text-xs font-semibold flex items-center gap-1.5",
              formLat != null ? "text-primary" : "text-muted-foreground",
            )}
          >
            📍{" "}
            {locatingForm
              ? t("sort.requestingLocation")
              : formLat != null
                ? t("quet.field.locationOn")
                : t("quet.field.shareLocation")}
          </button>

          <div>
            <div className="text-xs font-semibold mb-1.5 text-muted-foreground">{t("quet.addPhotoMulti")}</div>
            <div className="grid grid-cols-4 gap-2">
              {existingPhotos.map((path, i) => (
                <div key={`e-${i}`} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                  <CardPhoto path={path} />
                  <button
                    type="button"
                    onClick={() => setExistingPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white grid place-items-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {newPhotoPreviews.map((url, i) => (
                <div key={`n-${i}`} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setNewPhotoFiles((prev) => prev.filter((_, idx) => idx !== i));
                      setNewPhotoPreviews((prev) => prev.filter((_, idx) => idx !== i));
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white grid place-items-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {existingPhotos.length + newPhotoFiles.length < 4 && (
                <label className="aspect-square rounded-xl border border-dashed cursor-pointer flex items-center justify-center text-muted-foreground hover:bg-accent/40">
                  <Camera className="w-5 h-5" />
                  <input
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const err = validateImage(f);
                      if (err) {
                        toast.error(err);
                        return;
                      }
                      setNewPhotoFiles((prev) => [...prev, f]);
                      setNewPhotoPreviews((prev) => [...prev, URL.createObjectURL(f)]);
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <button
            onClick={saveNeed}
            disabled={saving || !canSave}
            className="w-full py-2.5 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            {t("common.save")}
          </button>

          {editingNeed && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={togglePauseEditing}
                className="flex-1 py-2 rounded-xl border text-xs font-semibold text-muted-foreground"
              >
                {editingNeed.is_active ? t("quet.pauseNeed") : t("quet.resumeNeed")}
              </button>
              {confirmingDelete ? (
                <button
                  onClick={deleteEditing}
                  className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold"
                >
                  {t("quet.deleteNeedConfirm")}
                </button>
              ) : (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="flex-1 py-2 rounded-xl border border-destructive/40 text-destructive text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {t("quet.deleteNeed")}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "swipe" && activeCategory && (
        <div ref={cardWrapRef} className="relative" style={{ height: cardH ?? 460 }}>
          {swipeQuota && !swipeQuota.unlimited && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-2.5 py-1 rounded-full bg-black/55 text-white text-[11px] font-semibold whitespace-nowrap">
              {t("quet.quotaLeft", {
                n: String(Math.max(0, swipeQuota.limit - swipeQuota.used)),
                limit: String(swipeQuota.limit),
              })}
            </div>
          )}
          {loading ? (
            <div className="absolute inset-0 rounded-2xl bg-muted animate-pulse" />
          ) : !topCard ? (
            <div className="absolute inset-0 rounded-2xl border border-dashed grid place-items-center text-center px-6 text-sm text-muted-foreground">
              <div>
                <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
                {t("quet.noMoreCards")}
              </div>
            </div>
          ) : (
            <>
              {nextCard && (
                <div
                  key={nextCard.id}
                  className="absolute inset-0 rounded-2xl overflow-hidden bg-card border shadow-soft scale-[0.95] translate-y-2 opacity-70"
                >
                  <CardPhoto path={nextCard.photo_url} />
                </div>
              )}
              <div
                key={topCard.id}
                ref={cardRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{ ...cardStyle, touchAction: "none", willChange: "transform", backfaceVisibility: "hidden" }}
                className="absolute inset-0 rounded-2xl overflow-hidden bg-card border shadow-soft cursor-grab active:cursor-grabbing select-none"
              >
                <CardPhoto path={topPhotoList[photoIndex] ?? topCard.photo_url} />
                {topPhotoList.length > 1 && (
                  <div className="absolute top-2.5 inset-x-2.5 flex items-center gap-1 pointer-events-none z-10">
                    {topPhotoList.map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i === photoIndex ? "bg-white" : "bg-white/40",
                        )}
                      />
                    ))}
                  </div>
                )}
                {(topPhotoList.length > 0 || topCard.photo_url) && (
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
                )}
                <Popover open={cardMenuOpen} onOpenChange={setCardMenuOpen}>
                  <PopoverTrigger asChild>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={t("block.menu")}
                      className="absolute top-24 right-3 z-10 w-8 h-8 rounded-full bg-black/30 backdrop-blur grid place-items-center text-white"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-44 p-1" onPointerDown={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setMenuTargetOwnerId(topOwner?.id ?? null);
                        setCardMenuOpen(false);
                        setReportOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-muted text-left"
                    >
                      <Flag className="w-4 h-4" /> {t("biz.report")}
                    </button>
                    <button
                      onClick={() => {
                        setMenuTargetOwnerId(topOwner?.id ?? null);
                        setCardMenuOpen(false);
                        setConfirmBlockOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-muted text-left text-destructive"
                    >
                      <Ban className="w-4 h-4" /> {t("block.block")}
                    </button>
                  </PopoverContent>
                </Popover>
                <div
                  ref={likeRef}
                  className={cn(
                    "absolute top-6 left-6 px-3 py-1.5 rounded-lg border-4 font-extrabold text-lg -rotate-12",
                    "border-primary text-primary",
                  )}
                  style={{ opacity: 0, willChange: "opacity" }}
                >
                  {t("quet.like").toUpperCase()}
                </div>
                <div
                  ref={passRef}
                  className={cn(
                    "absolute top-6 right-6 px-3 py-1.5 rounded-lg border-4 font-extrabold text-lg rotate-12",
                    "border-muted-foreground text-muted-foreground",
                  )}
                  style={{ opacity: 0, willChange: "opacity" }}
                >
                  {t("quet.pass").toUpperCase()}
                </div>

                <div
                  className={cn(
                    "absolute inset-0 p-5 pb-20 flex flex-col justify-end pointer-events-none",
                    (topPhotoList.length > 0 || topCard.photo_url) && "text-white",
                  )}
                >
                  <div className="flex items-center gap-2 mb-2 pointer-events-auto">
                    <div className="relative shrink-0">
                      <Avatar path={topOwner?.avatar_url} name={topOwner?.full_name || topOwner?.username} size={44} />
                      {topOwnerOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-black/50" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-lg leading-tight flex items-baseline gap-1.5 min-w-0">
                        <span className="truncate">{topOwner?.full_name || topOwner?.username || "—"}</span>
                        {topFrontAge && (
                          <span className="text-sm font-semibold opacity-90 shrink-0">, {topFrontAge}</span>
                        )}
                      </div>
                      {topOwnerOnline && (
                        <div className="text-[11px] font-semibold text-emerald-300">{t("quet.online")}</div>
                      )}
                    </div>
                  </div>
                  {topCard.description && (
                    <div className="pointer-events-auto">
                      <div
                        className={cn(
                          "text-sm",
                          !descExpanded && "line-clamp-2",
                          topPhotoList.length > 0 || topCard.photo_url ? "text-white/90" : "text-muted-foreground",
                        )}
                      >
                        {topCard.description}
                      </div>
                      {topCard.description.length > 90 && (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDescExpanded((v) => !v);
                          }}
                          className={cn(
                            "self-start text-xs font-semibold mt-0.5 underline underline-offset-2",
                            topPhotoList.length > 0 || topCard.photo_url ? "text-white" : "text-primary",
                          )}
                        >
                          {descExpanded ? t("quet.collapse") : t("quet.seeMore")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute bottom-3 inset-x-0 z-20 flex items-center justify-center gap-3.5">
                <button
                  onClick={() => lastAction && void undoLastAction()}
                  disabled={!lastAction}
                  aria-label={t("quet.undo")}
                  className={cn(
                    "w-12 h-12 rounded-full border-2 backdrop-blur-sm grid place-items-center transition active:scale-95",
                    lastAction
                      ? "bg-black/30 border-amber-400 text-amber-400"
                      : "bg-black/20 border-white/15 text-white/30 cursor-not-allowed",
                  )}
                >
                  <Undo2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => triggerSwipe("left")}
                  aria-label={t("quet.pass")}
                  className="w-12 h-12 rounded-full border-2 border-white/40 bg-black/30 backdrop-blur-sm grid place-items-center text-white active:scale-95 transition"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={() => triggerSwipe("right")}
                  aria-label={t("quet.like")}
                  className="w-12 h-12 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center shadow-brand active:scale-95 transition"
                >
                  <Heart className="w-5 h-5" />
                </button>
                <button
                  onClick={() => openDetail(topCard, topOwner, topDistanceKm)}
                  aria-label={t("quet.detail")}
                  className="w-12 h-12 rounded-full border-2 border-white/40 bg-black/30 backdrop-blur-sm grid place-items-center text-white active:scale-95 transition"
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </>
          )}

          <div className="absolute top-14 inset-x-3 z-30 flex items-center gap-2">
            <button
              onClick={backToRoot}
              aria-label={t("quet.backToCategories")}
              className="w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm grid place-items-center text-white shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={backToRoot}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-black/35 backdrop-blur-sm rounded-full px-2.5 py-1.5 shrink-0"
            >
              <CategoryIcon type={activeCategory} className="w-3.5 h-3.5" />
              {t(`quet.type.${activeCategory}`)}
            </button>
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "ml-auto w-8 h-8 rounded-full backdrop-blur-sm grid place-items-center relative shrink-0",
                    filterActive ? "bg-primary text-primary-foreground" : "bg-black/35 text-white",
                  )}
                  aria-label={t("quet.filter")}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {filterActive && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3 space-y-2.5">
                <div className="text-xs font-bold">{t("quet.filter")}</div>
                {myPos && (
                  <div>
                    <div className="text-[11px] font-semibold mb-1 text-muted-foreground">{t("quet.radiusLabel")}</div>
                    <Select
                      value={radiusKm == null ? "all" : String(radiusKm)}
                      onValueChange={(v) => setRadiusKm(v === "all" ? null : Number(v))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("quet.radiusAll")}</SelectItem>
                        {[5, 10, 20, 50, 100].map((km) => (
                          <SelectItem key={km} value={String(km)}>
                            {t("quet.radiusKm", { km })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(activeCategory === "lam_quen" || activeCategory === "tim_viec") && (
                  <div>
                    <div className="text-[11px] font-semibold mb-1 text-muted-foreground">
                      {t("quet.filterAgeRange")}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={t("quet.filterAgeFrom")}
                        value={filterAgeMin}
                        onChange={(e) => setFilterAgeMin(e.target.value.replace(/[^0-9]/g, ""))}
                        className="h-8 text-xs"
                        inputMode="numeric"
                      />
                      <Input
                        placeholder={t("quet.filterAgeTo")}
                        value={filterAgeMax}
                        onChange={(e) => setFilterAgeMax(e.target.value.replace(/[^0-9]/g, ""))}
                        className="h-8 text-xs"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                )}
                {activeCategory === "tim_viec" && (
                  <div>
                    <div className="text-[11px] font-semibold mb-1 text-muted-foreground">
                      {t("quet.field.nganhNghe")}
                    </div>
                    <Select value={filterNganhNghe} onValueChange={setFilterNganhNghe}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("quet.filterAll")}</SelectItem>
                        {[
                          "fnb",
                          "banHang",
                          "giaoHang",
                          "cskh",
                          "lamDep",
                          "xayDung",
                          "vanPhong",
                          "congNghe",
                          "giaoDuc",
                          "khac",
                        ].map((k) => (
                          <SelectItem key={k} value={k}>
                            {t(`quet.nganhNghe.${k}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {activeCategory === "trao_doi" && (
                  <div>
                    <div className="text-[11px] font-semibold mb-1 text-muted-foreground">
                      {t("quet.filterTradeType")}
                    </div>
                    <Select value={filterTradeType} onValueChange={setFilterTradeType}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("quet.filterAll")}</SelectItem>
                        <SelectItem value="interaction">{t("quet.tradeType.interaction")}</SelectItem>
                        <SelectItem value="buy_sell">{t("quet.tradeType.buySell")}</SelectItem>
                        <SelectItem value="rent">{t("quet.tradeType.rent")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {activeCategory === "game" && (
                  <div>
                    <div className="text-[11px] font-semibold mb-1 text-muted-foreground">{t("quet.filterMode")}</div>
                    <Select value={filterMode} onValueChange={setFilterMode}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("quet.filterAll")}</SelectItem>
                        <SelectItem value="playmate">{t("quet.modePlaymate")}</SelectItem>
                        <SelectItem value="trade">{t("quet.modeTrade")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {filterActive && (
                  <button
                    onClick={() => {
                      setFilterAgeMin("");
                      setFilterAgeMax("");
                      setFilterNganhNghe("all");
                      setFilterTradeType("all");
                      setFilterMode("all");
                      setRadiusKm(null);
                    }}
                    className="w-full text-xs font-semibold text-destructive pt-1"
                  >
                    {t("quet.filterClear")}
                  </button>
                )}
                <button
                  onClick={() => setFilterOpen(false)}
                  className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold mt-1"
                >
                  {t("quet.filterConfirm")}
                </button>
              </PopoverContent>
            </Popover>
            {!myPos && (
              <button
                onClick={() => {
                  if (!navigator.geolocation) {
                    setLocStatus("unsupported");
                    return;
                  }
                  setLocStatus("requesting");
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      setLocStatus("granted");
                    },
                    (err) => setLocStatus(err.code === 1 ? "denied" : "idle"),
                    { enableHighAccuracy: true, timeout: 10000 },
                  );
                }}
                className="text-[11px] font-semibold text-white bg-black/35 backdrop-blur-sm rounded-full px-2.5 py-1.5 shrink-0"
              >
                📍 {locStatus === "requesting" ? t("sort.requestingLocation") : t("nearby.enableCta")}
              </button>
            )}
          </div>
          {locStatus === "denied" && (
            <p className="absolute top-24 left-3 right-14 z-30 text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-950/80 dark:text-amber-300 rounded-lg px-2 py-1 shadow">
              {t("explore.locationDenied")}
            </p>
          )}
        </div>
      )}

      {tab === "matches" && (
        <div className="space-y-2">
          {matchesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <MatchSkeleton key={i} />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">{t("quet.emptyMatches")}</div>
          ) : (
            matches.map((m) => {
              const isOnline = m.otherUser ? onlineUsers.has(m.otherUser.id) : false;
              return (
                <div key={m.id} className="w-full flex items-center gap-3 rounded-xl border bg-card p-3">
                  <button
                    onClick={() => m.otherNeed && openDetail(m.otherNeed, m.otherUser, null)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        path={m.otherUser?.avatar_url}
                        name={m.otherUser?.full_name || m.otherUser?.username}
                        size={44}
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground grid place-items-center ring-2 ring-card">
                        <CategoryIcon type={m.need_type} className="w-3 h-3" />
                      </div>
                      {isOnline && (
                        <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">
                        {m.otherUser?.full_name || m.otherUser?.username || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{m.otherNeed?.title}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => m.otherUser && nav(`/tin-nhan/${m.otherUser.id}`)}
                    aria-label={t("quet.sendMessage")}
                    className="w-9 h-9 rounded-full grid place-items-center text-primary shrink-0"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        aria-label={t("block.menu")}
                        className="w-8 h-8 rounded-full grid place-items-center text-muted-foreground shrink-0"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-40 p-1">
                      <button
                        onClick={() => setUnmatchTarget(m)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-muted text-left text-destructive"
                      >
                        <UserX className="w-4 h-4" /> {t("quet.unmatch")}
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              );
            })
          )}
        </div>
      )}

      {matchInfo && (
        <div
          className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-6 animate-in fade-in duration-200"
          onClick={() => setMatchInfo(null)}
        >
          <style>{`
            @keyframes match-pop {
              0% { transform: scale(0.4); opacity: 0; }
              60% { transform: scale(1.08); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes confetti-pop {
              0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); opacity: 1; }
              100% { transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) rotate(var(--rot)); opacity: 0; }
            }
            .confetti-piece { animation: confetti-pop 900ms ease-out forwards; }
            .match-pop { animation: match-pop 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
          `}</style>
          <div
            className="relative bg-card rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-brand overflow-hidden match-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {showConfetti && <ConfettiBurst />}
            <div className="relative text-4xl match-pop" style={{ animationDelay: "0ms" }}>
              🎉
            </div>
            <div className="relative text-2xl font-extrabold text-primary match-pop" style={{ animationDelay: "90ms" }}>
              {t("quet.matchModalTitle")}
            </div>
            <div
              className="relative flex items-center justify-center -space-x-4 match-pop"
              style={{ animationDelay: "170ms" }}
            >
              <Avatar
                path={profile?.avatar_url}
                name={profile?.full_name || profile?.username}
                size={64}
                ringClassName="ring-4 ring-card"
              />
              <div className="z-10 w-8 h-8 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center ring-4 ring-card">
                <Flame className="w-4 h-4" />
              </div>
              <Avatar
                path={matchInfo.owner?.avatar_url}
                name={matchInfo.owner?.full_name || matchInfo.owner?.username}
                size={64}
                ringClassName="ring-4 ring-card"
              />
            </div>
            <div className="relative text-sm text-muted-foreground match-pop" style={{ animationDelay: "230ms" }}>
              {t("quet.matchModalBody", { name: matchInfo.owner?.full_name || matchInfo.owner?.username || "—" })}
            </div>
            <div className="relative space-y-2 pt-1 match-pop" style={{ animationDelay: "300ms" }}>
              <button
                onClick={() => {
                  const id = matchInfo.owner?.id;
                  setMatchInfo(null);
                  if (id) nav(`/tin-nhan/${id}`);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-semibold"
              >
                {t("quet.sendMessage")}
              </button>
              <button
                onClick={() => setMatchInfo(null)}
                className="w-full py-2.5 rounded-xl border text-sm font-semibold text-muted-foreground"
              >
                {t("quet.keepSwiping")}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailFor && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-in fade-in duration-200">
          <div className="min-h-full flex flex-col">
            <div className="relative w-full flex-1 min-h-[40vh] bg-muted">
              <CardPhoto path={detailPhotos[detailPhotoIndex] ?? detailPhotos[0]} />
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-black/55 to-transparent" />
              <button
                onClick={() => setDetailFor(null)}
                aria-label={t("common.cancel")}
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/35 backdrop-blur-sm grid place-items-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative -mt-24 px-5 pb-8 space-y-3 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <Avatar
                    path={detailFor.owner?.avatar_url}
                    name={detailFor.owner?.full_name || detailFor.owner?.username}
                    size={40}
                  />
                  {detailFor.owner && onlineUsers.has(detailFor.owner.id) && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black/40" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">
                    {detailFor.owner?.full_name || detailFor.owner?.username || "—"}
                  </div>
                  <div className="text-[11px] text-white/80 flex items-center gap-1">
                    <CategoryIcon type={detailFor.need.need_type} className="w-3 h-3" />
                    {t(`quet.type.${detailFor.need.need_type}`)}
                  </div>
                </div>
              </div>
              <div className="font-extrabold text-lg leading-tight">{detailFor.need.title}</div>
              {(detailFor.need.area || detailFor.distanceKm != null) && (
                <div className="text-xs text-white/80">
                  📍{" "}
                  {[detailFor.need.area, detailFor.distanceKm != null ? `${detailFor.distanceKm.toFixed(1)} km` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              )}
              {detailPhotos.length > 1 && (
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {detailPhotos.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setDetailPhotoIndex(i)}
                      aria-label={t("quet.viewPhoto")}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden bg-muted",
                        i === detailPhotoIndex && "ring-2 ring-white",
                      )}
                    >
                      <CardPhoto path={p} />
                    </button>
                  ))}
                </div>
              )}
              {detailFor.need.description && (
                <div className="text-sm whitespace-pre-wrap text-white/90">{detailFor.need.description}</div>
              )}
              {detailChips.length > 0 && (
                <div className="text-xs font-semibold text-primary">{detailChips.join("  ·  ")}</div>
              )}
              {detailExtraLines.map((line, i) => (
                <div key={i} className="text-xs text-white/70">
                  <span className="font-semibold text-white/90">{line.label}: </span>
                  {line.value}
                </div>
              ))}
              {detailFor.owner && (
                <button
                  onClick={() => nav(`/tin-nhan/${detailFor.owner!.id}`)}
                  className="w-full py-2.5 mt-1 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-semibold"
                >
                  {t("quet.sendMessage")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={confirmBlockOpen} onOpenChange={setConfirmBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("block.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("block.confirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void blockOwner()}>{t("block.block")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!unmatchTarget} onOpenChange={(open) => !open && setUnmatchTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("quet.unmatchConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("quet.unmatchConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void unmatch()}>{t("quet.unmatch")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("quet.deleteNeedConfirm")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTargetId && void deleteFromManageList(deleteTargetId)}>
              {t("quet.deleteNeed")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={swipeLimitOpen} onOpenChange={setSwipeLimitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("quet.limitTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("quet.limitDesc", { limit: String(swipeQuota?.limit ?? 10) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.close")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => nav("/ho-so?view=personal")}>
              {t("offers.viewMembership")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {menuTargetOwnerId && (
        <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="user" targetId={menuTargetOwnerId} />
      )}
    </div>
  );
}
