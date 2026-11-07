import { it } from "vitest";
import { heartContinue } from "@/lib/lomiHeart";
it("x", () => {
  const r = heartContinue("a nói gì cũng không ai chịu nghe", "sad", false, 3, "Ba mẹ cứ la mắng anh hả 😔 Vậy thì buồn thật.", "", {"mirror":"anh nói gì cũng không ai chịu nghe","val":0,"details":["ba mẹ cứ la mắng anh"],"third":false,"ask":false,"neg":false,"self":true,"clause":true});
  console.log("R", JSON.stringify(r));
});
