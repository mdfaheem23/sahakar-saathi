import { LocalizedText } from "./types";

// ---------------------------------------------------------------------------
// Entitlement Gap Detector
//
// The core insight this module exists for: a chatbot can only answer what the
// user already knows to ask. The farmers with the worst awareness gap are, by
// definition, the ones who cannot phrase the question — you cannot ask about a
// scheme you have never heard of.
//
// So this inverts the interaction. Instead of waiting to be asked, we ask the
// farmer five things they definitely know about themselves, then compute what
// they are legally entitled to and are NOT currently claiming.
// ---------------------------------------------------------------------------

export interface FarmerProfile {
  landSize: "marginal" | "small" | "semi_medium"; // <1ha / 1-2ha / >2ha
  isTenant: boolean;
  hasKcc: boolean;
  isWoman: boolean;
  insuredThisSeason: boolean;
}

export interface Entitlement {
  id: string;
  name: LocalizedText;
  why: LocalizedText;
  valueInr: number;
  cadence: "yearly" | "one_time";
  source: string;
  /**
   * ISO date this figure was last checked against the source document.
   *
   * Left unset where it never was. This page names a rupee amount and tells a
   * member they are owed it, which is the strongest claim the service makes
   * and the one most worth acting on — so an amount nobody has traced to a
   * dated document is shown as untraced rather than sitting in the same
   * typeface as the four that were. Two of these are in that position, and
   * pretending otherwise would be the exact failure this whole layer is for.
   */
  verifiedOn?: string;
  isEligible: (p: FarmerProfile) => boolean;
  isAlreadyClaimed: (p: FarmerProfile) => boolean;
}

export const ENTITLEMENTS: Entitlement[] = [
  {
    id: "pm-kisan",
    name: {
      en: "PM-KISAN income support",
      hi: "पीएम-किसान आय सहायता",
      ta: "பிஎம்-கிசான் வருமான ஆதரவு",
      te: "PM-KISAN ఆదాయ మద్దతు",
      kn: "PM-KISAN ಆದಾಯ ಬೆಂಬಲ",
      ml: "PM-KISAN വരുമാന പിന്തുണ",
    },
    why: {
      en: "Every landholding farmer family gets ₹6,000/year in three direct transfers.",
      hi: "प्रत्येक भूमिधारक किसान परिवार को तीन सीधे हस्तांतरणों में ₹6,000/वर्ष मिलते हैं।",
      ta: "ஒவ்வொரு நிலம் வைத்திருக்கும் விவசாய குடும்பமும் மூன்று நேரடி பரிமாற்றங்களில் ஆண்டுக்கு ₹6,000 பெறுகிறது.",
      te: "భూమి కలిగిన ప్రతి రైతు కుటుంబానికి మూడు ప్రత్యక్ష బదిలీలలో సంవత్సరానికి ₹6,000 అందుతుంది.",
      kn: "ಭೂಮಿ ಹೊಂದಿರುವ ಪ್ರತಿ ರೈತ ಕುಟುಂಬಕ್ಕೆ ಮೂರು ನೇರ ವರ್ಗಾವಣೆಗಳಲ್ಲಿ ವರ್ಷಕ್ಕೆ ₹6,000 ಸಿಗುತ್ತದೆ.",
      ml: "ഭൂമിയുള്ള ഓരോ കർഷക കുടുംബത്തിനും മൂന്ന് നേരിട്ടുള്ള കൈമാറ്റങ്ങളിലായി പ്രതിവർഷം ₹6,000 ലഭിക്കും.",
    },
    valueInr: 6000,
    cadence: "yearly",
    source: "PM-KISAN Operational Guidelines, Sec. 3 — Beneficiary Definition",
    verifiedOn: "2026-08-30",
    isEligible: (p) => !p.isTenant,
    isAlreadyClaimed: () => false,
  },
  {
    id: "kcc-subvention",
    name: {
      en: "KCC interest subvention",
      hi: "केसीसी ब्याज सहायता",
      ta: "கேசிசி வட்டி மானியம்",
      te: "KCC వడ్డీ రాయితీ",
      kn: "KCC ಬಡ್ಡಿ ಸಬ್ಸಿಡಿ",
      ml: "KCC പലിശ സബ്‌സിഡി",
    },
    why: {
      en: "Crop loans up to ₹3 lakh drop from 7% to an effective 4% if you repay on time — a 3% saving.",
      hi: "₹3 लाख तक के फसल ऋण समय पर चुकाने पर 7% से घटकर प्रभावी 4% हो जाते हैं — 3% की बचत।",
      ta: "₹3 லட்சம் வரையிலான பயிர்க் கடன்கள் சரியான நேரத்தில் திருப்பிச் செலுத்தினால் 7%-லிருந்து 4% ஆகக் குறையும் — 3% சேமிப்பு.",
      te: "మీరు సకాలంలో తిరిగి చెల్లిస్తే ₹3 లక్షల వరకు పంట రుణాలపై వడ్డీ 7% నుండి వాస్తవంగా 4%కి తగ్గుతుంది — 3% ఆదా.",
      kn: "ನೀವು ಸಕಾಲದಲ್ಲಿ ಮರುಪಾವತಿಸಿದರೆ ₹3 ಲಕ್ಷದವರೆಗಿನ ಬೆಳೆ ಸಾಲದ ಬಡ್ಡಿ 7% ರಿಂದ ಪರಿಣಾಮಕಾರಿಯಾಗಿ 4% ಕ್ಕೆ ಇಳಿಯುತ್ತದೆ — 3% ಉಳಿತಾಯ.",
      ml: "നിങ്ങൾ കൃത്യസമയത്ത് തിരിച്ചടച്ചാൽ ₹3 ലക്ഷം വരെയുള്ള വിള വായ്പയുടെ പലിശ 7% ൽ നിന്ന് ഫലത്തിൽ 4% ആയി കുറയും — 3% ലാഭം.",
    },
    valueInr: 9000,
    cadence: "yearly",
    source: "Modified Interest Subvention Scheme (MISS), RBI/NABARD Circular",
    verifiedOn: "2026-08-30",
    isEligible: () => true,
    isAlreadyClaimed: (p) => p.hasKcc,
  },
  {
    id: "pmfby-subsidy",
    name: {
      en: "PMFBY premium subsidy",
      hi: "पीएमएफबीवाई प्रीमियम सब्सिडी",
      ta: "பிஎம்எஃப்பிவை பிரீமியம் மானியம்",
      te: "PMFBY ప్రీమియం రాయితీ",
      kn: "PMFBY ಪ್ರೀಮಿಯಂ ಸಬ್ಸಿಡಿ",
      ml: "PMFBY പ്രീമിയം സബ്‌സിഡി",
    },
    why: {
      en: "You pay only 2% of the sum insured for Kharif; the Centre and State pay the rest — typically 4–5× your share.",
      hi: "खरीफ के लिए आप बीमित राशि का केवल 2% देते हैं; शेष केंद्र और राज्य देते हैं — आमतौर पर आपके हिस्से का 4-5 गुना।",
      ta: "காரிஃப்-க்கு காப்பீட்டுத் தொகையில் 2% மட்டுமே நீங்கள் செலுத்துகிறீர்கள்; மீதியை மத்திய மற்றும் மாநில அரசு செலுத்துகிறது — பொதுவாக உங்கள் பங்கை விட 4-5 மடங்கு.",
      te: "ఖరీఫ్ కోసం మీరు బీమా మొత్తంలో కేవలం 2% మాత్రమే చెల్లిస్తారు; మిగతాది కేంద్ర, రాష్ట్ర ప్రభుత్వాలు చెల్లిస్తాయి — సాధారణంగా మీ వాటాకు 4–5 రెట్లు.",
      kn: "ಖಾರಿಫ್‌ಗಾಗಿ ನೀವು ವಿಮಾ ಮೊತ್ತದ ಕೇವಲ 2% ಪಾವತಿಸುತ್ತೀರಿ; ಉಳಿದದ್ದನ್ನು ಕೇಂದ್ರ ಮತ್ತು ರಾಜ್ಯ ಸರ್ಕಾರಗಳು ಪಾವತಿಸುತ್ತವೆ — ಸಾಮಾನ್ಯವಾಗಿ ನಿಮ್ಮ ಪಾಲಿನ 4–5 ಪಟ್ಟು.",
      ml: "ഖാരിഫിന് നിങ്ങൾ ഇൻഷുർ ചെയ്ത തുകയുടെ 2% മാത്രം അടയ്ക്കുന്നു; ബാക്കി കേന്ദ്ര-സംസ്ഥാന സർക്കാരുകൾ അടയ്ക്കുന്നു — സാധാരണ നിങ്ങളുടെ വിഹിതത്തിന്റെ 4–5 ഇരട്ടി.",
    },
    valueInr: 4800,
    cadence: "yearly",
    source: "PMFBY Operational Guidelines (Revamped, effective Kharif 2020), Premium Rates table (p. 22)",
    verifiedOn: "2026-08-30",
    isEligible: () => true,
    isAlreadyClaimed: (p) => p.insuredThisSeason,
  },
  {
    id: "kusum-pump",
    name: {
      en: "PM-KUSUM solar pump subsidy",
      hi: "पीएम-कुसुम सोलर पंप सब्सिडी",
      ta: "பிஎம்-குசும் சூரிய பம்ப் மானியம்",
      te: "PM-KUSUM సౌర పంపు రాయితీ",
      kn: "PM-KUSUM ಸೌರ ಪಂಪ್ ಸಬ್ಸಿಡಿ",
      ml: "PM-KUSUM സോളാർ പമ്പ് സബ്‌സിഡി",
    },
    why: {
      en: "30% central assistance plus at least 30% from the State on a standalone solar pump — you pay at most 40%, and up to 30% of that can be a bank loan.",
      hi: "स्टैंडअलोन सोलर पंप पर 30% केंद्रीय सहायता और राज्य से कम से कम 30% — आप अधिकतम 40% देते हैं, जिसमें से 30% तक बैंक ऋण हो सकता है।",
      ta: "தனித்த சூரிய பம்பில் 30% மத்திய உதவி மற்றும் மாநிலத்திடமிருந்து குறைந்தது 30% — நீங்கள் அதிகபட்சம் 40% செலுத்துகிறீர்கள், அதில் 30% வரை வங்கிக் கடனாக இருக்கலாம்.",
      te: "స్వతంత్ర సౌర పంపుపై 30% కేంద్ర సహాయం, రాష్ట్రం నుండి కనీసం 30% — మీరు గరిష్ఠంగా 40% చెల్లిస్తారు, అందులో 30% వరకు బ్యాంకు రుణం కావచ్చు.",
      kn: "ಸ್ವತಂತ್ರ ಸೌರ ಪಂಪ್‌ಗೆ 30% ಕೇಂದ್ರ ನೆರವು ಮತ್ತು ರಾಜ್ಯದಿಂದ ಕನಿಷ್ಠ 30% — ನೀವು ಗರಿಷ್ಠ 40% ಪಾವತಿಸುತ್ತೀರಿ, ಅದರಲ್ಲಿ 30% ವರೆಗೆ ಬ್ಯಾಂಕ್ ಸಾಲವಾಗಿರಬಹುದು.",
      ml: "ഒറ്റയ്ക്കുള്ള സോളാർ പമ്പിന് 30% കേന്ദ്ര സഹായവും സംസ്ഥാനത്തിൽ നിന്ന് കുറഞ്ഞത് 30% ഉം — നിങ്ങൾ പരമാവധി 40% അടയ്ക്കുന്നു, അതിൽ 30% വരെ ബാങ്ക് വായ്പയാകാം.",
    },
    valueInr: 63000,
    cadence: "one_time",
    source: "PM-KUSUM Component-B — Central Financial Assistance, MNRE",
    verifiedOn: "2026-08-30",
    isEligible: (p) => p.landSize !== "marginal",
    isAlreadyClaimed: () => false,
  },
  {
    id: "mahila-kisan",
    name: {
      en: "Mahila Kisan support (women farmers)",
      hi: "महिला किसान सहायता",
      ta: "மகிளா கிசான் ஆதரவு (பெண் விவசாயிகள்)",
      te: "మహిళా కిసాన్ మద్దతు (మహిళా రైతులు)",
      kn: "ಮಹಿಳಾ ಕಿಸಾನ್ ಬೆಂಬಲ (ಮಹಿಳಾ ರೈತರು)",
      ml: "മഹിളാ കിസാൻ പിന്തുണ (വനിതാ കർഷകർ)",
    },
    why: {
      en: "Women farmers get a higher subsidy share on equipment and priority in PACS credit allocation.",
      hi: "महिला किसानों को उपकरणों पर अधिक सब्सिडी हिस्सा और पीएसीएस ऋण आवंटन में प्राथमिकता मिलती है।",
      ta: "பெண் விவசாயிகளுக்கு உபகரணங்களில் அதிக மானியப் பங்கும், பாக்ஸ் கடன் ஒதுக்கீட்டில் முன்னுரிமையும் உண்டு.",
      te: "మహిళా రైతులకు పరికరాలపై ఎక్కువ రాయితీ వాటా, PACS రుణ కేటాయింపులో ప్రాధాన్యత లభిస్తుంది.",
      kn: "ಮಹಿಳಾ ರೈತರಿಗೆ ಉಪಕರಣಗಳ ಮೇಲೆ ಹೆಚ್ಚಿನ ಸಬ್ಸಿಡಿ ಪಾಲು ಮತ್ತು PACS ಸಾಲ ಹಂಚಿಕೆಯಲ್ಲಿ ಆದ್ಯತೆ ಸಿಗುತ್ತದೆ.",
      ml: "വനിതാ കർഷകർക്ക് ഉപകരണങ്ങളിൽ ഉയർന്ന സബ്‌സിഡി വിഹിതവും PACS വായ്പാ വിതരണത്തിൽ മുൻഗണനയും ലഭിക്കും.",
    },
    valueInr: 15000,
    cadence: "yearly",
    source: "MKSP / NRLM Guidelines — Women Farmer Entitlements",
    isEligible: (p) => p.isWoman,
    isAlreadyClaimed: () => false,
  },
  {
    id: "godown-subsidy",
    name: {
      en: "PACS godown / storage subsidy",
      hi: "पीएसीएस गोदाम / भंडारण सब्सिडी",
      ta: "பாக்ஸ் கிடங்கு / சேமிப்பு மானியம்",
      te: "PACS గోదాము / నిల్వ రాయితీ",
      kn: "PACS ಗೋದಾಮು / ಸಂಗ್ರಹ ಸಬ್ಸಿಡಿ",
      ml: "PACS ഗോഡൗൺ / സംഭരണ സബ്‌സിഡി",
    },
    why: {
      en: "Members of a PACS building storage infrastructure can access subsidised warehousing instead of distress-selling at harvest.",
      hi: "भंडारण अवसंरचना बनाने वाले पीएसीएस के सदस्य फसल के समय संकट-बिक्री के बजाय सब्सिडी वाले भंडारण का उपयोग कर सकते हैं।",
      ta: "சேமிப்பு உள்கட்டமைப்பை உருவாக்கும் பாக்ஸ் உறுப்பினர்கள் அறுவடையின்போது நெருக்கடி விற்பனைக்குப் பதிலாக மானிய கிடங்கைப் பயன்படுத்தலாம்.",
      te: "నిల్వ మౌలిక సదుపాయాలు నిర్మించే PACS సభ్యులు కోత సమయంలో నష్టానికి అమ్ముకోకుండా రాయితీ గిడ్డంగిని పొందవచ్చు.",
      kn: "ಸಂಗ್ರಹ ಮೂಲಸೌಕರ್ಯ ನಿರ್ಮಿಸುವ PACS ಸದಸ್ಯರು ಕೊಯ್ಲಿನ ಸಮಯದಲ್ಲಿ ನಷ್ಟಕ್ಕೆ ಮಾರುವ ಬದಲು ಸಬ್ಸಿಡಿ ಗೋದಾಮು ಪಡೆಯಬಹುದು.",
      ml: "സംഭരണ സൗകര്യം നിർമ്മിക്കുന്ന PACS അംഗങ്ങൾക്ക് വിളവെടുപ്പ് സമയത്ത് നഷ്ടത്തിൽ വിൽക്കുന്നതിനു പകരം സബ്‌സിഡി വെയർഹൗസ് ലഭിക്കും.",
    },
    valueInr: 22000,
    cadence: "yearly",
    source: "Agriculture Infrastructure Fund — PACS Component, Ministry of Cooperation",
    isEligible: () => true,
    isAlreadyClaimed: () => false,
  },
];

export interface EntitlementResult {
  eligible: Entitlement[];
  claimed: Entitlement[];
  missing: Entitlement[];
  missingValueInr: number;
  excluded: Entitlement[];
}

export function computeEntitlements(profile: FarmerProfile): EntitlementResult {
  const eligible = ENTITLEMENTS.filter((e) => e.isEligible(profile));
  const claimed = eligible.filter((e) => e.isAlreadyClaimed(profile));
  const missing = eligible.filter((e) => !e.isAlreadyClaimed(profile));
  const excluded = ENTITLEMENTS.filter((e) => !e.isEligible(profile));

  return {
    eligible,
    claimed,
    missing,
    missingValueInr: missing.reduce((sum, e) => sum + e.valueInr, 0),
    excluded,
  };
}

// A real policy gap worth surfacing rather than hiding: PM-KISAN is tied to
// land records, so tenant farmers and sharecroppers — often the poorest
// cultivators — are structurally excluded even though they bear the crop risk.
export const TENANT_GAP_NOTE: LocalizedText = {
  en: "You farm as a tenant/sharecropper, so PM-KISAN excludes you — it is tied to land ownership records. This is a known policy gap, not an error. You are still eligible for PMFBY as a sharecropper if your PACS issues a sowing certificate — ask for one.",
  hi: "आप किरायेदार/बटाईदार के रूप में खेती करते हैं, इसलिए पीएम-किसान आपको शामिल नहीं करता — यह भूमि स्वामित्व रिकॉर्ड से जुड़ा है। यह एक ज्ञात नीतिगत अंतर है, त्रुटि नहीं। यदि आपका पीएसीएस बुवाई प्रमाण पत्र जारी करता है तो आप बटाईदार के रूप में पीएमएफबीवाई के लिए अभी भी पात्र हैं — इसे मांगें।",
  ta: "நீங்கள் குத்தகைதாரர்/பங்குப் பயிரிடுபவராக விவசாயம் செய்வதால், பிஎம்-கிசான் உங்களை விலக்குகிறது — அது நில உரிமைப் பதிவுகளுடன் இணைக்கப்பட்டுள்ளது. இது அறியப்பட்ட கொள்கை இடைவெளி, பிழை அல்ல. உங்கள் பாக்ஸ் விதைப்புச் சான்றிதழ் வழங்கினால் பங்குப் பயிரிடுபவராக பிஎம்எஃப்பிவை-க்கு நீங்கள் இன்னும் தகுதியானவர் — அதைக் கேளுங்கள்.",
  te: "మీరు కౌలుదారు/పంట పంపకందారుగా సాగు చేస్తారు, కాబట్టి PM-KISAN మిమ్మల్ని మినహాయిస్తుంది — ఇది భూ యాజమాన్య రికార్డులతో ముడిపడి ఉంది. ఇది తెలిసిన విధాన లోపం, పొరపాటు కాదు. మీ PACS విత్తన ధృవీకరణ పత్రం ఇస్తే పంట పంపకందారుగా మీరు ఇప్పటికీ PMFBYకి అర్హులు — దాన్ని అడగండి.",
  kn: "ನೀವು ಗುತ್ತಿಗೆದಾರ/ಪಾಲುಗಾರನಾಗಿ ಕೃಷಿ ಮಾಡುತ್ತೀರಿ, ಆದ್ದರಿಂದ PM-KISAN ನಿಮ್ಮನ್ನು ಹೊರಗಿಡುತ್ತದೆ — ಅದು ಭೂ ಮಾಲೀಕತ್ವದ ದಾಖಲೆಗಳಿಗೆ ಜೋಡಿಸಲಾಗಿದೆ. ಇದು ತಿಳಿದಿರುವ ನೀತಿ ಲೋಪ, ತಪ್ಪಲ್ಲ. ನಿಮ್ಮ PACS ಬಿತ್ತನೆ ಪ್ರಮಾಣಪತ್ರ ನೀಡಿದರೆ ಪಾಲುಗಾರನಾಗಿ ನೀವು ಈಗಲೂ PMFBY ಗೆ ಅರ್ಹರು — ಅದನ್ನು ಕೇಳಿ.",
  ml: "നിങ്ങൾ പാട്ടക്കാരൻ/പങ്കുകൃഷിക്കാരനായി കൃഷി ചെയ്യുന്നു, അതിനാൽ PM-KISAN നിങ്ങളെ ഒഴിവാക്കുന്നു — അത് ഭൂ ഉടമസ്ഥാവകാശ രേഖകളുമായി ബന്ധിപ്പിച്ചിരിക്കുന്നു. ഇത് അറിയപ്പെടുന്ന നയ വിടവാണ്, പിഴവല്ല. നിങ്ങളുടെ PACS വിതയ്ക്കൽ സർട്ടിഫിക്കറ്റ് നൽകിയാൽ പങ്കുകൃഷിക്കാരനായി നിങ്ങൾക്ക് ഇപ്പോഴും PMFBY ന് അർഹതയുണ്ട് — അത് ചോദിക്കൂ.",
};
