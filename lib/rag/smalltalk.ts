import { LangCode, LocalizedText } from "../types";

/**
 * The half of a conversation that is not a question.
 *
 * People do not walk up to a counter and open with "what is the PMFBY premium
 * rate for kharif". They say hello. They say thank you at the end. They ask
 * what this machine even is before they trust it with anything. None of that
 * is answerable from the corpus, so all of it used to fall through retrieval,
 * fail the similarity gate, and come back as "I could not answer this from the
 * government documents I hold" followed by a warning about people who ask for
 * money — which is a strange and slightly alarming reply to "namaste", and it
 * is the very first thing a new member saw.
 *
 * So these turns are answered here, warmly, before retrieval runs. This is not
 * a hole in the grounding contract: nothing below states a rule, a figure, a
 * date or an entitlement. The moment a message carries any substance it is not
 * matched here and goes to retrieval like everything else.
 */

export type SmallTalkIntent = "greeting" | "thanks" | "farewell" | "identity";

/**
 * Longest message still considered pure small talk.
 *
 * The guard that matters. "Hello" is a greeting; "hello, the agent took two
 * thousand rupees from me for the claim form" opens with one but is not one,
 * and answering it with "Namaste! What would you like to ask?" would be the
 * worst failure in this file. Length is a blunt test, but it fails in the safe
 * direction: a long message always goes to retrieval.
 */
const MAX_CHARS = 48;

/** Identity questions run a little longer ("what can you help me with"). */
const MAX_IDENTITY_CHARS = 72;

/**
 * Patterns per intent, across the six languages this service speaks.
 *
 * Matched against the whole message rather than searched for inside it, so a
 * greeting that carries a real question with it is not swallowed.
 */
const PATTERNS: Record<SmallTalkIntent, RegExp[]> = {
  thanks: [
    /\b(thanks|thank you|thank u|thankyou|thx|nandri|dhanyavad|shukriya)\b/i,
    /धन्यवाद|शुक्रिया|आभार/,
    /நன்றி/,
    /ధన్యవాద|కృతజ్ఞ/,
    /ಧನ್ಯವಾದ/,
    /നന്ദി/,
  ],
  farewell: [
    /\b(bye|goodbye|good bye|see you|that'?s all|thats all|nothing else|done)\b/i,
    /अलविदा|बस इतना|और कुछ नहीं/,
    /போய்ட்டு வரேன்|அவ்வளவு தான்|வேறொன்றும் இல்லை/,
    /సెలవు|అంతే|ఇంకేమీ లేదు/,
    /ಹೋಗಿ ಬರುತ್ತೇನೆ|ಅಷ್ಟೇ|ಬೇರೇನೂ ಇಲ್ಲ/,
    /പോയിവരാം|അത്രമാത്രം|വേറൊന്നുമില്ല/,
  ],
  identity: [
    /\b(who are you|what are you|who r u|what is this|what do you do|what can you do|how can you help|what can you help|can you help|how do you work|are you a (robot|bot|human|machine))\b/i,
    /तुम कौन हो|आप कौन ह|यह क्या है|क्या कर सकते ह|कैसे मदद/,
    /நீங்கள் யார்|நீ யார்|இது என்ன|என்ன செய்ய முடியும்|எப்படி உதவ/,
    /మీరు ఎవరు|నువ్వు ఎవరు|ఇది ఏమిటి|ఏమి చేయగలవు|ఎలా సహాయ/,
    /ನೀವು ಯಾರು|ನೀನು ಯಾರು|ಇದು ಏನು|ಏನು ಮಾಡಬಹುದು|ಹೇಗೆ ಸಹಾಯ/,
    /നിങ്ങൾ ആരാണ്|നീ ആരാണ്|ഇത് എന്താണ്|എന്ത് ചെയ്യാൻ|എങ്ങനെ സഹായ/,
  ],
  greeting: [
    /\b(hi|hii+|hey|hello+|helo|yo|namaste|namaskar|namaskara|vanakkam|vanakam|salaam|salam|assalamu alaikum|good morning|good afternoon|good evening|how are you)\b/i,
    /नमस्ते|नमस्कार|प्रणाम|कैसे हो|राम राम/,
    /வணக்கம்|எப்படி இருக்க/,
    /నమస్తే|నమస్కారం|ఎలా ఉన్నా/,
    /ನಮಸ್ತೆ|ನಮಸ್ಕಾರ|ಹೇಗಿದ್ದೀರ/,
    /നമസ്തേ|നമസ്കാരം|സുഖമാണോ/,
  ],
};

/**
 * Replies, in the member's own language.
 *
 * Every one of them ends by naming what can actually be asked. A member who
 * says hello to a screen and gets only "hello" back has learned nothing about
 * what the screen is for, and most of the people this serves have never used
 * an assistant before — the greeting is the only place they are told.
 */
const REPLIES: Record<SmallTalkIntent, LocalizedText> = {
  greeting: {
    en: "Namaste! I am PACS Sahayak. Ask me about crop insurance claims, cooperative society rules, government schemes for farmers, or a complaint you want to file. Speak or type in your own language — whatever is easier for you.",
    hi: "नमस्ते! मैं पीएसीएस सहायक हूँ। फसल बीमा दावों, सहकारी समिति के नियमों, किसानों के लिए सरकारी योजनाओं, या किसी शिकायत के बारे में मुझसे पूछें। अपनी भाषा में बोलें या लिखें — जो आपके लिए आसान हो।",
    ta: "வணக்கம்! நான் பாக்ஸ் சகாயக். பயிர் காப்பீட்டு உரிமைகோரல்கள், கூட்டுறவு சங்க விதிகள், விவசாயிகளுக்கான அரசுத் திட்டங்கள், அல்லது நீங்கள் பதிவு செய்ய விரும்பும் புகார் பற்றி என்னிடம் கேளுங்கள். உங்கள் மொழியில் பேசுங்கள் அல்லது எழுதுங்கள் — உங்களுக்கு எது எளிதோ அது.",
    te: "నమస్తే! నేను PACS సహాయక్. పంట బీమా క్లెయిమ్‌లు, సహకార సంఘ నియమాలు, రైతుల కోసం ప్రభుత్వ పథకాలు, లేదా మీరు నమోదు చేయాలనుకుంటున్న ఫిర్యాదు గురించి నన్ను అడగండి. మీ సొంత భాషలో మాట్లాడండి లేదా టైప్ చేయండి — మీకు ఏది సులభమో అది.",
    kn: "ನಮಸ್ತೆ! ನಾನು PACS ಸಹಾಯಕ. ಬೆಳೆ ವಿಮಾ ಕ್ಲೇಮ್‌ಗಳು, ಸಹಕಾರ ಸಂಘದ ನಿಯಮಗಳು, ರೈತರಿಗಾಗಿ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು, ಅಥವಾ ನೀವು ದಾಖಲಿಸಲು ಬಯಸುವ ದೂರಿನ ಬಗ್ಗೆ ನನ್ನನ್ನು ಕೇಳಿ. ನಿಮ್ಮ ಸ್ವಂತ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ ಅಥವಾ ಬರೆಯಿರಿ — ನಿಮಗೆ ಯಾವುದು ಸುಲಭವೋ ಅದು.",
    ml: "നമസ്തേ! ഞാൻ PACS സഹായക് ആണ്. വിള ഇൻഷുറൻസ് ക്ലെയിമുകൾ, സഹകരണ സംഘ നിയമങ്ങൾ, കർഷകർക്കുള്ള സർക്കാർ പദ്ധതികൾ, അല്ലെങ്കിൽ നിങ്ങൾ നൽകാൻ ആഗ്രഹിക്കുന്ന പരാതി എന്നിവയെക്കുറിച്ച് എന്നോട് ചോദിക്കൂ. നിങ്ങളുടെ സ്വന്തം ഭാഷയിൽ സംസാരിക്കുകയോ എഴുതുകയോ ചെയ്യാം — ഏതാണ് എളുപ്പമെന്ന് നിങ്ങൾ തീരുമാനിക്കൂ.",
  },
  thanks: {
    en: "You are welcome. Ask me anything else whenever you need to — this help is free, and nobody may charge you a fee for a government scheme.",
    hi: "आपका स्वागत है। जब भी ज़रूरत हो, मुझसे कुछ भी और पूछ लें — यह सहायता निःशुल्क है, और किसी सरकारी योजना के लिए कोई आपसे शुल्क नहीं ले सकता।",
    ta: "மகிழ்ச்சி. தேவைப்படும் போதெல்லாம் என்னிடம் மேலும் கேளுங்கள் — இந்த உதவி இலவசம், அரசுத் திட்டத்திற்காக யாரும் உங்களிடம் கட்டணம் வாங்க முடியாது.",
    te: "సంతోషం. అవసరమైనప్పుడల్లా నన్ను మరేదైనా అడగండి — ఈ సహాయం ఉచితం, ప్రభుత్వ పథకం కోసం ఎవరూ మీ దగ్గర రుసుము తీసుకోకూడదు.",
    kn: "ಸಂತೋಷ. ಅಗತ್ಯವಿದ್ದಾಗಲೆಲ್ಲಾ ನನ್ನನ್ನು ಇನ್ನೇನಾದರೂ ಕೇಳಿ — ಈ ಸಹಾಯ ಉಚಿತ, ಸರ್ಕಾರಿ ಯೋಜನೆಗಾಗಿ ಯಾರೂ ನಿಮ್ಮಿಂದ ಶುಲ್ಕ ಪಡೆಯುವಂತಿಲ್ಲ.",
    ml: "സന്തോഷം. ആവശ്യമുള്ളപ്പോഴെല്ലാം എന്നോട് വേറെയും ചോദിക്കാം — ഈ സഹായം സൗജന്യമാണ്, ഒരു സർക്കാർ പദ്ധതിക്കായി ആർക്കും നിങ്ങളിൽ നിന്ന് ഫീസ് വാങ്ങാൻ കഴിയില്ല.",
  },
  farewell: {
    en: "Take care. Come back any time — and remember, this service is free. No agent or official may take money from you for a government scheme.",
    hi: "अपना ध्यान रखें। कभी भी दोबारा आइए — और याद रखें, यह सेवा निःशुल्क है। किसी सरकारी योजना के लिए कोई एजेंट या अधिकारी आपसे पैसे नहीं ले सकता।",
    ta: "பத்திரமாக இருங்கள். எப்போது வேண்டுமானாலும் மீண்டும் வாருங்கள் — நினைவில் கொள்ளுங்கள், இந்தச் சேவை இலவசம். அரசுத் திட்டத்திற்காக எந்த முகவரோ அதிகாரியோ உங்களிடம் பணம் வாங்க முடியாது.",
    te: "జాగ్రత్త. ఎప్పుడైనా మళ్లీ రండి — గుర్తుంచుకోండి, ఈ సేవ ఉచితం. ప్రభుత్వ పథకం కోసం ఏ ఏజెంట్ లేదా అధికారి మీ దగ్గర డబ్బు తీసుకోకూడదు.",
    kn: "ಜಾಗ್ರತೆ. ಯಾವಾಗ ಬೇಕಾದರೂ ಮತ್ತೆ ಬನ್ನಿ — ನೆನಪಿಡಿ, ಈ ಸೇವೆ ಉಚಿತ. ಸರ್ಕಾರಿ ಯೋಜನೆಗಾಗಿ ಯಾವುದೇ ಏಜೆಂಟ್ ಅಥವಾ ಅಧಿಕಾರಿ ನಿಮ್ಮಿಂದ ಹಣ ಪಡೆಯುವಂತಿಲ್ಲ.",
    ml: "സൂക്ഷിക്കുക. എപ്പോൾ വേണമെങ്കിലും വീണ്ടും വരാം — ഓർക്കുക, ഈ സേവനം സൗജന്യമാണ്. ഒരു സർക്കാർ പദ്ധതിക്കായി ഒരു ഏജന്റിനോ ഉദ്യോഗസ്ഥനോ നിങ്ങളിൽ നിന്ന് പണം വാങ്ങാൻ കഴിയില്ല.",
  },
  identity: {
    en: "I am PACS Sahayak, a free helper for members of cooperative societies and for farmers. I answer only from government documents — crop insurance rules, cooperative law, Ministry schemes and grievance procedure — and I tell you which document each answer comes from. If I do not know something, I say so instead of guessing. Ask me in your own language.",
    hi: "मैं पीएसीएस सहायक हूँ, सहकारी समितियों के सदस्यों और किसानों के लिए एक निःशुल्क सहायक। मैं केवल सरकारी दस्तावेज़ों से उत्तर देता हूँ — फसल बीमा नियम, सहकारी कानून, मंत्रालय की योजनाएँ और शिकायत प्रक्रिया — और बताता हूँ कि हर उत्तर किस दस्तावेज़ से आया है। जो मुझे नहीं पता, उसका अनुमान लगाने के बजाय मैं साफ़ कह देता हूँ। अपनी भाषा में पूछें।",
    ta: "நான் பாக்ஸ் சகாயக், கூட்டுறவு சங்க உறுப்பினர்களுக்கும் விவசாயிகளுக்கும் ஒரு இலவச உதவியாளர். நான் அரசு ஆவணங்களிலிருந்து மட்டுமே பதிலளிக்கிறேன் — பயிர் காப்பீட்டு விதிகள், கூட்டுறவுச் சட்டம், அமைச்சகத் திட்டங்கள், புகார் நடைமுறை — மேலும் ஒவ்வொரு பதிலும் எந்த ஆவணத்திலிருந்து வந்தது என்று சொல்கிறேன். எனக்குத் தெரியாததை யூகிக்காமல் தெரியாது என்றே சொல்வேன். உங்கள் மொழியில் கேளுங்கள்.",
    te: "నేను PACS సహాయక్, సహకార సంఘ సభ్యులకు మరియు రైతులకు ఉచిత సహాయకుడిని. నేను ప్రభుత్వ పత్రాల నుండి మాత్రమే సమాధానం ఇస్తాను — పంట బీమా నియమాలు, సహకార చట్టం, మంత్రిత్వ శాఖ పథకాలు, ఫిర్యాదు విధానం — మరియు ప్రతి సమాధానం ఏ పత్రం నుండి వచ్చిందో చెబుతాను. నాకు తెలియనిది ఊహించకుండా తెలియదని చెబుతాను. మీ సొంత భాషలో అడగండి.",
    kn: "ನಾನು PACS ಸಹಾಯಕ, ಸಹಕಾರ ಸಂಘದ ಸದಸ್ಯರಿಗೆ ಮತ್ತು ರೈತರಿಗೆ ಉಚಿತ ಸಹಾಯಕ. ನಾನು ಸರ್ಕಾರಿ ದಾಖಲೆಗಳಿಂದ ಮಾತ್ರ ಉತ್ತರಿಸುತ್ತೇನೆ — ಬೆಳೆ ವಿಮಾ ನಿಯಮಗಳು, ಸಹಕಾರ ಕಾನೂನು, ಸಚಿವಾಲಯದ ಯೋಜನೆಗಳು, ದೂರು ಪ್ರಕ್ರಿಯೆ — ಮತ್ತು ಪ್ರತಿ ಉತ್ತರವೂ ಯಾವ ದಾಖಲೆಯಿಂದ ಬಂದಿದೆ ಎಂದು ಹೇಳುತ್ತೇನೆ. ಗೊತ್ತಿಲ್ಲದನ್ನು ಊಹಿಸದೆ ಗೊತ್ತಿಲ್ಲ ಎಂದೇ ಹೇಳುತ್ತೇನೆ. ನಿಮ್ಮ ಸ್ವಂತ ಭಾಷೆಯಲ್ಲಿ ಕೇಳಿ.",
    ml: "ഞാൻ PACS സഹായക് ആണ്, സഹകരണ സംഘ അംഗങ്ങൾക്കും കർഷകർക്കും ഉള്ള സൗജന്യ സഹായി. ഞാൻ സർക്കാർ രേഖകളിൽ നിന്ന് മാത്രമേ ഉത്തരം നൽകൂ — വിള ഇൻഷുറൻസ് നിയമങ്ങൾ, സഹകരണ നിയമം, മന്ത്രാലയ പദ്ധതികൾ, പരാതി നടപടിക്രമം — ഓരോ ഉത്തരവും ഏത് രേഖയിൽ നിന്നാണെന്നും ഞാൻ പറയും. അറിയാത്തത് ഊഹിക്കാതെ അറിയില്ല എന്ന് തുറന്നു പറയും. നിങ്ങളുടെ സ്വന്തം ഭാഷയിൽ ചോദിക്കൂ.",
  },
};

/**
 * Words that carry no question with them.
 *
 * Whatever is left of a message after its small-talk phrase is removed has to
 * be nothing much, or it is not small talk. "Namaste" is a greeting; "namaste,
 * how much premium do I pay" opens with one and is a question about money,
 * and the length guard alone let it through — it is only forty-five
 * characters. So the residue is checked, and these words do not count as
 * residue.
 */
const FILLER = new Set([
  "a", "an", "the", "and", "then", "so", "very", "much", "lot", "lots", "ok",
  "okay", "please", "sir", "madam", "ji", "you", "u", "me", "my", "for", "to",
  "there", "here", "now", "again", "today", "good", "well", "yes", "no",
  "जी", "साहब", "சார்", "ஐயா", "అండి", "సార్", "ಸರ್", "ಸಾರ್", "സാർ",
]);

/** Same pattern, forced global, so every occurrence is stripped not just one. */
function globalise(re: RegExp): RegExp {
  return re.flags.includes("g") ? re : new RegExp(re.source, `${re.flags}g`);
}

/**
 * What is left once the small-talk phrases are taken out.
 *
 * Punctuation goes too, so "hi!" and "thanks." leave nothing behind. Indic
 * scripts have no case and the Unicode-aware split on non-letters keeps them
 * whole, so a Tamil greeting reduces to an empty residue the same way.
 */
function residueWords(text: string, patterns: RegExp[]): string[] {
  let rest = text;
  for (const re of patterns) rest = rest.replace(globalise(re), " ");
  return rest
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !FILLER.has(w));
}

/**
 * Classifies a message as small talk, or returns null to send it to retrieval.
 *
 * Order matters: "thanks, bye" is a farewell, and "hello, who are you" is an
 * identity question. Greeting is checked last because it is the loosest.
 */
export function smallTalkIntent(message: string): SmallTalkIntent | null {
  const text = message.trim();
  if (!text) return null;

  const order: SmallTalkIntent[] = ["thanks", "farewell", "identity", "greeting"];
  for (const intent of order) {
    const limit = intent === "identity" ? MAX_IDENTITY_CHARS : MAX_CHARS;
    if (text.length > limit) continue;
    const patterns = PATTERNS[intent];
    if (!patterns.some((re) => re.test(text))) continue;
    // One stray word is tolerated ("hello madam ji", "thanks bhai"); two mean
    // the member is asking something, and something asked must be retrieved
    // against the corpus rather than answered with a pleasantry.
    if (residueWords(text, patterns).length <= 1) return intent;
  }
  return null;
}

/**
 * The reply, and the language it is really written in.
 *
 * `answerLang` is returned rather than assumed, for the same reason the rest
 * of the service returns it: these strings are hand-written, so a language
 * that has not been translated yet gets English and must be labelled English —
 * otherwise the kiosk reads an English sentence aloud in a Telugu voice.
 */
export function smallTalkReply(
  intent: SmallTalkIntent,
  lang: LangCode
): { text: string; answerLang: LangCode } {
  const reply = REPLIES[intent];
  const localised = reply[lang];
  return localised
    ? { text: localised, answerLang: lang }
    : { text: reply.en, answerLang: "en" };
}
