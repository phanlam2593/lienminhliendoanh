import { it } from "vitest";
import { heartThemeOf, heartStart } from "@/lib/lomiHeart";
import { frameTurn } from "@/lib/lomiFrame";
import { parseVi } from "@/lib/lomiParse";
it("x", () => {
  for (const s of ["a đang lo chuyện công việc", "a đang áp lực công việc", "công ty có thể cắt giảm nhân sự", "công ty a sắp phá sản", "a lo bị mất việc", "a là trụ cột gia đình", "may mà gia đình vẫn ủng hộ a", "a lo tiền sinh hoạt cho vợ con"]) {
    const fr = parseVi(s, {});
    const fx = frameTurn(s, fr, { mode: "full", addr: "anh" } as any);
    console.log("R", s, "| theme:", heartThemeOf(s), "| start:", heartStart(s, false)?.theme, "| frame:", fx?.intent, fx?.openHeart);
  }
});
