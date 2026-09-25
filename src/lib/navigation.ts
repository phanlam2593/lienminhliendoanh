import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// ĐIỀU HƯỚNG "QUAY LẠI" THỐNG NHẤT (25/09)
//
// 1) canGoBack()/useGoBack(): nút ← trong app PHẢI quay về đúng trang trước (nav(-1)),
//    không được nav("/tin-nhan") cứng — điều đó ĐẨY thêm 1 trang mới vào lịch sử, làm nút
//    Back của Android đi lòng vòng. Chỉ khi KHÔNG có trang trước trong app (mở thẳng từ
//    thông báo đẩy / link ngoài) mới thay bằng trang dự phòng (replace, không đẩy thêm).
//    iPhone (PWA "Thêm vào MH chính") KHÔNG có nút Back hệ thống → nút ← trong app là
//    đường quay lại duy nhất, nên mọi trang con đều phải có.
//
// 2) useBackToClose(open, onClose): hộp thoại / ảnh phóng to / màn phủ toàn màn hình đang
//    mở thì nút Back (Android) hoặc vuốt lùi chỉ ĐÓNG nó, không rời trang. Cách làm: mở →
//    pushState 1 mục lịch sử "ảo" (cùng URL); Back → popstate → đóng. Đóng bằng tay (nút X,
//    bấm nền) → tự history.back() để gỡ mục ảo đó.
// ─────────────────────────────────────────────────────────────────────────────

/** Có trang trước TRONG app không (react-router lưu số thứ tự `idx` trong history.state). */
export function canGoBack(): boolean {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === "number" && idx > 0;
}

/** goBack(fallback): về trang trước nếu có, không thì thay bằng `fallback`. */
export function useGoBack() {
  const nav = useNavigate();
  return useCallback(
    (fallback = "/") => {
      if (canGoBack()) nav(-1);
      else nav(fallback, { replace: true });
    },
    [nav],
  );
}

type OverlayState = { __overlay?: string } & Record<string, unknown>;

const overlayStack: string[] = [];
let pendingBack: { id: string; timer: number } | null = null;
let guardInstalled = false;

const topOverlayId = () => (window.history.state as OverlayState | null)?.__overlay;

// Mục "ảo" mồ côi (vd: bấm 1 link BÊN TRONG hộp thoại → trang mới đẩy lên TRÊN mục ảo, hộp
// thoại đóng mà không gỡ được nó). Khi Back về trúng mục mồ côi đó (cùng URL với trang bên
// dưới) → tự lùi thêm 1 bước, để người dùng không phải bấm Back 2 lần mới rời trang.
function installGuard() {
  if (guardInstalled || typeof window === "undefined") return;
  guardInstalled = true;
  window.addEventListener("popstate", () => {
    const id = topOverlayId();
    if (id && !overlayStack.includes(id)) window.history.back();
  });
}

export function useBackToClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    installGuard();
    const id = Math.random().toString(36).slice(2);
    const base = (window.history.state as OverlayState | null) ?? {};

    // Hộp thoại A vừa đóng và B mở ngay trong cùng 1 lượt → tái dùng mục ảo của A (đổi id)
    // thay vì back() rồi push() chồng chéo (sẽ làm B tự đóng).
    if (pendingBack && topOverlayId() === pendingBack.id) {
      window.clearTimeout(pendingBack.timer);
      pendingBack = null;
      window.history.replaceState({ ...base, __overlay: id }, "");
    } else {
      window.history.pushState({ ...base, __overlay: id }, "");
    }
    overlayStack.push(id);

    let closedByBack = false;
    const onPop = () => {
      if (overlayStack[overlayStack.length - 1] !== id) return; // chỉ lớp trên cùng phản ứng
      if (topOverlayId() === id) return; // vẫn đang đứng ở mục của mình (vd: forward)
      closedByBack = true;
      overlayStack.pop();
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      if (closedByBack) return;
      const i = overlayStack.lastIndexOf(id);
      if (i >= 0) overlayStack.splice(i, 1);
      // Đóng bằng tay: gỡ mục ảo (hoãn 1 nhịp để hộp thoại mở ngay sau có thể tái dùng nó).
      if (topOverlayId() === id) {
        const timer = window.setTimeout(() => {
          pendingBack = null;
          if (topOverlayId() === id) window.history.back();
        }, 0);
        pendingBack = { id, timer };
      }
    };
  }, [open]);
}

/**
 * Dùng cho các hộp thoại gốc (Dialog/AlertDialog/Drawer trong components/ui): hỗ trợ cả kiểu
 * "controlled" (open+onOpenChange) lẫn tự quản (DialogTrigger), và gắn useBackToClose.
 */
export function useBackClosableOpen(
  openProp: boolean | undefined,
  defaultOpen: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
): [boolean, (open: boolean) => void] {
  const [inner, setInner] = useState(defaultOpen ?? false);
  const controlled = openProp !== undefined;
  const open = controlled ? !!openProp : inner;
  const changeRef = useRef(onOpenChange);
  changeRef.current = onOpenChange;
  const handle = useCallback(
    (o: boolean) => {
      if (!controlled) setInner(o);
      changeRef.current?.(o);
    },
    [controlled],
  );
  useBackToClose(open, () => handle(false));
  return [open, handle];
}
