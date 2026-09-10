import { LangCode, LocalizedText } from "./types";

export const LANGUAGES: { code: LangCode; label: string; native: string; speechTag: string }[] = [
  { code: "en", label: "English", native: "English", speechTag: "en-IN" },
  { code: "hi", label: "Hindi", native: "हिंदी", speechTag: "hi-IN" },
  { code: "ta", label: "Tamil", native: "தமிழ்", speechTag: "ta-IN" },
  { code: "te", label: "Telugu", native: "తెలుగు", speechTag: "te-IN" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", speechTag: "kn-IN" },
  { code: "ml", label: "Malayalam", native: "മലയാളം", speechTag: "ml-IN" },
];

/**
 * Every language the assistant will answer in. Retrieval indexing, keyword
 * folding and the reply-language contract all derive from this list, so adding
 * a language here is enough to make it a first-class language everywhere
 * rather than one that quietly degrades to English.
 */
export const SUPPORTED_LANGS: LangCode[] = LANGUAGES.map((l) => l.code);

/** BCP-47 tag Sarvam expects for ASR/TTS in this language. */
export function speechTagFor(lang: LangCode): string {
  return LANGUAGES.find((l) => l.code === lang)?.speechTag ?? "en-IN";
}

/** Native-script name, for telling a member which language they are reading. */
export function nativeNameFor(lang: LangCode): string {
  return LANGUAGES.find((l) => l.code === lang)?.native ?? "English";
}

type Dict = LocalizedText;

export const STRINGS: Record<string, Dict> = {
  appName: {
    en: "PACS Sahayak",
    hi: "पीएसीएस सहायक",
    ta: "பாக்ஸ் சகாயக்",
    te: "PACS సహాయక్",
    kn: "PACS ಸಹಾಯಕ",
    ml: "PACS സഹായക്",
  },
  tagline: {
    en: "Your cooperative & PMFBY assistant",
    hi: "आपका सहकारिता व पीएमएफबीवाई सहायक",
    ta: "உங்கள் கூட்டுறவு & பிஎம்எஃப்பிவை உதவியாளர்",
    te: "మీ సహకార & PMFBY సహాయకుడు",
    kn: "ನಿಮ್ಮ ಸಹಕಾರಿ & PMFBY ಸಹಾಯಕ",
    ml: "നിങ്ങളുടെ സഹകരണ & PMFBY സഹായി",
  },
  chatChannel: {
    en: "Chat (App / Web)",
    hi: "चैट (ऐप / वेब)",
    ta: "அரட்டை (ஆப் / வெப்)",
    te: "చాట్ (యాప్ / వెబ్)",
    kn: "ಚಾಟ್ (ಆ್ಯಪ್ / ವೆಬ್)",
    ml: "ചാറ്റ് (ആപ്പ് / വെബ്)",
  },

  /* Condensed labels for the top nav — the full titles above are used as page
     headings, but wrap the header onto three lines if reused there. */
  navChat: {
    en: "Ask",
    hi: "पूछें",
    ta: "கேள்",
    te: "అడగండి",
    kn: "ಕೇಳಿ",
    ml: "ചോദിക്കൂ",
  },
  navEntitlements: {
    en: "Entitlements",
    hi: "हकदारी",
    ta: "உரிமைகள்",
    te: "హక్కులు",
    kn: "ಹಕ್ಕುಗಳು",
    ml: "അവകാശങ്ങൾ",
  },
  navVerify: {
    en: "Verify",
    hi: "जांचें",
    ta: "சரிபார்",
    te: "ధృవీకరించండి",
    kn: "ಪರಿಶೀಲಿಸಿ",
    ml: "പരിശോധിക്കൂ",
  },
  navAlerts: {
    en: "Alerts",
    hi: "अलर्ट",
    ta: "எச்சரிக்கை",
    te: "హెచ్చరికలు",
    kn: "ಎಚ್ಚರಿಕೆಗಳು",
    ml: "മുന്നറിയിപ്പുകൾ",
  },
  navKiosk: {
    en: "Kiosk",
    hi: "कियोस्क",
    ta: "கியோஸ்க்",
    te: "కియోస్క్",
    kn: "ಕಿಯೋಸ್ಕ್",
    ml: "കിയോസ്ക്",
  },
  navGrievance: {
    en: "Grievance",
    hi: "शिकायत",
    ta: "புகார்",
    te: "ఫిర్యాదు",
    kn: "ದೂರು",
    ml: "പരാതി",
  },
  navAdmin: {
    en: "Admin",
    hi: "एडमिन",
    ta: "நிர்வாகம்",
    te: "అడ్మిన్",
    kn: "ಆಡಳಿತ",
    ml: "അഡ്മിൻ",
  },
  kioskChannel: {
    en: "PACS Kiosk",
    hi: "पीएसीएस कियोस्क",
    ta: "பாக்ஸ் கியோஸ்க்",
    te: "PACS కియోస్క్",
    kn: "PACS ಕಿಯೋಸ್ಕ್",
    ml: "PACS കിയോസ്ക്",
  },
  grievanceChannel: {
    en: "Grievance Tracker",
    hi: "शिकायत ट्रैकर",
    ta: "புகார் கண்காணிப்பான்",
    te: "ఫిర్యాదు ట్రాకర్",
    kn: "ದೂರು ಟ್ರ್ಯಾಕರ್",
    ml: "പരാതി ട്രാക്കർ",
  },
  alertsChannel: {
    en: "Risk & Deadline Alerts",
    hi: "जोखिम व समय-सीमा अलर्ट",
    ta: "ஆபத்து & காலக்கெடு எச்சரிக்கைகள்",
    te: "ప్రమాద & గడువు హెచ్చరికలు",
    kn: "ಅಪಾಯ & ಗಡುವು ಎಚ್ಚರಿಕೆಗಳು",
    ml: "അപകട & സമയപരിധി മുന്നറിയിപ്പുകൾ",
  },
  entitlementsChannel: {
    en: "What am I missing?",
    hi: "मैं क्या चूक रहा हूं?",
    ta: "நான் எதை இழக்கிறேன்?",
    te: "నేను ఏమి కోల్పోతున్నాను?",
    kn: "ನಾನು ಏನು ಕಳೆದುಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ?",
    ml: "ഞാൻ എന്താണ് നഷ്ടപ്പെടുത്തുന്നത്?",
  },
  verifyChannel: {
    en: "Is this true?",
    hi: "क्या यह सच है?",
    ta: "இது உண்மையா?",
    te: "ఇది నిజమా?",
    kn: "ಇದು ನಿಜವೇ?",
    ml: "ഇത് ശരിയാണോ?",
  },
  adminChannel: {
    en: "NCCT / PACS Admin Dashboard",
    hi: "एनसीसीटी / पीएसीएस एडमिन डैशबोर्ड",
    ta: "என்சிசிடி / பாக்ஸ் நிர்வாக டாஷ்போர்டு",
    te: "NCCT / PACS అడ్మిన్ డాష్‌బోర్డ్",
    kn: "NCCT / PACS ಆಡಳಿತ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    ml: "NCCT / PACS അഡ്മിൻ ഡാഷ്ബോർഡ്",
  },
  typeMessage: {
    en: "Type or speak your question…",
    hi: "अपना प्रश्न टाइप या बोलें…",
    ta: "உங்கள் கேள்வியை தட்டச்சு செய்யவும் அல்லது பேசவும்…",
    te: "మీ ప్రశ్నను టైప్ చేయండి లేదా మాట్లాడండి…",
    kn: "ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ…",
    ml: "നിങ്ങളുടെ ചോദ്യം ടൈപ്പ് ചെയ്യുക അല്ലെങ്കിൽ പറയുക…",
  },
  send: {
    en: "Send",
    hi: "भेजें",
    ta: "அனுப்பு",
    te: "పంపు",
    kn: "ಕಳುಹಿಸಿ",
    ml: "അയയ്ക്കുക",
  },
  listening: {
    en: "Listening…",
    hi: "सुन रहा है…",
    ta: "கேட்கிறது…",
    te: "వింటున్నాను…",
    kn: "ಕೇಳುತ್ತಿದ್ದೇನೆ…",
    ml: "കേൾക്കുന്നു…",
  },
  processing: {
    en: "Transcribing…",
    hi: "लिप्यंतरण हो रहा है…",
    ta: "படியெடுக்கப்படுகிறது…",
    te: "లిప్యంతరీకరిస్తోంది…",
    kn: "ಲಿಪ್ಯಂತರಿಸಲಾಗುತ್ತಿದೆ…",
    ml: "ട്രാൻസ്ക്രൈബ് ചെയ്യുന്നു…",
  },
  errDenied: {
    en: "Microphone blocked. Allow mic access in your browser, then try again.",
    hi: "माइक्रोफ़ोन अवरुद्ध है। ब्राउज़र में माइक की अनुमति दें, फिर पुनः प्रयास करें।",
    ta: "மைக்ரோஃபோன் தடுக்கப்பட்டுள்ளது. உலாவியில் அனுமதி அளித்து மீண்டும் முயற்சிக்கவும்.",
    te: "మైక్రోఫోన్ నిరోధించబడింది. మీ బ్రౌజర్‌లో మైక్ అనుమతి ఇచ్చి మళ్లీ ప్రయత్నించండి.",
    kn: "ಮೈಕ್ರೊಫೋನ್ ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ. ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಮೈಕ್ ಅನುಮತಿ ನೀಡಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    ml: "മൈക്രോഫോൺ തടഞ്ഞിരിക്കുന്നു. ബ്രൗസറിൽ മൈക്ക് അനുമതി നൽകി വീണ്ടും ശ്രമിക്കുക.",
  },
  errTooShort: {
    en: "I didn't catch that — hold the mic and speak for a moment longer.",
    hi: "मैं समझ नहीं पाया — माइक दबाए रखें और थोड़ा और बोलें।",
    ta: "எனக்குக் கேட்கவில்லை — மைக்கை அழுத்திப் பிடித்து சற்று நீளமாகப் பேசுங்கள்.",
    te: "నాకు అది వినిపించలేదు — మైక్ నొక్కి ఉంచి కొంచెం ఎక్కువసేపు మాట్లాడండి.",
    kn: "ಅದು ನನಗೆ ಕೇಳಿಸಲಿಲ್ಲ — ಮೈಕ್ ಒತ್ತಿ ಹಿಡಿದು ಸ್ವಲ್ಪ ಹೆಚ್ಚು ಹೊತ್ತು ಮಾತನಾಡಿ.",
    ml: "എനിക്ക് അത് കേൾക്കാനായില്ല — മൈക്ക് അമർത്തിപ്പിടിച്ച് അൽപ്പം കൂടി സംസാരിക്കൂ.",
  },
  errFailed: {
    en: "Voice service is unavailable right now. You can type your question instead.",
    hi: "वॉइस सेवा अभी उपलब्ध नहीं है। आप अपना प्रश्न टाइप कर सकते हैं।",
    ta: "குரல் சேவை தற்போது கிடைக்கவில்லை. உங்கள் கேள்வியைத் தட்டச்சு செய்யலாம்.",
    te: "వాయిస్ సేవ ప్రస్తుతం అందుబాటులో లేదు. మీరు మీ ప్రశ్నను టైప్ చేయవచ్చు.",
    kn: "ಧ್ವನಿ ಸೇವೆ ಈಗ ಲಭ್ಯವಿಲ್ಲ. ನೀವು ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಬಹುದು.",
    ml: "ശബ്ദ സേവനം ഇപ്പോൾ ലഭ്യമല്ല. നിങ്ങൾക്ക് ചോദ്യം ടൈപ്പ് ചെയ്യാം.",
  },
  speakNow: {
    en: "Tap mic and speak",
    hi: "माइक दबाएं और बोलें",
    ta: "மைக்கை தட்டி பேசவும்",
    te: "మైక్ నొక్కి మాట్లాడండి",
    kn: "ಮೈಕ್ ಒತ್ತಿ ಮಾತನಾಡಿ",
    ml: "മൈക്ക് അമർത്തി സംസാരിക്കൂ",
  },
  welcomeMsg: {
    en: "Namaste! Ask me about PMFBY claims, Ministry schemes, PACS by-laws, or file a grievance — in your own language.",
    hi: "नमस्ते! मुझसे पीएमएफबीवाई दावों, मंत्रालय की योजनाओं, पीएसीएस उपनियमों के बारे में पूछें, या शिकायत दर्ज करें — अपनी भाषा में।",
    ta: "வணக்கம்! பிஎம்எஃப்பிவை உரிமைகோரல்கள், அமைச்சக திட்டங்கள், பாக்ஸ் துணைச்சட்டங்கள் பற்றி கேளுங்கள், அல்லது புகார் பதிவு செய்யுங்கள் — உங்கள் சொந்த மொழியில்.",
    te: "నమస్తే! PMFBY క్లెయిమ్‌ల గురించి, మంత్రిత్వ శాఖ పథకాల గురించి, PACS ఉప-చట్టాల గురించి నన్ను అడగండి, లేదా ఫిర్యాదు నమోదు చేయండి — మీ సొంత భాషలో.",
    kn: "ನಮಸ್ತೆ! PMFBY ಕ್ಲೇಮ್‌ಗಳ ಬಗ್ಗೆ, ಸಚಿವಾಲಯದ ಯೋಜನೆಗಳ ಬಗ್ಗೆ, PACS ಉಪ-ನಿಯಮಗಳ ಬಗ್ಗೆ ನನ್ನನ್ನು ಕೇಳಿ, ಅಥವಾ ದೂರು ದಾಖಲಿಸಿ — ನಿಮ್ಮ ಸ್ವಂತ ಭಾಷೆಯಲ್ಲಿ.",
    ml: "നമസ്തേ! PMFBY ക്ലെയിമുകൾ, മന്ത്രാലയ പദ്ധതികൾ, PACS ഉപനിയമങ്ങൾ എന്നിവയെക്കുറിച്ച് എന്നോട് ചോദിക്കൂ, അല്ലെങ്കിൽ പരാതി രജിസ്റ്റർ ചെയ്യൂ — നിങ്ങളുടെ സ്വന്തം ഭാഷയിൽ.",
  },
  escalateMsg: {
    en: "I'm sorry — I don't have a verified answer to that, and I won't guess about something you may act on. Your PACS secretary can help, and nobody may charge you a fee to find out. Shall I open a grievance ticket so it is on record and someone follows it up with you?",
    hi: "मुझे खेद है — इसका कोई सत्यापित उत्तर मेरे पास नहीं है, और जिस बात पर आप अमल करेंगे उस पर मैं अनुमान नहीं लगाऊंगा। आपके पीएसीएस सचिव मदद कर सकते हैं, और यह पता करने के लिए कोई आपसे शुल्क नहीं ले सकता। क्या मैं शिकायत दर्ज कर दूं ताकि यह रिकॉर्ड में रहे और कोई आपसे संपर्क करे?",
    ta: "மன்னிக்கவும் — இதற்கு சரிபார்க்கப்பட்ட பதில் என்னிடம் இல்லை, நீங்கள் நடவடிக்கை எடுக்கும் விஷயத்தில் நான் யூகிக்க மாட்டேன். உங்கள் பாக்ஸ் செயலாளர் உதவ முடியும், இதை அறிய யாரும் உங்களிடம் கட்டணம் வாங்க முடியாது. இது பதிவில் இருக்கவும் யாராவது உங்களைத் தொடர்பு கொள்ளவும் நான் ஒரு புகாரைப் பதிவு செய்யட்டுமா?",
    te: "క్షమించండి — దీనికి ధృవీకరించిన సమాధానం నా దగ్గర లేదు, మీరు ఆచరించే విషయంపై నేను ఊహించను. మీ PACS కార్యదర్శి సహాయం చేయగలరు, ఇది తెలుసుకోవడానికి ఎవరూ మీ దగ్గర రుసుము తీసుకోకూడదు. ఇది రికార్డులో ఉండేలా, ఎవరైనా మిమ్మల్ని సంప్రదించేలా నేను ఫిర్యాదు నమోదు చేయనా?",
    kn: "ಕ್ಷಮಿಸಿ — ಇದಕ್ಕೆ ಪರಿಶೀಲಿಸಿದ ಉತ್ತರ ನನ್ನ ಬಳಿ ಇಲ್ಲ, ನೀವು ಕ್ರಮ ಕೈಗೊಳ್ಳುವ ವಿಷಯದಲ್ಲಿ ನಾನು ಊಹಿಸುವುದಿಲ್ಲ. ನಿಮ್ಮ PACS ಕಾರ್ಯದರ್ಶಿ ಸಹಾಯ ಮಾಡಬಲ್ಲರು, ಇದನ್ನು ತಿಳಿಯಲು ಯಾರೂ ನಿಮ್ಮಿಂದ ಶುಲ್ಕ ಪಡೆಯುವಂತಿಲ್ಲ. ಇದು ದಾಖಲೆಯಲ್ಲಿ ಇರುವಂತೆ ಮತ್ತು ಯಾರಾದರೂ ನಿಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸುವಂತೆ ನಾನು ದೂರು ದಾಖಲಿಸಲೇ?",
    ml: "ക്ഷമിക്കണം — ഇതിന് സ്ഥിരീകരിച്ച ഉത്തരം എന്റെ പക്കലില്ല, നിങ്ങൾ പ്രവർത്തിക്കാൻ പോകുന്ന കാര്യത്തിൽ ഞാൻ ഊഹിക്കില്ല. നിങ്ങളുടെ PACS സെക്രട്ടറിക്ക് സഹായിക്കാനാകും, ഇത് അറിയാൻ ആർക്കും നിങ്ങളിൽ നിന്ന് ഫീസ് വാങ്ങാൻ കഴിയില്ല. ഇത് രേഖയിൽ വരാനും ആരെങ്കിലും നിങ്ങളെ ബന്ധപ്പെടാനും ഞാൻ ഒരു പരാതി രജിസ്റ്റർ ചെയ്യട്ടെ?",
  },
  source: {
    en: "Source",
    hi: "स्रोत",
    ta: "மூலம்",
    te: "మూలం",
    kn: "ಮೂಲ",
    ml: "ഉറവിടം",
  },
  escalated: {
    en: "Escalated to human officer",
    hi: "मानव अधिकारी को भेजा गया",
    ta: "மனித அதிகாரிக்கு அனுப்பப்பட்டது",
    te: "మానవ అధికారికి పంపబడింది",
    kn: "ಮಾನವ ಅಧಿಕಾರಿಗೆ ಕಳುಹಿಸಲಾಗಿದೆ",
    ml: "ഉദ്യോഗസ്ഥന് കൈമാറി",
  },
  fileGrievance: {
    en: "File a grievance",
    hi: "शिकायत दर्ज करें",
    ta: "புகார் பதிவு செய்யவும்",
    te: "ఫిర్యాదు నమోదు చేయండి",
    kn: "ದೂರು ದಾಖಲಿಸಿ",
    ml: "പരാതി നൽകുക",
  },
  fullName: {
    en: "Full name",
    hi: "पूरा नाम",
    ta: "முழு பெயர்",
    te: "పూర్తి పేరు",
    kn: "ಪೂರ್ಣ ಹೆಸರು",
    ml: "പൂർണ്ണ നാമം",
  },
  phoneNumber: {
    en: "Phone number",
    hi: "फोन नंबर",
    ta: "தொலைபேசி எண்",
    te: "ఫోన్ నంబర్",
    kn: "ಫೋನ್ ಸಂಖ್ಯೆ",
    ml: "ഫോൺ നമ്പർ",
  },
  pacsName: {
    en: "PACS name",
    hi: "पीएसीएस का नाम",
    ta: "பாக்ஸ் பெயர்",
    te: "PACS పేరు",
    kn: "PACS ಹೆಸರು",
    ml: "PACS പേര്",
  },
  category: {
    en: "Category",
    hi: "श्रेणी",
    ta: "வகை",
    te: "విభాగం",
    kn: "ವಿಭಾಗ",
    ml: "വിഭാഗം",
  },
  description: {
    en: "Describe the issue",
    hi: "समस्या का विवरण दें",
    ta: "பிரச்சனையை விவரிக்கவும்",
    te: "సమస్యను వివరించండి",
    kn: "ಸಮಸ್ಯೆಯನ್ನು ವಿವರಿಸಿ",
    ml: "പ്രശ്നം വിവരിക്കുക",
  },
  submit: {
    en: "Submit grievance",
    hi: "शिकायत सबमिट करें",
    ta: "புகாரை சமர்ப்பிக்கவும்",
    te: "ఫిర్యాదు సమర్పించండి",
    kn: "ದೂರು ಸಲ್ಲಿಸಿ",
    ml: "പരാതി സമർപ്പിക്കുക",
  },
  ticketCreated: {
    en: "Ticket created",
    hi: "टिकट बनाया गया",
    ta: "டிக்கெட் உருவாக்கப்பட்டது",
    te: "టికెట్ సృష్టించబడింది",
    kn: "ಟಿಕೆಟ್ ರಚಿಸಲಾಗಿದೆ",
    ml: "ടിക്കറ്റ് സൃഷ്ടിച്ചു",
  },
  checkStatus: {
    en: "Check ticket status",
    hi: "टिकट स्थिति जांचें",
    ta: "டிக்கெட் நிலையை சரிபார்க்கவும்",
    te: "టికెట్ స్థితి చూడండి",
    kn: "ಟಿಕೆಟ್ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ",
    ml: "ടിക്കറ്റ് നില പരിശോധിക്കുക",
  },
  enterTicketId: {
    en: "Enter ticket ID",
    hi: "टिकट आईडी दर्ज करें",
    ta: "டிக்கெட் ஐடியை உள்ளிடவும்",
    te: "టికెట్ ఐడీ నమోదు చేయండి",
    kn: "ಟಿಕೆಟ್ ಐಡಿ ನಮೂದಿಸಿ",
    ml: "ടിക്കറ്റ് ഐഡി നൽകുക",
  },
  status_open: {
    en: "Open",
    hi: "खुला",
    ta: "திறந்துள்ளது",
    te: "తెరిచి ఉంది",
    kn: "ತೆರೆದಿದೆ",
    ml: "തുറന്നത്",
  },
  status_in_progress: {
    en: "In progress",
    hi: "प्रगति में",
    ta: "செயலில் உள்ளது",
    te: "పురోగతిలో ఉంది",
    kn: "ಪ್ರಗತಿಯಲ್ಲಿದೆ",
    ml: "പുരോഗതിയിൽ",
  },
  status_resolved: {
    en: "Resolved",
    hi: "हल हो गया",
    ta: "தீர்க்கப்பட்டது",
    te: "పరిష్కరించబడింది",
    kn: "ಪರಿಹರಿಸಲಾಗಿದೆ",
    ml: "പരിഹരിച്ചു",
  },
  noTicketsYet: {
    en: "No grievances filed yet on this device.",
    hi: "इस डिवाइस पर अभी तक कोई शिकायत दर्ज नहीं हुई।",
    ta: "இந்த சாதனத்தில் இதுவரை புகார் எதுவும் பதிவு செய்யப்படவில்லை.",
    te: "ఈ పరికరంలో ఇంకా ఫిర్యాదులు నమోదు కాలేదు.",
    kn: "ಈ ಸಾಧನದಲ್ಲಿ ಇನ್ನೂ ದೂರುಗಳನ್ನು ದಾಖಲಿಸಿಲ್ಲ.",
    ml: "ഈ ഉപകരണത്തിൽ ഇതുവരെ പരാതികളൊന്നും നൽകിയിട്ടില്ല.",
  },
  kioskWelcome: {
    en: "Touch a category, then speak your question",
    hi: "एक श्रेणी छुएं, फिर अपना प्रश्न बोलें",
    ta: "ஒரு வகையைத் தொடவும், பின் உங்கள் கேள்வியைப் பேசவும்",
    te: "ఒక విభాగాన్ని తాకి, ఆపై మీ ప్రశ్న అడగండి",
    kn: "ಒಂದು ವಿಭಾಗವನ್ನು ಸ್ಪರ್ಶಿಸಿ, ನಂತರ ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಕೇಳಿ",
    ml: "ഒരു വിഭാഗം സ്പർശിക്കൂ, തുടർന്ന് ചോദ്യം പറയൂ",
  },
  backHome: {
    en: "Back",
    hi: "वापस",
    ta: "பின்செல்",
    te: "వెనుకకు",
    kn: "ಹಿಂದೆ",
    ml: "തിരികെ",
  },
  yourDistrict: {
    en: "Your district",
    hi: "आपका जिला",
    ta: "உங்கள் மாவட்டம்",
    te: "మీ జిల్లా",
    kn: "ನಿಮ್ಮ ಜಿಲ್ಲೆ",
    ml: "നിങ്ങളുടെ ജില്ല",
  },
  daysToDeadline: {
    en: "days left to enroll",
    hi: "नामांकन के लिए शेष दिन",
    ta: "பதிவுக்கு மீதமுள்ள நாட்கள்",
    te: "నమోదుకు మిగిలిన రోజులు",
    kn: "ನೋಂದಣಿಗೆ ಉಳಿದ ದಿನಗಳು",
    ml: "രജിസ്റ്റർ ചെയ്യാൻ ബാക്കിയുള്ള ദിവസങ്ങൾ",
  },
  activeAlert: {
    en: "Active advisory",
    hi: "सक्रिय सलाह",
    ta: "செயலில் உள்ள அறிவிப்பு",
    te: "క్రియాశీల సూచన",
    kn: "ಸಕ್ರಿಯ ಸಲಹೆ",
    ml: "സജീവ ഉപദേശം",
  },
  claimWindowOpen: {
    en: "claim window open",
    hi: "दावा विंडो खुली है",
    ta: "உரிமைகோரல் காலம் திறந்துள்ளது",
    te: "క్లెయిమ్ గడువు తెరిచి ఉంది",
    kn: "ಕ್ಲೇಮ್ ಅವಧಿ ತೆರೆದಿದೆ",
    ml: "ക്ലെയിം സമയം തുറന്നിരിക്കുന്നു",
  },
  noActiveAlert: {
    en: "No active peril advisory right now",
    hi: "फिलहाल कोई सक्रिय आपदा सलाह नहीं",
    ta: "தற்போது செயலில் ஆபத்து அறிவிப்பு இல்லை",
    te: "ప్రస్తుతం ఎలాంటి ప్రమాద సూచన లేదు",
    kn: "ಸದ್ಯಕ್ಕೆ ಯಾವುದೇ ಅಪಾಯ ಸಲಹೆ ಇಲ್ಲ",
    ml: "ഇപ്പോൾ അപകട ഉപദേശമൊന്നുമില്ല",
  },
  startClaimNow: {
    en: "Start PMFBY claim now",
    hi: "अभी पीएमएफबीवाई दावा शुरू करें",
    ta: "இப்போது பிஎம்எஃப்பிவை உரிமைகோரலைத் தொடங்கு",
    te: "ఇప్పుడే PMFBY క్లెయిమ్ ప్రారంభించండి",
    kn: "ಈಗಲೇ PMFBY ಕ್ಲೇಮ್ ಆರಂಭಿಸಿ",
    ml: "ഇപ്പോൾ PMFBY ക്ലെയിം ആരംഭിക്കൂ",
  },
  transparencyTitle: {
    en: "Your district at a glance — last season",
    hi: "आपका जिला एक नज़र में — पिछला मौसम",
    ta: "உங்கள் மாவட்டம் ஒரு பார்வையில் — கடந்த பருவம்",
    te: "మీ జిల్లా ఒక చూపులో — గత సీజన్",
    kn: "ನಿಮ್ಮ ಜಿಲ್ಲೆ ಒಂದು ನೋಟದಲ್ಲಿ — ಕಳೆದ ಋತು",
    ml: "നിങ്ങളുടെ ജില്ല ഒറ്റനോട്ടത്തിൽ — കഴിഞ്ഞ സീസൺ",
  },
  approvalRate: {
    en: "Claims approved",
    hi: "स्वीकृत दावे",
    ta: "ஒப்புதல் பெற்ற உரிமைகோரல்கள்",
    te: "ఆమోదించిన క్లెయిమ్‌లు",
    kn: "ಅನುಮೋದಿತ ಕ್ಲೇಮ್‌ಗಳು",
    ml: "അംഗീകരിച്ച ക്ലെയിമുകൾ",
  },
  medianPayout: {
    en: "Median payout",
    hi: "औसत भुगतान",
    ta: "சராசரி கொடுப்பனவு",
    te: "సగటు చెల్లింపు",
    kn: "ಮಧ್ಯಮ ಪಾವತಿ",
    ml: "ശരാശരി പേയ്ഔട്ട്",
  },
  medianSettlement: {
    en: "Median settlement time",
    hi: "औसत निपटान समय",
    ta: "சராசரி தீர்வு நேரம்",
    te: "సగటు పరిష్కార సమయం",
    kn: "ಮಧ್ಯಮ ಇತ್ಯರ್ಥ ಸಮಯ",
    ml: "ശരാശരി തീർപ്പാക്കൽ സമയം",
  },
  simulateOutreach: {
    en: "Simulate proactive outreach",
    hi: "सक्रिय आउटरीच का अनुकरण करें",
    ta: "செயலூக்க தொடர்பை உருவகப்படுத்து",
    te: "ముందస్తు సమాచార ప్రసారాన్ని అనుకరించండి",
    kn: "ಪೂರ್ವಭಾವಿ ಸಂಪರ್ಕವನ್ನು ಅನುಕರಿಸಿ",
    ml: "മുൻകൂർ ബന്ധപ്പെടൽ അനുകരിക്കുക",
  },
  outreachPreview: {
    en: "Auto-sent IVR / SMS preview",
    hi: "स्वतः भेजा गया आईवीआर / एसएमएस पूर्वावलोकन",
    ta: "தானாக அனுப்பப்பட்ட ஐவிஆர் / எஸ்எம்எஸ் முன்னோட்டம்",
    te: "స్వయంచాలకంగా పంపిన IVR / SMS ప్రివ్యూ",
    kn: "ಸ್ವಯಂಚಾಲಿತ IVR / SMS ಪೂರ್ವವೀಕ್ಷಣೆ",
    ml: "സ്വയമേവ അയച്ച IVR / SMS പ്രിവ്യൂ",
  },
  novelHeading: {
    en: "How this differs from the National Cooperative Database",
    hi: "यह राष्ट्रीय सहकारी डेटाबेस से कैसे अलग है",
    ta: "இது தேசிய கூட்டுறவு தரவுத்தளத்திலிருந்து எவ்வாறு வேறுபடுகிறது",
    te: "ఇది జాతీయ సహకార డేటాబేస్ నుండి ఎలా భిన్నంగా ఉంటుంది",
    kn: "ಇದು ರಾಷ್ಟ್ರೀಯ ಸಹಕಾರಿ ಡೇಟಾಬೇಸ್‌ನಿಂದ ಹೇಗೆ ಭಿನ್ನವಾಗಿದೆ",
    ml: "ഇത് ദേശീയ സഹകരണ ഡാറ്റാബേസിൽ നിന്ന് എങ്ങനെ വ്യത്യസ്തമാണ്",
  },
  listenReply: {
    en: "Play reply aloud",
    hi: "उत्तर सुनाएं",
    ta: "பதிலைப் படித்துக்காட்டு",
    te: "సమాధానాన్ని వినిపించు",
    kn: "ಉತ್ತರವನ್ನು ಕೇಳಿಸಿ",
    ml: "മറുപടി വായിച്ചു കേൾപ്പിക്കൂ",
  },
  stopReply: {
    en: "Stop",
    hi: "रोकें",
    ta: "நிறுத்து",
    te: "ఆపు",
    kn: "ನಿಲ್ಲಿಸಿ",
    ml: "നിർത്തുക",
  },
};

/**
 * Interface string lookup with English fallback.
 *
 * Answers are model-generated and therefore available in every supported
 * language immediately; hand-translated chrome lags behind. Falling back to
 * English keeps a newly added language fully usable — the substance is in the
 * member's language even when a button label is not yet.
 */
export function t(key: keyof typeof STRINGS, lang: LangCode): string {
  return STRINGS[key]?.[lang] ?? STRINGS[key]?.en ?? key;
}

/**
 * Same lookup, but reports which language the string actually came back in.
 *
 * Anything handed to the speech engine must be tagged with the language it is
 * really written in. Tagging an English fallback as Telugu makes Sarvam read
 * English words with a Telugu voice, which is less intelligible than plain
 * English would have been.
 */
export function tLang(
  key: keyof typeof STRINGS,
  lang: LangCode
): { text: string; lang: LangCode } {
  const exact = STRINGS[key]?.[lang];
  if (exact) return { text: exact, lang };
  return { text: STRINGS[key]?.en ?? key, lang: "en" };
}
