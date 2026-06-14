export function isOpenNow(open?: string | null, close?: string | null, now = new Date()): boolean | null {
  if (!open || !close) return null;
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const o = oh * 60 + om;
  const c = ch * 60 + cm;
  if (c > o) return cur >= o && cur < c;
  // overnight (e.g. 22:00 - 02:00)
  return cur >= o || cur < c;
}

export function fmtTime(t?: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

export function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}
