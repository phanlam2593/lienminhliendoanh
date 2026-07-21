import { useEffect, useState } from "react";

async function checkReallyOnline(): Promise<boolean> {
  try {
    await fetch(location.origin + "/favicon.ico?_check=" + Date.now(), {
      cache: "no-store",
      mode: "no-cors",
    });
    return true;
  } catch {
    return false;
  }
}

export function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const goOnline = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      setOnline(true);
    };

    // QUAN TRỌNG: sự kiện "offline" của trình duyệt không đáng tin cậy — chỉ báo card
    // mạng có hoạt động hay không, không phải có Internet thật. Nhiều Wi-Fi/thiết bị hay
    // "chớp" mất mạng vài giây dù mạng vẫn dùng bình thường ngay sau đó. Không tin ngay —
    // đợi 3s rồi tự kiểm tra bằng 1 request thật, chỉ báo mất mạng nếu vẫn thật sự lỗi.
    const goOffline = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const reallyOffline = !(await checkReallyOnline());
        if (!cancelled && reallyOffline) setOnline(false);
      }, 3000);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
