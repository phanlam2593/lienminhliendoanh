import { it } from "vitest";
import { expandTeen } from "@/lib/lomiChat";
import { frameTurn } from "@/lib/lomiFrame";
import { parseVi } from "@/lib/lomiParse";
import { senseCanon } from "@/lib/lomiSense";
it("p",()=>{for(const s of ["A bị sếp mắng rồi.","A bị đồng nghiệp đổ lỗi rồi.","A bị khách chửi xong.","Hôm qua bị sếp mắng rồi.","A ăn cơm rồi.","A thi xong rồi.","Hôm qua A đi làm về muộn."]){const f=parseVi(s,{hour:15,addr:"anh"});const r=frameTurn(senseCanon(expandTeen(s)),f,{mode:"full",addr:"anh"} as any);console.log(JSON.stringify({s,done:f.pred?.done,recent:f.pred?.recent,time:f.time,head:f.pred?.head,known:f.pred?.known,r:r&&{i:r.intent,t:r.text}}))}});
