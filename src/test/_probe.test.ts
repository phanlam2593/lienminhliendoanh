import { it } from "vitest";
import { expandTeen } from "@/lib/lomiChat";
import { frameTurn } from "@/lib/lomiFrame";
import { parseVi } from "@/lib/lomiParse";
import { senseCanon } from "@/lib/lomiSense";
it("p",()=>{for(const s of ["A bị phạt rồi.","A bị trừ lương rồi.","A bị đuổi rồi.","A bị chê rồi.","A bị bơ rồi.","A bị cô lập rồi.","A bị la xong rồi.","A bị mắng xong rồi."]){const f=parseVi(s,{hour:15,addr:"anh"});const r=frameTurn(senseCanon(expandTeen(s)),f,{mode:"full",addr:"anh"} as any);console.log(JSON.stringify({s,done:f.pred?.done,recent:f.pred?.recent,time:f.time,head:f.pred?.head,known:f.pred?.known,r:r&&{i:r.intent,t:r.text}}))}});
