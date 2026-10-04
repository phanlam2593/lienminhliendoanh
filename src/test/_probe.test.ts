import { it } from "vitest";
import { expandTeen, crisisReply } from "@/lib/lomiChat";
import { gate } from "@/lib/lomiUnderstand";
import { healthFact } from "@/lib/lomiHealthFacts";
import { analyzeBody, analyzeMind } from "@/lib/lomiSymptoms";
import { heartStart, heartContinue } from "@/lib/lomiHeart";
import { detectTarot } from "@/lib/tarot";
const Q = ["cf?","trà sữa?","uống cf đi không?","quán cf nào ngon?","uống nhiều cà phê có sao không?","đau đầu là do đâu?","mình bị đau đầu","mình bị đau bụng","paracetamol có tác dụng phụ gì?","mình muốn chết","người ấy có còn tình cảm với mình không?","người ấy im lặng, mình nên làm gì?","mình buồn vì chia tay","người ấy nghĩ gì về mình?","bạn trai đánh mình","mình bị trầm cảm không?"];
it("probe", () => {
  for (const raw of Q) {
    const q = expandTeen(raw);
    const g = gate(q, {});
    const cr = crisisReply(q, "vi");
    console.log("\n### "+raw, "| gate:", g?.action, (g as any)?.intent ?? (g as any)?.reply?.intent, "| crisis:", !!cr, "| tarot:", !!detectTarot(q));
    const f = healthFact(q); if (f) console.log("FACT:", f.slice(0,120));
    const b = analyzeBody(q, [], false, false); if (b) console.log("BODY:", b.text.slice(0,300));
    const m = analyzeMind(q, []); if (m) console.log("MIND:", m.text.slice(0,200));
    const h = heartStart(q, false); if (h) console.log("HEART["+h.theme+"]:", h.text.slice(0,400));
  }
  console.log("\n### advice:", heartContinue("em nghĩ anh nên làm gì?", "cold", false, 2, "Người ấy im lặng lâu rồi hả?", "").text.slice(0,300));
});
