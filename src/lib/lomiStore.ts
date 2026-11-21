// 21/11 (ChatGPT chấm bộ 50 đoạn, #11–#33): hỏi BẢO QUẢN thì trả lời ĐÚNG THỨ đang nói tới + đúng câu hỏi
//   (để tủ lạnh / qua đêm / ngăn đá / hâm lại / nhà tắm), thay cho một khối "Đồ ăn thừa, cơm để qua đêm" chung chung.
//   Số liệu đồ nấu chín theo FSA (food.gov.uk): làm lạnh trong 1–2 giờ, ăn trong 2 ngày (cơm 1 ngày), hâm 1 lần
//   nóng sôi, rã đông ăn trong 24 giờ. Đồ sống / đồ bôi / dầu hũ: không có nguồn số ngày → không nêu con số.
import { normalizeVi } from "./lomiFaq";
import { VN } from "./viMatch";

type Kind = "cooked" | "drink" | "batter" | "raw" | "jar" | "applied";

// thứ đang nói tới — tìm ở câu hiện tại trước, rồi các lượt trước (mới → cũ)
const ITEMS: [RegExp, string, Kind][] = [
  [VN(/\bbột (bánh xèo|bánh|chiên|pha|sống|còn dư|dư)\b|\bbánh xèo\b/), "bột bánh xèo", "batter"],
  [VN(/\bdầu dừa\b/), "dầu dừa", "jar"],
  [VN(/\b(gel|nhựa) nha đam\b|\bnha đam\b/), "gel nha đam", "applied"],
  [VN(/\bnước súc miệng\b|\bsúc miệng\b/), "nước súc miệng tự pha", "applied"],
  [VN(/\bnước lá (bưởi|chè xanh|trầu)\b|\bgội\b|\bda đầu\b/), "nước lá nấu để gội", "applied"],
  [VN(/\bgừng (đã )?(thái|cắt|xắt|bào|giã)|thái gừng|gừng sẵn|lát gừng\b/), "gừng tươi thái sẵn", "raw"],
  [VN(/\bnước (lá )?rau má\b|\brau má\b/), "nước rau má", "drink"],
  [VN(/\bbò kho\b/), "bò kho", "cooked"],
  [VN(/\bcháo cá\b/), "cháo cá", "cooked"],
  [VN(/\bcháo\b/), "cháo", "cooked"],
  [VN(/\bgà hấp\b/), "gà hấp", "cooked"],
  [VN(/\bgà luộc\b/), "gà luộc", "cooked"],
  [VN(/\bgà (kho|chiên|nướng|rán|xào)\b/), "món gà", "cooked"],
  [VN(/\bchè\b/), "chè", "cooked"],
  [VN(/\bmồng tơi\b/), "canh mồng tơi", "cooked"],
  [VN(/\b(bí đỏ|tôm)\b/), "món tôm bí đỏ", "cooked"],
  [VN(/\b(thịt|cá) kho\b/), "món kho", "cooked"],
  [VN(/\bcanh\b|\bsúp\b|\blẩu\b/), "canh / súp", "cooked"],
  [VN(/\bcơm\b/), "cơm", "cooked"],
];

export const STORE_Q = VN(/\b(để (tủ lạnh|ngăn mát|ngăn đá|tủ đông|tủ mát|qua đêm|qua ngày|được (bao lâu|mấy ngày|lâu không))|(cất|bỏ) (tủ|hộp|chai|lọ)( \S+){0,4} (bao lâu|mấy ngày|được không|được ko|đc ko|đc k)|để (được )?(bao lâu|mấy ngày)|hâm lại|ăn lại được|dùng lại (được|ngày mai)|chia hộp|còn dư|nấu dư|ăn không hết|qua (2|hai) ngày|để (sẵn|ngoài)( \S+){0,3} (bao lâu|được không)|để (trong )?(nhà tắm|phòng tắm)( \S+){0,2} (có sao|được không|được ko|đc ko|đc k)|mấy ngày (thì|là) (nên )?bỏ)\b/);

const FSA = "\n\n_Nguồn: FSA — Cơ quan Tiêu chuẩn Thực phẩm Anh (food.gov.uk), hướng dẫn bảo quản đồ ăn thừa._";

const GENERIC = new Set(["cháo", "canh / súp", "cơm"]);

export type StoreReply = { text: string; health: boolean; stuck?: string };

export function storeReply(raw: string, prevUser: string[]): StoreReply | null {
  const n = ` ${normalizeVi(raw)} `;
  if (!STORE_Q.test(n)) return null;
  const turns = [n, ...prevUser.slice().reverse().map((t) => ` ${normalizeVi(t)} `)];
  const all = turns.join(" ");
  // 2 vòng: thứ cụ thể (bò kho, mồng tơi, dầu dừa…) trước, rồi mới tới từ chung (canh / cháo / cơm)
  let item: [string, Kind] | null = null;
  for (const pool of [ITEMS.filter((x) => !GENERIC.has(x[1])), ITEMS.filter((x) => GENERIC.has(x[1]))]) {
    for (const t of turns) {
      for (const [re, name, kind] of pool) {
        if (re.test(t)) { item = [name, kind]; break; }
      }
      if (item) break;
    }
    if (item) break;
  }
  if (!item) return null;
  const [name, kind] = item;
  // câu hỏi chung một lượt ("cơm để qua đêm ăn được không") → để thẻ đồ ăn thừa đầy đủ trả lời
  if (GENERIC.has(name) && !prevUser.length) return null;
  const freezeQ = VN(/\b(ngăn đá|tủ đông|cấp đông|đông đá)\b/).test(n);
  const reheatQ = VN(/\bhâm\b/).test(n);
  const preg = VN(/\b(mang thai|có bầu|bà bầu|đang bầu|thai)\b/).test(all);
  const kid = VN(/\b(bé|trẻ|con (mình|mk|tôi|em)|cháu|\d+ tuổi)\b/).test(all);

  if (kind === "cooked" || kind === "drink") {
    const L: string[] = [];
    const rice = name === "cơm";
    if (freezeQ) {
      L.push(`**${cap(name)} để ngăn đá được** nha 🧊`);
      L.push("• Để **nguội nhanh** rồi chia **hộp nhỏ, đậy kín** — cho vào tủ trong vòng **1–2 giờ** sau khi nấu");
      L.push("• Ăn thì **rã đông trong ngăn mát**, rồi **ăn trong 24 giờ**, **không cấp đông lại**");
      if (name === "chè") L.push("• Chè có nước cốt dừa / sữa rã đông có thể **hơi tách nước, đậu bở hơn** — khuấy đều hoặc đun lại cho mịn; chỉ ăn trong 1–2 ngày thì để **ngăn mát** là được, ngon hơn");
      else L.push("• Chỉ ăn trong 1–2 ngày thì để **ngăn mát** là đủ");
    } else {
      L.push(`**${cap(name)} nấu dư** thì để tủ lạnh được nha 🍱`);
      L.push(`• Để **nguội bớt rồi cho vào tủ lạnh trong vòng 1–2 giờ** — chia **hộp nhỏ, đậy kín** cho nhanh lạnh; đừng để ngoài cả đêm`);
      L.push(rice ? "• Ngăn mát (0–5°C): **cơm chỉ nên để 1 ngày**" : `• Ngăn mát (0–5°C): **ăn hết trong 2 ngày**${VN(/\b(mấy ngày (thì|là) (nên )?bỏ)\b/).test(n) ? " — quá 2 ngày thì bỏ" : ""}; không kịp thì cấp đông`);
      if (kind === "drink") L.push(reheatQ ? "• Không bắt buộc hâm — uống mát cũng được; muốn uống ấm thì **đun sôi lại một lần**, phần dư sau đó đổ bỏ" : "• Rót ra ly lượng vừa uống, phần còn lại cất lại tủ ngay; muốn uống ấm thì đun sôi lại một lần");
      else L.push("• **Chỉ lấy phần định ăn ra hâm**, hâm **một lần** cho **nóng sôi đều** — không hâm đi hâm lại cả nồi");
    }
    if (name === "cháo cá" || name === "cháo") L.push("• Cháo để lạnh sẽ **đặc lại** — thêm chút nước, khuấy đều khi hâm; vớt riêng xương / da cá nếu còn");
    if (/^(gà|món gà)/.test(name)) L.push("• Gỡ thịt khỏi xương, để hộp kín cho đỡ khô; thịt hơi khô thì hâm cùng chút nước dùng, hoặc xé ra trộn gỏi, nấu cháo");
    if (name === "bò kho") L.push("• Mỡ đông trên mặt khi để lạnh — **hớt bớt lớp mỡ** trước khi hâm thì nước kho đỡ béo hơn");
    if (name === "món tôm bí đỏ") {
      L.push("• Đồ cho bé: **chia sẵn từng phần nhỏ**, mỗi lần lấy đúng một phần ra hâm nóng kỹ rồi để nguội vừa ăn; **phần bé ăn dở thì bỏ**, đừng cất lại");
      if (VN(/\bvỏ\b/).test(all)) L.push("• Đã lỡ xay lẫn **vỏ tôm** thì **lọc qua rây** cho hết vụn cứng trước khi cho bé ăn, tránh hóc");
      L.push("• Bé mới ăn tôm lần đầu: cho ít, để ý **nổi mẩn, sưng môi, nôn**; **khó thở, sưng môi lưỡi → gọi 115 ngay**");
    }
    if (name === "canh mồng tơi") L.push("• Mồng tơi là **rau**, có chất xơ giúp đi cầu dễ hơn — không phải thuốc trị táo bón; táo bón kéo dài hay kèm đau bụng, ra máu thì nên đi khám");
    if (name === "nước rau má" && VN(/\bhuyết áp (thấp|tụt)\b/).test(all)) L.push("• Người **huyết áp thấp** mà định uống **thường xuyên** thì hỏi bác sĩ trước nha — Lomi chưa có nguồn kiểm chứng về rau má với huyết áp");
    if (preg) L.push("• Đang **mang thai** thì càng nên **hâm nóng sôi kỹ** và bỏ ngay đồ có mùi lạ");
    else if (kid && name !== "món tôm bí đỏ") L.push("• Đồ cho trẻ nhỏ: phần bé ăn dở thì bỏ, đừng cất lại");
    L.push("⚠️ Thấy **mùi lạ, chua, nhớt, nổi váng** thì bỏ, đừng tiếc.");
    return { text: L.join("\n") + FSA, health: true };
  }

  if (kind === "batter") {
    return {
      text: "Phần **bột bánh xèo còn dư** để ngăn mát chiên tiếp ngày mai được nha 🥞\n• Cho vào **hộp / tô đậy kín**, cất **ngăn mát ngay** — đừng để ngoài nhiệt độ phòng cả đêm\n• Mai lấy ra **khuấy đều lại** vì bột lắng xuống đáy; bột đặc hơn thì thêm chút nước cho vừa, **nêm và để bột về bớt lạnh** rồi mới đổ chảo cho giòn\n• Bột có **nước cốt dừa / trứng** thì càng nên chiên sớm, đừng để thêm ngày nữa\n⚠️ Bột **chua, sủi bọt, có mùi lạ** thì bỏ, pha mẻ mới.",
      health: false,
    };
  }

  if (kind === "raw") {
    const L = [
      "**Gừng thái sẵn bỏ hộp mang theo** thì dùng **trong ngày** là ổn nha 🫚",
      "• Rửa sạch, **để ráo / lau khô** rồi mới thái, cho vào **hộp sạch có nắp** — gừng ướt dễ nhớt, mốc",
      "• Để chỗ mát, tránh nắng trong xe; dư thì cất tủ lạnh, nhưng lát gừng sẽ **khô, thâm dần** nên dùng sớm",
      "⚠️ Thấy **mốc, nhớt, mùi lạ** thì bỏ.",
    ];
    if (preg) L.push("🤰 Mang thai 3 tháng đầu: gừng có thể giúp đỡ **buồn nôn khi mang thai**, còn với **say tàu xe** thì phần lớn nghiên cứu cho thấy **không giúp mấy** — gừng dạng bổ sung **có thể an toàn** khi mang thai nhưng nguồn vẫn khuyên **hỏi bác sĩ trước**, nhất là khi định dùng thường xuyên nha.\n\n_Nguồn: NCCIH (NIH, Hoa Kỳ) — Ginger, 02/2025._");
    return { text: L.join("\n"), health: true };
  }

  if (kind === "jar") {
    const L = [
      "Hũ **dầu dừa đã mở** để nhà tắm thì **không lý tưởng** nha 🥥 — nhà tắm **ẩm, nóng**, nước dễ lọt vào làm dầu nhanh hỏng, dễ mốc",
      "• **Đậy kín nắp** sau mỗi lần dùng; lấy dầu bằng **thìa / que sạch** hoặc tay **khô**, đừng để nước rơi vào hũ",
      "• Để chỗ **khô, mát, tránh nắng** (vd tủ phòng ngủ); dùng trong hạn ghi trên hũ",
    ];
    if (VN(/\b(mụn|nổi mụn)\b/).test(all)) L.push("• Đang dễ nổi mụn quanh miệng mà bôi thấy **nổi thêm** thì ngưng dùng");
    L.push("⚠️ Dầu **có mùi khét / ôi, đổi màu, có đốm mốc** thì bỏ.");
    return { text: L.join("\n"), health: false, stuck: "unknown_care" };
  }

  // applied — đồ tự làm để bôi / súc / gội
  const L = [
    `**${cap(name)}** không có chất bảo quản nên Lomi khuyên **làm mới, dùng ngay**, đừng để dành qua ngày 🙏 — để lâu dễ nhiễm khuẩn mà nhìn bằng mắt khó biết. Lomi chưa có nguồn kiểm chứng ghi đúng số ngày nên không dám nói con số; thấy **đổi màu, đổi mùi, đục, nổi váng** thì bỏ.`,
  ];
  if (name === "gel nha đam" && kid) L.push(`• Với **trẻ nhỏ**: **đừng bôi lên chỗ da trầy, trầy xước hở** — chỗ bị đốt thì rửa bằng **xà phòng và nước**, chườm mát; sưng đỏ lan rộng, có mủ, sốt hay bé quấy nhiều thì cho bé đi khám`);
  else if (name === "gel nha đam") L.push("• Không bôi lên **vết thương hở**; lần đầu dùng thì **thử ở vùng da nhỏ** trước, thấy ngứa, rát, đỏ thì ngưng");
  if (name === "nước lá nấu để gội") L.push("• Da đầu **nhạy cảm / mới nhuộm**: lần đầu thử ở **vùng da nhỏ** (sau tai) trước, thấy ngứa, rát, đỏ thì ngưng và gội lại bằng nước sạch");
  if (name === "nước súc miệng tự pha") {
    L.push("• Nước súc tự pha **không thay được** việc **đánh răng 2 lần / ngày** và **làm sạch kẽ răng** (chỉ nha khoa / bàn chải kẽ)");
    if (VN(/\b(viêm lợi|viêm nướu|chảy máu (chân răng|lợi|nướu))\b/).test(all)) L.push("• Đang **viêm lợi** thì nên đi **nha sĩ** — nhớ kể nha sĩ biết **thuốc huyết áp** đang uống");
  }
  return { text: L.join("\n"), health: true, stuck: "unknown_care" };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
