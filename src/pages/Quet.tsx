import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
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

type ViewTab = "category" | "swipe" | "matches";
const VALID_TABS: ViewTab[] = ["category", "swipe", "matches"];

// 4 mục cố định của Quẹt (round 29.1: chia lại thành 3 trang — chọn mục / quẹt / kết nối;
// round 29.2: field theo từng mục chi tiết hơn + lọc giới tính kiểu Tinder cho Làm quen).
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

function CategoryIcon({ type, className }: { type: NeedType; className?: string }) {
  const Icon = CATEGORY_ICON[type];
  return <Icon className={className} />;
}

// Ghép các thông tin phụ (lương, tuổi, giới tính, tên game, hình thức trao đổi...) theo
// từng loại nhu cầu (và theo role tìm-việc/tuyển-người) thành 1 dòng nhãn ngắn trên thẻ quẹt.
function needDetailChips(need: SwipeNeed, t: (key: string, vars?: Record<string, string>) => string): string[] {
  const d = (need.details as Record<string, string>) ?? {};
  const chips: string[] = [];
  if (need.need_type === "tim_viec") {
    const isHirer = d.role === "hirer";
    chips.push(isHirer ? t("quet.roleHirer") : t("quet.roleSeeker"));
    if (d.salary) chips.push(`💰 ${d.salary}`);
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
    chips.push(d.tradeType === "buy_sell" ? t("quet.tradeType.buySell") : t("quet.tradeType.interaction"));
  }
  if (need.need_type === "game") {
    if (d.gameName) chips.push(d.gameName);
    chips.push(d.mode === "trade" ? t("quet.modeTrade") : t("quet.modePlaymate"));
  }
  return chips;
}

// Các field dạng văn bản dài (yêu cầu, kinh nghiệm, đối tượng mong muốn...) hiển thị riêng
// từng dòng bên dưới phần mô tả, thay vì gộp chung vào hàng chip ngắn ở trên.
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
  return lines;
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

const SWIPE_THRESHOLD = 100;

export default function Quet() {
  const { user, profile, isApproved } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTabParam = searchParams.get("tab");
  const initialTab: ViewTab = VALID_TABS.includes(initialTabParam as ViewTab)
    ? (initialTabParam as ViewTab)
    : "category";

  const [tab, setTab] = useState<ViewTab>(initialTab);
  const [activeCategory, setActiveCategory] = useState<NeedType | null>(null);
  const [categoryStep, setCategoryStep] = useState<"grid" | "form">("grid");
  const [editingNeed, setEditingNeed] = useState<SwipeNeed | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<SwipeNeed[]>([]);
  const [owners, setOwners] = useState<Record<string, OwnerInfo>>({});

  const [myNeeds, setMyNeeds] = useState<SwipeNeed[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);

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
  const [formTradeType, setFormTradeType] = useState<"interaction" | "buy_sell">("interaction");
  const [formPhotoFile, setFormPhotoFile] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState("");
  const [formLat, setFormLat] = useState<number | null>(null);
  const [formLng, setFormLng] = useState<number | null>(null);
  const [locatingForm, setLocatingForm] = useState(false);

  // Gợi ý khu vực (giống bên Khám phá) + vị trí để tính khoảng cách khi quẹt.
  const [areaCounts, setAreaCounts] = useState<[string, number][]>([]);
  const [areaSuggestOpen, setAreaSuggestOpen] = useState(false);
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "requesting" | "granted" | "denied" | "unsupported">("idle");

  // Kéo-thả kiểu Tinder cho thẻ trên cùng.
  const [drag, setDrag] = useState({ x: 0, y: 0, dragging: false });
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const [frontEntering, setFrontEntering] = useState(false);
  const enteredIdRef = useRef<string | null>(null);

  const [matchInfo, setMatchInfo] = useState<{ owner: OwnerInfo | null; needTitle: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const myId = user?.id;

  const needByType = (type: NeedType) => myNeeds.find((n) => n.need_type === type);

  useEffect(() => {
    void supabase.rpc("business_area_counts").then(({ data }) => {
      setAreaCounts(((data ?? []) as any[]).map((r) => [r.area as string, Number(r.cnt)]));
    });
  }, []);

  const loadCandidates = async () => {
    if (!myId || !activeCategory) return;
    setLoading(true);
    const { data: swiped } = await db.from("swipe_actions").select("need_id").eq("actor_id", myId);
    const swipedIds: string[] = (swiped ?? []).map((s: any) => s.need_id);

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
    const filtered: SwipeNeed[] = (data ?? []).filter((n: SwipeNeed) => !swipedIds.includes(n.id));
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
      return;
    }
    const needIds = Array.from(new Set(rows.flatMap((r: any) => [r.need_id_a, r.need_id_b])));
    const otherIds = Array.from(new Set(rows.map((r: any) => (r.user_a === myId ? r.user_b : r.user_a))));
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
        const myNeedId = r.user_a === myId ? r.need_id_a : r.need_id_b;
        const otherNeedId = r.user_a === myId ? r.need_id_b : r.need_id_a;
        return {
          ...r,
          otherUser: profMap[otherUserId] ?? null,
          myNeed: needMap[myNeedId] ?? null,
          otherNeed: needMap[otherNeedId] ?? null,
        };
      }),
    );
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
    if (!myId) return;
    const likedOwner = owners[need.user_id] ?? null;
    setCandidates((prev) => prev.filter((n) => n.id !== need.id));
    const { error } = await db.from("swipe_actions").insert({ need_id: need.id, actor_id: myId, action });
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    if (action === "like") {
      const { data: newMatch } = await db
        .from("swipe_matches")
        .select("id")
        .or(`need_id_a.eq.${need.id},need_id_b.eq.${need.id}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (newMatch) setMatchInfo({ owner: likedOwner, needTitle: need.title });
    }
  };

  // Kích hoạt quẹt (từ kéo-thả HOẶC bấm nút) — cho thẻ bay ra rồi mới thật sự gọi act(),
  // để animation và cập nhật dữ liệu khớp nhịp với nhau.
  const triggerSwipe = (dir: "left" | "right") => {
    if (!topCard || exiting) return;
    setExiting(dir);
    setTimeout(() => {
      void act(topCard, dir === "right" ? "like" : "pass");
      setExiting(null);
      setDrag({ x: 0, y: 0, dragging: false });
    }, 220);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (exiting) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, dragging: true });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.dragging) return;
    setDrag({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y, dragging: true });
  };
  const onPointerUp = () => {
    if (!drag.dragging) return;
    if (Math.abs(drag.x) > SWIPE_THRESHOLD) {
      triggerSwipe(drag.x > 0 ? "right" : "left");
    } else {
      setDrag({ x: 0, y: 0, dragging: false });
    }
  };

  // Đưa toàn bộ field của form về mặc định (tạo mới) hoặc điền sẵn từ 1 nhu cầu có sẵn (sửa).
  const resetFormFields = (type: NeedType, need?: SwipeNeed | null) => {
    setFormType(type);
    setFormTitle(need?.title ?? "");
    setFormDesc(need?.description ?? "");
    setFormArea(need?.area ?? "");
    setFormLat(need?.latitude ?? null);
    setFormLng(need?.longitude ?? null);
    setFormPhotoFile(null);
    setFormPhotoPreview("");
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
    setFormTradeType(d.tradeType === "buy_sell" ? "buy_sell" : "interaction");
  };

  const handleCategoryClick = (type: NeedType, need: SwipeNeed | undefined) => {
    if (need) {
      setActiveCategory(type);
      setTab("swipe");
      return;
    }
    resetFormFields(type, null);
    setEditingNeed(null);
    setConfirmingDelete(false);
    setCategoryStep("form");
  };

  const openEdit = (need: SwipeNeed) => {
    resetFormFields(need.need_type, need);
    setEditingNeed(need);
    setConfirmingDelete(false);
    setCategoryStep("form");
  };

  // Game/Trao đổi không còn field Tiêu đề riêng — bắt buộc phải có Mô tả/Giới thiệu thay thế.
  const canSave = formType === "game" || formType === "trao_doi" ? !!formDesc.trim() : !!formTitle.trim();

  const saveNeed = async () => {
    if (!myId || !canSave) return;
    setSaving(true);
    let photoPath: string | null = editingNeed?.photo_url ?? null;
    if (formPhotoFile) {
      try {
        photoPath = await uploadImage(formPhotoFile, "quet", myId);
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
      if (formTargetText.trim()) details.target = formTargetText.trim();
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
      photo_url: photoPath,
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
    setCategoryStep("grid");
    setEditingNeed(null);
    setActiveCategory(formType);
    setTab("swipe");
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
    await db.from("swipe_needs").delete().eq("id", editingNeed.id);
    setCategoryStep("grid");
    setEditingNeed(null);
    void loadMyNeeds();
  };

  const topCard = candidates[0];
  const nextCard = candidates[1];
  const topOwner = topCard ? owners[topCard.user_id] : null;
  const topDistanceKm =
    myPos && topCard?.latitude != null && topCard?.longitude != null
      ? haversineKm(myPos.lat, myPos.lng, topCard.latitude, topCard.longitude)
      : null;

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

  const rotate = Math.max(-18, Math.min(18, drag.x / 12));
  const likeOpacity = Math.max(0, Math.min(1, drag.x / SWIPE_THRESHOLD));
  const passOpacity = Math.max(0, Math.min(1, -drag.x / SWIPE_THRESHOLD));

  let cardStyle: React.CSSProperties;
  if (exiting) {
    const flyX = exiting === "right" ? 700 : -700;
    cardStyle = {
      transform: `translate(${flyX}px, ${drag.y}px) rotate(${exiting === "right" ? 24 : -24}deg)`,
      opacity: 0,
      transition: "transform 220ms ease-out, opacity 220ms ease-out",
    };
  } else if (drag.dragging) {
    cardStyle = { transform: `translate(${drag.x}px, ${drag.y * 0.4}px) rotate(${rotate}deg)`, transition: "none" };
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

  if (!isApproved) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
        {t("quet.loginRequired")}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold flex items-center gap-1.5">
          <Flame className="w-5 h-5 text-primary" /> {t("quet.title")}
        </h1>
        <div className="flex items-center gap-1 rounded-full bg-muted p-1 text-xs font-semibold">
          <button
            onClick={() => setTab("category")}
            className={cn(
              "px-3 py-1.5 rounded-full transition",
              tab !== "matches" ? "bg-card shadow-soft text-primary" : "text-muted-foreground",
            )}
          >
            {t("quet.tabSwipe")}
          </button>
          <button
            onClick={() => setTab("matches")}
            className={cn(
              "px-3 py-1.5 rounded-full transition",
              tab === "matches" ? "bg-card shadow-soft text-primary" : "text-muted-foreground",
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
              const need = needByType(type);
              return (
                <div key={type} className="relative">
                  <button
                    onClick={() => handleCategoryClick(type, need)}
                    className="w-full h-full rounded-2xl border bg-card p-4 flex flex-col items-center gap-2 text-center active:scale-95 transition"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-brand text-primary-foreground grid place-items-center">
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="font-bold text-sm">{t(`quet.type.${type}`)}</div>
                    <div className="text-[11px] text-muted-foreground leading-snug">
                      {t(`quet.category.${type}.brief`)}
                    </div>
                    {need && (
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          need.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {need.is_active ? t("quet.category.active") : t("quet.category.paused")}
                      </span>
                    )}
                  </button>
                  {need && (
                    <button
                      onClick={() => openEdit(need)}
                      aria-label={t("quet.category.manage")}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card/90 border grid place-items-center text-muted-foreground"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "category" && categoryStep === "form" && (
        <div className="space-y-3">
          <button
            onClick={() => {
              setCategoryStep("grid");
              setEditingNeed(null);
              setConfirmingDelete(false);
            }}
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
            <Select value={formTradeType} onValueChange={(v) => setFormTradeType(v as "interaction" | "buy_sell")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interaction">{t("quet.tradeType.interaction")}</SelectItem>
                <SelectItem value="buy_sell">{t("quet.tradeType.buySell")}</SelectItem>
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
            placeholder={t(`quet.field.desc.${formType}`)}
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
          {formType === "trao_doi" && (
            <Input
              placeholder={t("quet.field.target")}
              value={formTargetText}
              onChange={(e) => setFormTargetText(e.target.value)}
            />
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

          {editingNeed?.photo_url && !formPhotoPreview && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                <CardPhoto path={editingNeed.photo_url} />
              </div>
              {t("quet.addPhoto")}
            </div>
          )}
          <div>
            {formPhotoPreview ? (
              <div className="relative w-full h-32 rounded-xl overflow-hidden">
                <img src={formPhotoPreview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setFormPhotoFile(null);
                    setFormPhotoPreview("");
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white grid place-items-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-1.5 w-full h-16 rounded-xl border border-dashed cursor-pointer text-xs font-semibold text-muted-foreground hover:bg-accent/40">
                <Camera className="w-4 h-4" /> {t("quet.addPhoto")}
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
                    setFormPhotoFile(f);
                    setFormPhotoPreview(URL.createObjectURL(f));
                  }}
                />
              </label>
            )}
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
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab("category")}
              aria-label={t("quet.backToCategories")}
              className="w-8 h-8 rounded-full border grid place-items-center text-muted-foreground shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <CategoryIcon type={activeCategory} className="w-4 h-4 text-primary" />
              {t(`quet.type.${activeCategory}`)}
            </div>
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
                    () => setLocStatus("denied"),
                    { enableHighAccuracy: true, timeout: 10000 },
                  );
                }}
                className="ml-auto text-[11px] font-semibold text-muted-foreground border rounded-full px-2.5 py-1"
              >
                📍 {locStatus === "requesting" ? t("sort.requestingLocation") : t("nearby.enableCta")}
              </button>
            )}
          </div>
          {locStatus === "denied" && (
            <p className="text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2 py-1">
              {t("explore.locationDenied")}
            </p>
          )}

          {loading ? (
            <div className="h-[460px] rounded-2xl bg-muted animate-pulse" />
          ) : !topCard ? (
            <div className="h-[460px] rounded-2xl border border-dashed grid place-items-center text-center px-6 text-sm text-muted-foreground">
              <div>
                <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
                {t("quet.noMoreCards")}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative h-[460px]">
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
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  style={{ ...cardStyle, touchAction: "none" }}
                  className="absolute inset-0 rounded-2xl overflow-hidden bg-card border shadow-soft cursor-grab active:cursor-grabbing select-none"
                >
                  <CardPhoto path={topCard.photo_url} />
                  {topCard.photo_url && (
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                  )}
                  <div
                    className={cn(
                      "absolute top-6 left-6 px-3 py-1.5 rounded-lg border-4 font-extrabold text-lg -rotate-12",
                      "border-primary text-primary",
                    )}
                    style={{ opacity: likeOpacity }}
                  >
                    {t("quet.like").toUpperCase()}
                  </div>
                  <div
                    className={cn(
                      "absolute top-6 right-6 px-3 py-1.5 rounded-lg border-4 font-extrabold text-lg rotate-12",
                      "border-muted-foreground text-muted-foreground",
                    )}
                    style={{ opacity: passOpacity }}
                  >
                    {t("quet.pass").toUpperCase()}
                  </div>
                  <div
                    className={cn(
                      "absolute inset-0 p-5 flex flex-col pointer-events-none",
                      topCard.photo_url && "justify-end text-white",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar path={topOwner?.avatar_url} name={topOwner?.full_name || topOwner?.username} size={44} />
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">
                          {topOwner?.full_name || topOwner?.username || "—"}
                        </div>
                        <div
                          className={cn("text-[11px]", topCard.photo_url ? "text-white/80" : "text-muted-foreground")}
                        >
                          {t(`quet.type.${topCard.need_type}`)}
                        </div>
                      </div>
                    </div>
                    <div className="font-extrabold text-lg mb-1">{topCard.title}</div>
                    {(topCard.area || topDistanceKm != null) && (
                      <div
                        className={cn("text-xs mb-2", topCard.photo_url ? "text-white/80" : "text-muted-foreground")}
                      >
                        📍{" "}
                        {[topCard.area, topDistanceKm != null ? `${topDistanceKm.toFixed(1)} km` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                    {topCard.description && (
                      <div
                        className={cn(
                          "text-sm flex-1 overflow-y-auto pointer-events-auto",
                          topCard.photo_url ? "text-white/90" : "text-muted-foreground",
                        )}
                      >
                        {topCard.description}
                      </div>
                    )}
                    {needDetailChips(topCard, t).length > 0 && (
                      <div
                        className={cn(
                          "text-[11px] font-semibold mt-2",
                          topCard.photo_url ? "text-white" : "text-primary",
                        )}
                      >
                        {needDetailChips(topCard, t).join("  ·  ")}
                      </div>
                    )}
                    {needExtraLines(topCard, t).map((line, i) => (
                      <div
                        key={i}
                        className={cn("text-xs mt-1", topCard.photo_url ? "text-white/80" : "text-muted-foreground")}
                      >
                        <span className="font-semibold">{line.label}: </span>
                        {line.value}
                      </div>
                    ))}
                    <div
                      className={cn("text-[10px] mt-2", topCard.photo_url ? "text-white/70" : "text-muted-foreground")}
                    >
                      {t("quet.contactHidden")}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => triggerSwipe("left")}
                  aria-label={t("quet.pass")}
                  className="w-14 h-14 rounded-full border-2 border-muted-foreground/30 grid place-items-center text-muted-foreground active:scale-95 transition"
                >
                  <X className="w-6 h-6" />
                </button>
                <button
                  onClick={() => triggerSwipe("right")}
                  aria-label={t("quet.like")}
                  className="w-14 h-14 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center shadow-brand active:scale-95 transition"
                >
                  <Heart className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "matches" && (
        <div className="space-y-2">
          {matches.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">{t("quet.emptyMatches")}</div>
          ) : (
            matches.map((m) => (
              <button
                key={m.id}
                onClick={() => m.otherUser && nav(`/tin-nhan/${m.otherUser.id}`)}
                className="w-full flex items-center gap-3 rounded-xl border bg-card p-3 text-left hover:bg-accent/40"
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
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">
                    {m.otherUser?.full_name || m.otherUser?.username || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{m.otherNeed?.title}</div>
                </div>
                <MessageCircle className="w-4 h-4 text-primary" />
              </button>
            ))
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
    </div>
  );
}
