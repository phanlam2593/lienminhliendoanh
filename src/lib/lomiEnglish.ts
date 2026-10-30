// ─────────────────────────────────────────────────────────────────────────────
// LOMI TIẾNG ANH (22/10, QA V5) — chạy trên máy, không gọi AI.
//   Trước đây: app để tiếng Anh thì gần như mọi câu tâm sự / sức khoẻ / KHỦNG HOẢNG ("I want to kill myself", "my husband hit me",
//   "chest pain and shortness of breath") đều nhận câu "That's outside what Lomi knows"; app để tiếng Việt mà người dùng gõ tiếng Anh thì
//   bị bộ khôi phục dấu đọc thành tiếng Việt ("for me" → "for mẹ").
//   Ưu tiên: an toàn (tự hại, người khác muốn tự hại, quá liều, bạo lực, cấp cứu) → sức khoẻ thường gặp → cảm xúc → xã giao.
//   Số điện thoại: Việt Nam — 115 cấp cứu, 113 công an; đường dây Ngày Mai 096 306 1414 (giống lời đáp tiếng Việt của Lomi).
// ─────────────────────────────────────────────────────────────────────────────

const EN_WORDS = new Set(
  "i you he she it we they me my your our their is am are was were be been do does did have has had can could will would should what why how when where who which the a an and or but not no yes so to of in on at for with from about this that these those just very really feel feeling want need help please thanks thank hello hi hey sorry today tonight yesterday since my after before again anymore know think much many too there here some any".split(" "),
);
/** Câu gõ bằng tiếng Anh (không dấu, đa số là từ tiếng Anh thông dụng). */
export function looksEnglish(q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t || /[\u00C0-\u024F\u1E00-\u1EFF]/u.test(t.normalize("NFC"))) return false; // có dấu tiếng Việt → không phải câu tiếng Anh
  const w = t.replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
  if (w.length < 2) return /^(hi|hello|hey|thanks|thank you|bye|goodnight|good night)$/.test(t.replace(/[^a-z ]/g, "").trim());
  const hits = w.filter((x) => EN_WORDS.has(x) || EN_WORDS.has(x.replace(/'.*$/, ""))).length;
  return hits / w.length >= 0.34 && hits >= 2;
}

const has = (re: RegExp, t: string) => re.test(t);
const CRISIS_LINES =
  "• If you might act on these thoughts, or you're in danger right now: call **115** (emergency in Vietnam) or go to the nearest hospital\n• Ngày Mai mental health support line: **096 306 1414** (1pm–8:30pm, Wed–Sun; Vietnamese)\n• Reach out to someone you trust and let them stay with you — please don't be alone with this";

/** Lớp AN TOÀN tiếng Anh — chạy trước mọi lớp khác. */
export function englishSafety(q: string): string | null {
  const t = ` ${q.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ")} `;
  const self = /\b(i|i'm|im|i am|i've|ive)\b/;
  const other = /\b(my )?(friend|sister|brother|mom|mum|mother|dad|father|son|daughter|wife|husband|girlfriend|boyfriend|partner|roommate|colleague|classmate)\b|\b(she|he|they)\b/;
  const denial = has(/\b(not|never|don't|dont|won't|wont|no) (going to |gonna |planning to |want to |thinking (of|about) )?(kill|hurt|harm|end)\b|\bnot suicidal\b/, t);
  // Quá liều / nuốt chất độc — đã xảy ra.
  if (!denial && has(/\b(took|taken|swallowed|drank|overdosed|od'd)\b.{0,40}\b(too many|too much|whole (bottle|pack|box)|all (my|the|of the)|pills|tablets|bleach|poison|pesticide|overdose)\b|\boverdos(ed|e)\b/, t) && !has(/\b(what if|if (i|someone|you)|happens if|how many)\b/, t))
    return "⚠️ Please **call 115 now** or go to the nearest emergency room — don't wait to see if you feel okay. Some pills (like paracetamol or sleeping pills) can cause serious harm hours later even if you feel fine now.\n• Bring the pill box or bottle, and say how many you took and when\n• Don't make yourself vomit, and don't take anything else to \"cancel it out\"\n• Tell someone near you right now so you're not alone\n\nAre you safe right now, and is someone with you?";
  // Người khác có ý định tự hại.
  if (has(other, t) && has(/\b(wants? to|going to|gonna|plans? to|said (she|he|they) (wants?|would)|talk(s|ed|ing)? about) (die|kill (herself|himself|themselves)|end (it all|her life|his life|their life|everything)|commit suicide|hurt (herself|himself|themselves))\b|\bsuicidal\b/, t) && !has(/\bi (want|wanna) to (die|kill myself)\b/, t))
    return `That sounds really frightening, and it's good that you're taking it seriously 💚\n• If there's any chance she or he might act **tonight or soon**: call **115** now, or take them to the nearest hospital — you don't have to handle this alone\n• Try to **stay with them** (or get someone to), and move pills, blades or anything dangerous out of reach\n• Ask directly and calmly: "Are you thinking about ending your life?" — asking doesn't put the idea in their head; it shows you care\n• Listen without judging, and encourage them to talk to a professional; the Ngày Mai support line is **096 306 1414** (Vietnamese)\n\nAre you with them right now?`;
  // Bản thân có ý định tự hại / không muốn sống.
  if (!denial && has(/\b(kill myself|killing myself|end my life|ending my life|take my (own )?life|commit suicide|suicidal|want to die|wanna die|wish i (was|were) dead|wish i('d| had) never been born|don't want to (live|be alive|exist)|dont want to (live|be alive|exist)|no reason to live|better off without me|hurt myself|harm myself|cut myself|self[- ]harm|end it all|can't go on|cant go on|not worth living)\b/, t) && (has(self, t) || !has(other, t)))
    return `I'm really glad you told me, and I'm so sorry you're carrying this 💚 You don't have to go through it alone.\n${CRISIS_LINES}\n\nI'm here and I'll keep listening. Are you safe right now?`;
  // Bạo lực gia đình / người yêu.
  if (has(/\b(husband|wife|boyfriend|girlfriend|partner|ex|dad|father|mom|mother|stepdad|stepfather)\b.{0,30}\b(hit|hits|hitting|beat|beats|beating|punched|slapped|kicked|choked|strangled|hurt|hurts|threatened|threatens)\b.{0,10}\b(me|us|my)\b|\b(abuses|abused|abusing) me\b|\bdomestic violence\b/, t))
    return "I'm so sorry — that's not okay, and it's **not your fault** 💚\n• If you're in danger right now: get to a safe place if you can and call **113** (police); if you're hurt, call **115**\n• Tell someone you trust what's happening — a friend, family member or neighbour\n• For advice or a safe place to stay: the **Ngôi nhà Bình yên** hotline **1900 969 680** supports women and children facing violence (Vietnamese); under 18 you can call **111**\n• If you're injured, getting checked by a doctor also creates a record you may need later\n\nAre you somewhere safe right now?";
  // Cấp cứu: đau ngực, đột quỵ, phản vệ, khó thở nặng.
  if (has(/\bchest (pain|tightness|pressure)\b|\bpain in my chest\b/, t) && !has(/\b(went away|gone now|passed|stopped)\b/, t))
    return "⚠️ Chest pain with shortness of breath can be a heart attack or another emergency — **call 115 now** or have someone take you to the nearest emergency room. Don't drive yourself.\n• Sit down and rest while you wait; loosen tight clothing\n• Call immediately if the pain spreads to your arm, jaw, neck or back, or you're sweating, feel sick, dizzy or faint\n\nIs someone with you right now?";
  if (has(/\b(face (is )?(drooping|droops|dropped)|slurred speech|can't (speak|talk) properly|one side of (my|his|her) (body|face)|arm (is )?weak|sudden weakness|stroke)\b/, t))
    return "⚠️ These can be signs of a **stroke** — **call 115 immediately**. Every minute matters. Note the time the symptoms started, don't give food or drink, and stay with the person.";
  if (has(/\b(can't breathe|cannot breathe|cant breathe|struggling to breathe|throat (is )?(closing|swelling)|lips? (are |is )?swell|tongue (is )?swell)\b/, t))
    return "⚠️ Trouble breathing or swelling of the lips, tongue or throat is an **emergency** — **call 115 now**. If you have an adrenaline auto-injector (EpiPen), use it. Sit upright and don't stay alone.";
  // Sốt ở trẻ (theo tuổi — NHS: dưới 3 tháng từ 38°C, 3–6 tháng từ 39°C cần tư vấn khẩn).
  const kid = t.match(/\b(\d{1,2}) ?(month|months|mo|week|weeks|year|years|yo)[- ]?(old)?\b/);
  const temp = t.match(/\b(3[7-9]|4[0-2])(?:[.,](\d))? ?(degrees|°c|c|°)?\b/);
  if (kid && temp && has(/\b(fever|temperature|temp|hot)\b/, t) && has(/\b(baby|child|kid|son|daughter|toddler|infant|old)\b/, t)) {
    const n = Number(kid[1]);
    const months = /year|yo/.test(kid[2]) ? n * 12 : /week/.test(kid[2]) ? n / 4 : n;
    const c = Number(temp[1]) + (temp[2] ? Number(temp[2]) / 10 : 0);
    const urgent = (months < 3 && c >= 38) || (months < 6 && c >= 39);
    return `${urgent ? `⚠️ A baby **under ${months < 3 ? "3" : "6"} months** with a temperature of ${c}°C needs to be **seen by a doctor urgently** — take them to a clinic or hospital now (or call 115).` : `A ${c}°C fever in a child that age can usually be cared for at home if they're alert and drinking.`}\n• Give plenty of fluids (breast milk, formula, water); dress them lightly — don't bundle them up\n• Fever medicine must be a children's product dosed by **weight** — check with a pharmacist or doctor; never give adult medicine\n• Go to hospital / call 115 if they: are floppy or hard to wake, refuse feeds, breathe fast or with difficulty, have a seizure, look blue or pale, have a rash that doesn't fade when you press a glass on it, or the fever lasts more than 5 days`;
  }
  return null;
}

/** Sức khoẻ thường gặp, cảm xúc, xã giao — tiếng Anh. last = câu Lomi vừa nói. */
export function englishReply(q: string, last?: string): string | null {
  const t = ` ${q.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ")} `;
  const short = q.trim().split(/\s+/).length;
  // ── Phủ nhận ý định tự hại ──
  if (has(/\b(not|never|don't|dont|won't|wont) (going to |gonna )?(kill|hurt|harm) myself\b|\bnot suicidal\b/, t))
    return "Thank you for telling me that — I'm glad 💚 Feeling this worn out still matters, though. If those thoughts ever do show up, please reach out to someone you trust or call 115. What's been weighing on you the most?";
  // ── Xã giao ──
  if (short <= 8 && has(/^ (hi|hello|hey|yo|good (morning|afternoon|evening))( there)?( lomi)?[!. ]*( how are you( doing)?( today)?)?\??\s*$/, t))
    return has(/how are you/, t) ? "Hi! I'm doing well, thanks for asking 😊 How about you — how's your day going?" : "Hi there 👋 How are you doing today?";
  if (has(/\bhow are you\b/, t)) return "I'm doing well, thanks for asking 😊 How about you — how's your day going?";
  if (has(/\b(can|do) you (speak|understand|talk in) english\b/, t))
    return "Yes, I can chat in English 😊 My knowledge library is mostly in Vietnamese, so some detailed answers (like health cards or tarot meanings) may come in Vietnamese — you can switch the app language to English for English menus. What can I help you with?";
  if (has(/^ (thanks|thank you|thx|ty)( so much| a lot| lomi)?[!. ]*$|\bthat helps\b|\bthank you\b/, t) && short <= 8)
    return "You're welcome 😊 I'm here whenever you want to talk.";
  if (has(/^ (bye|goodbye|good night|goodnight|night|see you|see ya)\b/, t) && short <= 6) return "Good night 🌙 Take care, and come back anytime!";
  if (has(/\b(tell me a joke|say something funny|make me laugh)\b/, t))
    return "Why don't scientists trust atoms? …Because they make up everything 😄";
  if (has(/\b(i'?m|i am|feeling) (so )?bored\b|^ bored\b/, t))
    return "Bored, huh 😄 A few ideas: I can pull a tarot card for fun, find you a café or a place to eat in Explore (/kham-pha), or we can just chat — how's your day been?";
  if (has(/\bwhat can you do\b|\bwhat are you\b|\bwho are you\b/, t))
    return "I'm Lomi, the assistant in iLomi 😊 I can help with how to use the app, give everyday health info (I don't diagnose), listen when you want to talk, give small-business tips, and do tarot for fun.";
  // ── Bài tập thở / kéo về hiện tại (giống lib/lomiTherapy, gói trong một tin) ──
  if (has(/\b(breathing exercise|help me calm|calm me down|calm down|panic attack|panicking|having a panic)\b/, t))
    return "Let's do this together, slowly 🫁\n• Sit down, feet on the floor, drop your shoulders\n• Breathe in through your nose for 4 counts… and out slowly through your mouth for 6\n• Repeat 5 times\n\nThen ground yourself: name **5 things you can see**, **4 you can touch**, **3 you can hear**, **2 you can smell**, and **1 thing** that feels okay right now.\n\nIf you have chest pain, severe trouble breathing, or feel faint — or this is the first time — call **115**. How are you feeling now, from 0 to 10?";
  // ── Cảm xúc ──
  if (has(/\b(passed away|died|lost my|funeral|grief|grieving)\b/, t))
    return "I'm so sorry for your loss 💚 Losing someone you love hurts deeply, and there's no right way or timeline to grieve.\n\nWould you like to tell me a bit about them?";
  if (has(/\b(guilt|guilty|should have|shouldn't have|if only)\b/, t) && (has(/\b(grandma|grandpa|grandmother|grandfather|mom|mum|dad|mother|father|her|him|died|passed|loss)\b/, t) || has(/\bnormal to feel\b/, t) || (!!last && /loss|grieve|about them|about her|about him|miss most/.test(last))))
    return last && /Feeling guilty after a loss/.test(last) ? "Yes — it's completely normal 💚 Guilt is one of the most common parts of grief. It doesn't mean you did something wrong; it shows how much she mattered to you. Be as kind to yourself as she would have wanted you to be." : "Feeling guilty after a loss is **very common** — almost everyone who grieves thinks \"I should have done more.\" It's often love looking for somewhere to go. You couldn't know then what you know now.\n\nIt might help to write her a letter saying what you wish you'd said, or to do something she loved in her memory. If the guilt or sadness stays heavy for a long time, talking to a counsellor can really help.";
  if (last && /loss|grieve|about them/.test(last) && short <= 14 && !/\?\s*$/.test(q.trim()))
    return "Thank you for sharing that with me 💚 It sounds like she meant a lot to you. What do you miss most about her?";
  if (has(/\b(no advice|just (want|need) (someone|you) to listen|just listen|only (want|need) to vent|just want to vent)\b/, t))
    return "Of course — no advice, I'm just here to listen 🫶 Take your time and tell me whatever you want.";
  if (has(/\b(broke up|break up|breakup|dumped me|left me|split up)\b/, t))
    return "I'm really sorry 💔 A breakup can hurt so much — crying is a normal way your heart lets it out. You don't have to feel okay right away.\n\nTry to be gentle with yourself the next few days: eat something, sleep, and lean on a friend. Do you want to talk about what happened?";
  if (has(/\b(hasn't|hasnt|has not|haven't|didn't|doesn't|won't) (replied|reply|texted|text|answered|messaged)\b|\bleft me on read\b|\bghost(ed|ing)\b/, t))
    return "Waiting without hearing back is really unsettling 😔 It doesn't necessarily mean something is wrong — they might be busy, overwhelmed, or avoiding a hard conversation. A calm message like \"Hey, I haven't heard from you in a while — is everything okay?\" is better than many messages in a row.\n\nHas anything happened between you two recently?";
  if (has(/\b(lonely|alone|nobody cares|no one cares|no friends|don't know anyone|dont know anyone|isolated)\b/, t))
    return "Feeling lonely is really hard, and it's more common than people admit — especially after moving somewhere new 💚 It usually takes a few months to build connections in a new place.\n\nSmall steps help: a regular café where you become a familiar face, a class or a club, volunteering, or the Swipe page in this app (/quet) to find people for coffee or games. And you can always chat with me.\n\nWhat do your evenings usually look like?";
  if (has(/\b(boss|manager|supervisor)\b.{0,30}\b(yell|yells|yelling|shout|shouts|shouting|scream|screams|insult|insults|humiliat)/, t))
    return "Being yelled at by your boss is stressful and draining 😣 You deserve to be spoken to with respect, even when there's a mistake.\n• Try to separate the useful feedback (what to fix) from the way it was said\n• If it keeps happening, you can say calmly: \"I want to fix this — could we talk about it without raising voices?\"\n• Keep notes of dates and what happened; if it's repeated or humiliating, raise it with HR or a higher manager\n\nHow long has this been going on?";
  if (has(/\b(stress|stressed|overwhelmed|burn(ed|t)? out|burnout|exhausted)\b/, t))
    return "That sounds exhausting 😮‍💨 When everything piles up, it helps to pick just **one** small thing to do next, take short breaks, and protect your sleep. If it's been weeks and you feel drained all the time, it's worth talking to someone — a friend, or a professional.\n\nWhat's stressing you the most right now?";
  if (has(/\b(anxious|anxiety|panic|worried all the time|can't stop worrying|nervous all the time)\b/, t))
    return "Feeling anxious all the time is really tiring 💚 A few things that help many people: slow breathing (in for 4, out for 6) for a couple of minutes, cutting back on caffeine, regular sleep and movement, and writing worries down so they don't loop in your head.\n\nIf it's been going on for weeks, affects your sleep or daily life, or comes with panic attacks, please talk to a doctor or a mental health professional — anxiety is very treatable.\n\nIs there something specific you've been worrying about?";
  if (has(/\b(sad|down|depressed|unhappy|miserable|crying|cry)\b/, t))
    return "I'm sorry you're feeling down 💚 Thank you for telling me. Do you want to share what's been going on? I'm listening.";
  if (has(/\b(got promoted|promotion|got the job|passed|good news|so happy|i'm happy|i am happy)\b/, t))
    return "Congratulations!! 🎉 That's wonderful news — you earned it. How are you going to celebrate?";
  if (has(/\b(homesick|miss home|miss my family)\b|\bmoved to\b/, t))
    return "Moving to a new place is a big change, and feeling unsure about it after a few months is completely normal 💚 It usually takes 6 months or more to feel at home somewhere new. What made you decide to move?";
  // ── Sức khoẻ thường gặp ──
  if (has(/\bheadache\b/, t))
    return "Sorry about the headache 😣 Most headaches get better with rest, water, regular meals, less screen time, and a simple painkiller like paracetamol used as the label says.\n\n⚠️ Get urgent help (call 115) if it's **sudden and severe** (\"worst ever\"), or comes with a stiff neck and fever, confusion, weakness or numbness, trouble speaking, vision loss, or after a head injury. See a doctor if headaches keep coming back or get worse over days.\n\nHow long have you had it, and is it different from your usual headaches?";
  if (has(/\b(tired|exhausted|sleepy)\b.{0,30}\b(after|even|despite)\b.{0,20}\bsleep/, t) || has(/\bsleep(ing)? (8|eight|enough)\b.{0,30}\b(tired|sleepy)\b/, t))
    return "Feeling tired even after enough sleep is common and has many possible causes: poor sleep quality (snoring, waking up a lot, sleep apnea), irregular sleep times, screens late at night, stress or low mood, caffeine or alcohol, and sometimes conditions like anaemia, thyroid problems or diabetes.\n\nSee a doctor if it lasts more than a few weeks, or comes with falling asleep during the day, loud snoring or pauses in breathing at night, weight loss, or low mood.\n\nHow long has it been like this?";
  if (has(/\bparacetamol\b/, t) && has(/\bibuprofen\b/, t))
    return "For most adults it's fine to take **paracetamol and ibuprofen** together or alternate them, as long as you follow the dose on each label and don't exceed the daily maximum. Check that your cold/flu products don't already contain paracetamol, so you don't double up.\n\nAsk a pharmacist or doctor first if you have stomach ulcers, kidney or heart problems, asthma made worse by ibuprofen, are pregnant, take blood thinners, or it's for a child.";
  if (has(/\b(alcohol|drink|beer|wine)\b/, t) && has(/\bantibiotic/, t))
    return "With most common antibiotics, a small amount of alcohol isn't dangerous — but it's best to avoid drinking while you're ill so your body can recover. **Don't drink at all** with **metronidazole** or **tinidazole** (and for a couple of days after) — together they can cause severe nausea, vomiting, flushing and a racing heart.\n\nCheck the leaflet or ask a pharmacist for your specific antibiotic. Which one are you taking?";
  if (has(/\b(sore throat|cough|cold|flu|runny nose)\b/, t))
    return "Most colds and sore throats get better on their own in about a week: rest, drink plenty of fluids, warm drinks or gargling salt water can soothe the throat, and paracetamol or ibuprofen can help with pain or fever.\n\nSee a doctor if it doesn't improve after a week, you have a high fever, or you have a weakened immune system. Get urgent help if you have trouble breathing or swallowing.";
  if (has(/\b(fever|temperature)\b/, t))
    return "For a fever in adults: rest, drink plenty of fluids, and paracetamol can help with discomfort. Get medical help if it's above 39–40°C, lasts more than 3 days, or comes with a stiff neck, rash, confusion, trouble breathing, or severe pain. For a child, tell me their age and temperature and I'll tell you what's safe to watch at home.";
  // ── Ăn uống, quán xá, kinh doanh ──
  if (has(/\b(what should i eat|what to eat|hungry|dinner|lunch|breakfast)\b/, t))
    return "Hmm, in Đà Lạt you can't go wrong with **bánh căn**, **lẩu gà lá é** (chicken hotpot — great on a cold evening), a bowl of **phở**, or **bánh mì xíu mại** 😋 You can find places nearby in Explore (/kham-pha). Feeling like something warm or something light?";
  if (has(/\b(coffee|cafe|café)\b/, t) && has(/\b(work|study|quiet|laptop|find|where|good)\b/, t) && !has(/\b(open|start|run)\b/, t))
    return "For a quiet café to work in, check **Explore** (/kham-pha) and filter by Food & Drink — the business pages show photos, ratings and offers. In Vietnamese you can also ask me \"tìm quán cà phê yên tĩnh\" and I'll search the app's places for you ☕";
  if (has(/\b(open|start|opening|starting|run)\b.{0,20}\b(coffee shop|cafe|café|shop|restaurant|business|store)\b/, t))
    return "Exciting! ☕ A few tips for a small coffee shop:\n• **Location first** — foot traffic and rent decide a lot; keep a few months of rent in reserve\n• **Start small**: a short menu done really well beats a long one\n• Know your numbers: rent + staff + ingredients per cup, and how many cups a day you need to break even\n• Open softly with friends first to fix problems, then do a time-limited opening offer\n• Register your shop on this app early so it's approved before opening (Profile → ⋯ → Create business profile)\n\nWhat's your budget and where are you thinking of opening?";
  if (has(/\b(trust|believe|real|scientific|science)\b/, t) && has(/\btarot\b/, t))
    return "Honestly: there's **no scientific evidence** that tarot can predict the future 🔮 Many people use it as a reflection tool — the images prompt you to look at your situation from a new angle. I do tarot for fun and reflection; for big decisions about health, money or relationships, rely on real information and people you trust.";
  if (last && /Situation|Challenge|Advice|Now —|reading/.test(last) && has(/\b(what does (it|this|that) mean|meaning|explain)\b/, t))
    return "Each card's meaning is written right under it in the reading above 🔮 In short: the first card is where you are now, the second is what's in your way, and the third is the advice or direction. Which card would you like to think about more?";
  return null;
}

/** Không có lớp nào đáp được câu tiếng Anh — lời đáp thay cho "outside what Lomi knows". */
export function englishFallback(q: string): string {
  const isQ = /\?\s*$/.test(q.trim()) || /^(what|why|how|when|where|who|which|can|could|should|is|are|do|does|will)\b/i.test(q.trim());
  return isQ
    ? "I'm not sure about that one, and I'd rather not guess 🙏 I'm best at how to use the app, everyday health info, listening when you want to talk, small-business tips and tarot for fun. Could you tell me a bit more about what you need?"
    : "I hear you 💚 Tell me a bit more — what's been the hardest part?";
}

// Câu tiếng Việt chen vài chữ tiếng Anh hay gặp ("e ơi a bị headache quá", "nay a bị fever") → đổi sang chữ Việt để các lớp hiểu.
const MIX: [RegExp, string][] = [
  [/\bheadaches?\b/giu, "đau đầu"],
  [/\bstomach ?aches?\b/giu, "đau bụng"],
  [/\bsore throat\b/giu, "đau họng"],
  [/\bfever\b/giu, "sốt"],
  [/\bcough(ing)?\b/giu, "ho"],
  [/\bbackaches?\b|\bback pain\b/giu, "đau lưng"],
  [/\btoothaches?\b/giu, "đau răng"],
  [/\binsomnia\b/giu, "mất ngủ"],
  [/\bsad\b/giu, "buồn"],
  [/\blonely\b/giu, "cô đơn"],
  [/\banxious|anxiety\b/giu, "lo âu"],
];
export function viMixFix(text: string): string {
  if (!/[À-ɏḀ-ỿ]/u.test(text)) return text; // chỉ câu tiếng Việt có dấu
  let out = text;
  for (const [re, vi] of MIX) out = out.replace(re, vi);
  return out;
}
