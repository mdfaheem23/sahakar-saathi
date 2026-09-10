import { KnowledgeEntry } from "./types";

// Curated, versioned demo corpus — standing in for the full RAG knowledge base
// (Cooperative Societies Act + state by-laws, Ministry of Cooperation scheme
// documentation, PMFBY guidelines, grievance procedure) described in the
// solution proposal. Each entry cites its source document, and the router
// below only ever answers from this grounded set — anything outside it is
// escalated rather than guessed at.

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: "pmfby-claim-eligibility",
    agent: "pmfby",
    source: "PMFBY Operational Guidelines (Revamped, effective Kharif 2020), Clause 21.5.4.2 — Intimation and Assessment of Loss",
    keywords: {
      en: ["crop damage", "claim eligib", "pmfby claim", "insurance claim", "crop loss", "damaged crop"],
      hi: ["फसल नुकसान", "दावा", "क्लेम", "फसल बीमा", "पीएमएफबीवाई"],
      ta: ["பயிர் சேதம்", "பயிர் சேதமானது", "சேதமானது", "சேதமடைந்தது", "மழையால் சேதம்", "பயிர் நாசம்", "காப்பீட்டு உரிமை", "பிஎம்எஃப்பிவை", "உரிமைகோரல்"],
      te: ["పంట నష్టం", "క్లెయిమ్", "పంట బీమా", "బీమా క్లెయిమ్", "పంట దెబ్బతింది"],
      kn: ["ಬೆಳೆ ಹಾನಿ", "ಕ್ಲೇಮ್", "ಬೆಳೆ ವಿಮೆ", "ವಿಮಾ ಕ್ಲೇಮ್", "ಬೆಳೆ ನಷ್ಟ"],
      ml: ["വിള നാശം", "ക്ലെയിം", "വിള ഇൻഷുറൻസ്", "ഇൻഷുറൻസ് ക്ലെയിം", "കൃഷി നഷ്ടം"],
    },
    answer: {
      en: "If your notified crop is damaged by drought, flood, pest attack or a similar covered peril, you can file a PMFBY claim within 72 hours of the event via the app, CSC, or your bank/insurer helpline. Eligibility requires: (1) the crop was insured before the cut-off date, (2) it's a notified crop for your area, and (3) loss assessment is done via Crop Cutting Experiments or (for localised risks) individual inspection. Localised risks like hailstorm and landslide can be claimed immediately without waiting for the season-end yield data.",
      hi: "यदि सूखा, बाढ़, कीट प्रकोप या ऐसे ही किसी कवर की गई आपदा से आपकी अधिसूचित फसल को नुकसान हुआ है, तो आप घटना के 72 घंटों के भीतर ऐप, सीएससी या अपने बैंक/बीमाकर्ता हेल्पलाइन के माध्यम से पीएमएफबीवाई दावा दर्ज कर सकते हैं। पात्रता के लिए आवश्यक है: (1) फसल का कट-ऑफ तिथि से पहले बीमा हो, (2) यह आपके क्षेत्र के लिए अधिसूचित फसल हो, और (3) नुकसान का आकलन फसल कटाई प्रयोगों या (स्थानीयकृत जोखिमों के लिए) व्यक्तिगत निरीक्षण से हो। ओलावृष्टि और भूस्खलन जैसे स्थानीयकृत जोखिमों का दावा मौसम के अंत के उपज आंकड़ों की प्रतीक्षा किए बिना तुरंत किया जा सकता है।",
      ta: "வறட்சி, வெள்ளம், பூச்சி தாக்குதல் அல்லது இதுபோன்ற பாதிக்கப்பட்ட ஆபத்தால் உங்கள் அறிவிக்கப்பட்ட பயிர் சேதமடைந்தால், நிகழ்வு நடந்த 72 மணி நேரத்திற்குள் ஆப், சிஎஸ்சி அல்லது உங்கள் வங்கி/காப்பீட்டாளர் உதவி எண் மூலம் பிஎம்எஃப்பிவை உரிமைகோரலை பதிவு செய்யலாம். தகுதிக்கு தேவை: (1) கட்-ஆஃப் தேதிக்கு முன் பயிர் காப்பீடு செய்யப்பட்டிருக்க வேண்டும், (2) அது உங்கள் பகுதிக்கான அறிவிக்கப்பட்ட பயிராக இருக்க வேண்டும், (3) இழப்பு மதிப்பீடு பயிர் அறுவடை பரிசோதனைகள் மூலமாகவோ அல்லது (உள்ளூர்மயமாக்கப்பட்ட ஆபத்துகளுக்கு) தனிப்பட்ட ஆய்வு மூலமாகவோ செய்யப்பட வேண்டும். ஆலங்கட்டி மழை மற்றும் நிலச்சரிவு போன்ற உள்ளூர் ஆபத்துகளுக்கு பருவகால இறுதி மகசூல் தரவுக்காக காத்திருக்காமல் உடனடியாக உரிமைகோரலாம்.",
    },
  },
  {
    id: "pmfby-enrollment-deadline",
    agent: "pmfby",
    source: "PMFBY Operational Guidelines (Revamped, effective Kharif 2020), Premium Rates table (p. 22) and Clauses 16.8-16.9 — Seasonality Discipline",
    keywords: {
      en: ["enroll", "enrolment", "deadline", "premium", "last date", "sign up", "cut-off"],
      hi: ["नामांकन", "अंतिम तिथि", "आखिरी तारीख", "आखिरी तिथि", "अंतिम तारीख", "कब तक करा सकते हैं", "कब तक", "प्रीमियम", "कट-ऑफ"],
      ta: ["பதிவு", "கடைசி தேதி", "பிரீமியம்", "கட்-ஆஃப்"],
      te: ["నమోదు", "చివరి తేదీ", "ప్రీమియం", "గడువు", "కట్-ఆఫ్"],
      kn: ["ನೋಂದಣಿ", "ಕೊನೆಯ ದಿನಾಂಕ", "ಪ್ರೀಮಿಯಂ", "ಗಡುವು", "ಕಟ್-ಆಫ್"],
      ml: ["രജിസ്ട്രേഷൻ", "അവസാന തീയതി", "പ്രീമിയം", "സമയപരിധി", "കട്ട്-ഓഫ്"],
    },
    answer: {
      en: "Enrollment cut-off dates are fixed per season (Kharif: typically end of July; Rabi: typically end of December) and vary slightly by state and crop — check your district's notified date, since a missed cut-off means no cover for that season. Farmer premium share is capped at 2% of sum insured for Kharif crops, 1.5% for Rabi crops, and 5% for commercial/horticultural crops; the rest is subsidised by Centre and State governments. Loanee farmers are auto-enrolled unless they opt out in writing before the cut-off; non-loanee farmers must enroll voluntarily through CSC, bank, or the app.",
      hi: "नामांकन की अंतिम तिथि हर मौसम के लिए निश्चित होती है (खरीफ: आमतौर पर जुलाई के अंत तक; रबी: आमतौर पर दिसंबर के अंत तक) और राज्य व फसल के अनुसार थोड़ी भिन्न होती है — अपने जिले की अधिसूचित तिथि जांच लें, क्योंकि तिथि छूटने पर उस मौसम के लिए कोई कवर नहीं मिलेगा। किसान का प्रीमियम हिस्सा खरीफ फसलों के लिए बीमित राशि का 2%, रबी फसलों के लिए 1.5%, और वाणिज्यिक/बागवानी फसलों के लिए 5% तक सीमित है; शेष राशि केंद्र और राज्य सरकारों द्वारा सब्सिडी के रूप में दी जाती है। ऋणी किसान स्वतः नामांकित हो जाते हैं जब तक वे अंतिम तिथि से पहले लिखित रूप में इनकार न करें; गैर-ऋणी किसानों को सीएससी, बैंक या ऐप के माध्यम से स्वेच्छा से नामांकन करना होगा।",
      ta: "பதிவு செய்வதற்கான கடைசி தேதி ஒவ்வொரு பருவத்திற்கும் நிர்ணயிக்கப்படுகிறது (காரிஃப்: பொதுவாக ஜூலை இறுதி; ரபி: பொதுவாக டிசம்பர் இறுதி) மற்றும் மாநிலம் மற்றும் பயிரைப் பொறுத்து சிறிது மாறுபடும் — உங்கள் மாவட்டத்தின் அறிவிக்கப்பட்ட தேதியை சரிபார்க்கவும், ஏனெனில் கடைசி தேதி தவறினால் அந்த பருவத்திற்கு காப்பீடு கிடைக்காது. விவசாயியின் பிரீமியம் பங்கு காரிஃப் பயிர்களுக்கு காப்பீட்டுத் தொகையில் 2%, ரபி பயிர்களுக்கு 1.5%, வணிக/தோட்டக்கலை பயிர்களுக்கு 5% என வரம்பிடப்பட்டுள்ளது; மீதமுள்ளதை மத்திய மற்றும் மாநில அரசுகள் மானியமாக வழங்குகின்றன. கடன் பெற்ற விவசாயிகள் தானாகவே பதிவு செய்யப்படுவார்கள், கடைசி தேதிக்கு முன் எழுத்துப்பூர்வமாக விலகிக்கொள்ளாத வரை; கடன் இல்லாத விவசாயிகள் சிஎஸ்சி, வங்கி அல்லது ஆப் மூலம் தானாக முன்வந்து பதிவு செய்ய வேண்டும்.",
    },
  },
  {
    id: "pmfby-documents",
    agent: "pmfby",
    source: "PMFBY Operational Guidelines (Revamped, effective Kharif 2020) — Enrolment Documentation",
    keywords: {
      en: ["document", "papers required", "kyc", "what do i need", "land record"],
      hi: ["दस्तावेज़", "दस्तावेज", "कागजात", "कागज़", "कागज", "कौन से कागज़", "क्या कागज़ लगेंगे", "केवाईसी", "भूमि रिकॉर्ड", "खसरा खतौनी", "बुवाई प्रमाण"],
      ta: ["ஆவணங்கள்", "ஆவணம்", "என்ன ஆவணங்கள்", "என்ன ஆவணம் தேவை", "ஆவணங்கள் தேவை", "காப்பீடு கோர ஆவணங்கள்", "பயிர் காப்பீடு ஆவணங்கள்", "நிலப் பதிவு", "பட்டா", "கேஒய்சி", "விதைப்புச் சான்றிதழ்"],
      te: ["పత్రాలు", "డాక్యుమెంట్లు", "కేవైసీ", "భూమి రికార్డు", "ఏమి కావాలి", "ఏ పత్రాలు", "పత్రాలు కావాలి"],
      kn: ["ದಾಖಲೆಗಳು", "ಡಾಕ್ಯುಮೆಂಟ್", "ಕೆವೈಸಿ", "ಭೂ ದಾಖಲೆ", "ಏನು ಬೇಕು", "ಯಾವ ದಾಖಲೆಗಳು", "ದಾಖಲೆಗಳು ಬೇಕು"],
      ml: ["രേഖകൾ", "ഡോക്യുമെന്റ്", "കെവൈസി", "ഭൂരേഖ", "എന്ത് വേണം", "ഏത് രേഖകൾ", "രേഖകൾ വേണം"],
    },
    answer: {
      en: "For a PMFBY claim you'll need: Aadhaar card, bank passbook (for the account linked to the claim), land ownership/tenancy record (7/12 extract or state equivalent), sowing certificate, and — if applicable — the loan sanction letter from your PACS or bank. Kiosk and IVR channels can guide you to the nearest CSC if you're missing any document.",
      hi: "पीएमएफबीवाई दावे के लिए आपको चाहिए: आधार कार्ड, बैंक पासबुक (दावे से जुड़े खाते के लिए), भूमि स्वामित्व/काश्तकारी रिकॉर्ड (7/12 उद्धरण या राज्य समकक्ष), बुवाई प्रमाण पत्र, और — यदि लागू हो — आपके पीएसीएस या बैंक से ऋण स्वीकृति पत्र। यदि आपके पास कोई दस्तावेज़ नहीं है तो कियोस्क और आईवीआर चैनल आपको निकटतम सीएससी तक मार्गदर्शन कर सकते हैं।",
      ta: "பிஎம்எஃப்பிவை உரிமைகோரலுக்கு உங்களுக்கு தேவை: ஆதார் அட்டை, வங்கி பாஸ்புக் (உரிமைகோரலுடன் இணைக்கப்பட்ட கணக்கு), நில உரிமை/குத்தகை பதிவு (7/12 பிரதி அல்லது மாநில சமானம்), விதைப்பு சான்றிதழ், மற்றும் — பொருந்தினால் — உங்கள் பாக்ஸ் அல்லது வங்கியிடமிருந்து கடன் அனுமதி கடிதம். ஏதேனும் ஆவணம் இல்லையெனில் கியோஸ்க் மற்றும் ஐவிஆர் சேனல்கள் அருகிலுள்ள சிஎஸ்சிக்கு உங்களை வழிநடத்தும்.",
    },
  },
  {
    id: "schemes-overview",
    agent: "schemes",
    source: "Ministry of Cooperation — Scheme Directory (consolidated)",
    keywords: {
      en: ["scheme", "subsidy", "which schemes", "benefits available", "government scheme"],
      hi: ["योजना", "सब्सिडी", "कौन सी योजनाएं", "सरकारी योजना"],
      ta: ["திட்டம்", "மானியம்", "அரசு திட்டம்"],
      te: ["పథకం", "పథకాలు", "ప్రయోజనం", "సబ్సిడీ", "ప్రభుత్వ పథకం"],
      kn: ["ಯೋಜನೆ", "ಯೋಜನೆಗಳು", "ಪ್ರಯೋಜನ", "ಸಬ್ಸಿಡಿ", "ಸರ್ಕಾರಿ ಯೋಜನೆ"],
      ml: ["പദ്ധതി", "പദ്ധതികൾ", "ആനുകൂല്യം", "സബ്സിഡി", "സർക്കാർ പദ്ധതി"],
    },
    answer: {
      en: "Ministry of Cooperation schemes currently active for PACS members include: computerisation support for PACS (to digitise records and offer more services), the National Cooperative Database, interest subvention on short-term crop loans, and warehouse/godown subsidy schemes for storage infrastructure. Eligibility and application windows differ by scheme — tell me which one you're asking about and I'll pull the exact criteria.",
      hi: "पीएसीएस सदस्यों के लिए वर्तमान में सक्रिय सहकारिता मंत्रालय की योजनाओं में शामिल हैं: पीएसीएस के कम्प्यूटरीकरण का समर्थन (रिकॉर्ड डिजिटाइज़ करने और अधिक सेवाएं प्रदान करने के लिए), राष्ट्रीय सहकारी डेटाबेस, अल्पकालिक फसल ऋणों पर ब्याज सहायता, और भंडारण अवसंरचना के लिए गोदाम सब्सिडी योजनाएं। पात्रता और आवेदन की समय-सीमा योजना के अनुसार भिन्न होती है — बताएं आप किस योजना के बारे में पूछ रहे हैं, मैं सटीक मानदंड बताऊंगा।",
      ta: "பாக்ஸ் உறுப்பினர்களுக்கு தற்போது செயலில் உள்ள கூட்டுறவு அமைச்சக திட்டங்களில் அடங்குபவை: பாக்ஸ் கணினிமயமாக்கல் ஆதரவு (பதிவுகளை டிஜிட்டல் மயமாக்க), தேசிய கூட்டுறவு தரவுத்தளம், குறுகிய கால பயிர் கடன்களுக்கான வட்டி மானியம், மற்றும் சேமிப்பு உள்கட்டமைப்புக்கான கிடங்கு மானிய திட்டங்கள். தகுதி மற்றும் விண்ணப்ப காலம் திட்டத்திற்கு ஏற்ப மாறுபடும் — எந்த திட்டத்தைப் பற்றி கேட்கிறீர்கள் என்று சொல்லுங்கள், சரியான அளவுகோல்களை தருகிறேன்.",
    },
  },
  {
    id: "schemes-kcc-loan",
    agent: "schemes",
    source: "Ministry of Cooperation — Kisan Credit Card via PACS Circular",
    keywords: {
      en: ["kcc", "kisan credit card", "loan through pacs", "short term loan", "credit"],
      hi: ["केसीसी", "किसान क्रेडिट कार्ड", "पीएसीएस ऋण", "अल्पकालिक ऋण"],
      ta: ["கேசிசி", "விவசாயி கடன் அட்டை", "பாக்ஸ் கடன்"],
      te: ["కిసాన్ క్రెడిట్ కార్డు", "కేసీసీ", "రుణం", "అప్పు", "వడ్డీ"],
      kn: ["ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್", "ಕೆಸಿಸಿ", "ಸಾಲ", "ಬಡ್ಡಿ", "ಸಾಲದ ಬಡ್ಡಿ"],
      ml: ["കിസാൻ ക്രെഡിറ്റ് കാർഡ്", "കെസിസി", "വായ്പ", "ലോൺ", "പലിശ"],
    },
    answer: {
      en: "PACS-linked Kisan Credit Card loans offer short-term crop credit at a subsidised interest rate (effective 4% p.a. for prompt repayers, after interest subvention). Apply through your PACS with land record, Aadhaar, and a no-dues certificate from any other lending institution. Sanction typically takes 2–3 weeks; renewal is simpler if repayment history is clean.",
      hi: "पीएसीएस से जुड़े किसान क्रेडिट कार्ड ऋण सब्सिडी वाली ब्याज दर पर अल्पकालिक फसल ऋण प्रदान करते हैं (समय पर भुगतान करने वालों के लिए ब्याज सहायता के बाद प्रभावी 4% प्रति वर्ष)। भूमि रिकॉर्ड, आधार और किसी अन्य ऋण संस्था से नो-ड्यूज़ प्रमाण पत्र के साथ अपने पीएसीएस के माध्यम से आवेदन करें। स्वीकृति में आमतौर पर 2-3 सप्ताह लगते हैं; भुगतान इतिहास साफ होने पर नवीनीकरण आसान होता है।",
      ta: "பாக்ஸ் இணைந்த விவசாயி கடன் அட்டை கடன்கள் மானியம் பெற்ற வட்டி விகிதத்தில் குறுகிய கால பயிர் கடனை வழங்குகின்றன (சரியான நேரத்தில் திரும்பச் செலுத்துபவர்களுக்கு வட்டி மானியத்திற்குப் பிறகு ஆண்டுக்கு 4%). நில பதிவு, ஆதார் மற்றும் வேறு எந்த கடன் நிறுவனத்திடமிருந்தும் நோ-டியூஸ் சான்றிதழுடன் உங்கள் பாக்ஸ் மூலம் விண்ணப்பிக்கவும். ஒப்புதல் பொதுவாக 2-3 வாரங்கள் ஆகும்; திருப்பிச் செலுத்தும் வரலாறு தெளிவாக இருந்தால் புதுப்பித்தல் எளிதாகும்.",
    },
  },
  {
    id: "law-member-rights",
    agent: "cooperative_law",
    source: "Cooperative Societies Act, Sec. 27 — Rights of Members",
    keywords: {
      en: ["member rights", "my rights", "entitlement", "what can i do as a member"],
      hi: ["सदस्य अधिकार", "मेरे अधिकार", "हकदारी"],
      ta: ["உறுப்பினர் உரிமைகள்", "எனது உரிமைகள்"],
      te: ["సభ్యుని హక్కులు", "హక్కులు", "సభ్యత్వం", "ఓటు హక్కు"],
      kn: ["ಸದಸ್ಯರ ಹಕ್ಕುಗಳು", "ಹಕ್ಕುಗಳು", "ಸದಸ್ಯತ್ವ", "ಮತದಾನದ ಹಕ್ಕು"],
      ml: ["അംഗത്തിന്റെ അവകാശങ്ങൾ", "അവകാശങ്ങൾ", "അംഗത്വം", "വോട്ടവകാശം"],
    },
    answer: {
      en: "As a registered PACS member you have the right to: vote in general body meetings and elections, inspect the society's records and annual accounts (on written request), receive your share of surplus/dividend, access credit and services on equal terms with other members, and raise a resolution or grievance at the general body meeting. These rights are protected under the Cooperative Societies Act and cannot be denied by internal PACS policy.",
      hi: "एक पंजीकृत पीएसीएस सदस्य के रूप में आपको अधिकार है: सामान्य निकाय बैठकों और चुनावों में मतदान करने का, सोसाइटी के रिकॉर्ड और वार्षिक खातों का निरीक्षण करने का (लिखित अनुरोध पर), अधिशेष/लाभांश में अपना हिस्सा प्राप्त करने का, अन्य सदस्यों के समान शर्तों पर ऋण और सेवाओं तक पहुंच का, और सामान्य निकाय बैठक में प्रस्ताव या शिकायत उठाने का। ये अधिकार सहकारी समिति अधिनियम के तहत संरक्षित हैं और आंतरिक पीएसीएस नीति द्वारा इन्हें अस्वीकार नहीं किया जा सकता।",
      ta: "பதிவு செய்யப்பட்ட பாக்ஸ் உறுப்பினராக உங்களுக்கு உரிமை உள்ளது: பொதுக் குழு கூட்டங்கள் மற்றும் தேர்தல்களில் வாக்களிக்க, சங்கத்தின் பதிவுகள் மற்றும் ஆண்டு கணக்குகளை ஆய்வு செய்ய (எழுத்துப்பூர்வ கோரிக்கையின் பேரில்), உபரி/பங்கிலாபத்தில் உங்கள் பங்கைப் பெற, மற்ற உறுப்பினர்களுடன் சம நிபந்தனைகளில் கடன் மற்றும் சேவைகளை அணுக, மற்றும் பொதுக் குழு கூட்டத்தில் தீர்மானம் அல்லது புகார் எழுப்ப. இந்த உரிமைகள் கூட்டுறவு சங்கங்கள் சட்டத்தின் கீழ் பாதுகாக்கப்படுகின்றன, உள் பாக்ஸ் கொள்கையால் மறுக்க முடியாது.",
    },
  },
  {
    id: "law-elections",
    agent: "cooperative_law",
    source: "State Cooperative Societies By-laws, Model Clause 19 — Elections",
    keywords: {
      en: ["election", "voting", "board member", "how to become", "committee"],
      hi: ["चुनाव", "मतदान", "बोर्ड सदस्य", "समिति"],
      ta: ["தேர்தல்", "வாக்களிப்பு", "வாரிய உறுப்பினர்", "குழு"],
      te: ["ఎన్నికలు", "ఎన్నిక", "బోర్డు ఎన్నిక", "పాలక వర్గం"],
      kn: ["ಚುನಾವಣೆ", "ಚುನಾವಣೆಗಳು", "ಮಂಡಳಿ ಚುನಾವಣೆ", "ಆಡಳಿತ ಮಂಡಳಿ"],
      ml: ["തിരഞ്ഞെടുപ്പ്", "ബോർഡ് തിരഞ്ഞെടുപ്പ്", "ഭരണസമിതി"],
    },
    answer: {
      en: "PACS managing committee elections are held every 5 years (as per most state model by-laws) under the supervision of the state Cooperative Election Authority. Any member in good standing (no loan default, minimum membership duration as specified in your state by-law — usually 1 year) can contest. Notice of election must be given at least 30 days in advance, and any member can challenge an irregularity within 15 days of results being declared.",
      hi: "पीएसीएस प्रबंध समिति के चुनाव राज्य सहकारी चुनाव प्राधिकरण की देखरेख में हर 5 वर्ष में होते हैं (अधिकांश राज्य मॉडल उपनियमों के अनुसार)। अच्छी स्थिति वाला कोई भी सदस्य (कोई ऋण चूक नहीं, आपके राज्य के उपनियम में निर्दिष्ट न्यूनतम सदस्यता अवधि — आमतौर पर 1 वर्ष) चुनाव लड़ सकता है। चुनाव की सूचना कम से कम 30 दिन पहले दी जानी चाहिए, और परिणाम घोषित होने के 15 दिनों के भीतर कोई भी सदस्य किसी अनियमितता को चुनौती दे सकता है।",
      ta: "பாக்ஸ் நிர்வாகக் குழு தேர்தல்கள் மாநில கூட்டுறவு தேர்தல் ஆணையத்தின் மேற்பார்வையில் ஒவ்வொரு 5 ஆண்டுகளுக்கும் நடத்தப்படுகின்றன (பெரும்பாலான மாநில மாதிரி துணைச் சட்டங்களின்படி). நல்ல நிலையில் உள்ள எந்த உறுப்பினரும் (கடன் தவறு இல்லை, உங்கள் மாநில துணைச்சட்டத்தில் குறிப்பிடப்பட்ட குறைந்தபட்ச உறுப்பினர் காலம் — பொதுவாக 1 ஆண்டு) போட்டியிடலாம். தேர்தல் அறிவிப்பு குறைந்தது 30 நாட்களுக்கு முன் வழங்கப்பட வேண்டும், முடிவுகள் அறிவிக்கப்பட்ட 15 நாட்களுக்குள் எந்த உறுப்பினரும் முறைகேட்டை எதிர்க்கலாம்.",
    },
  },
  {
    id: "law-inspect-records",
    agent: "cooperative_law",
    source: "Cooperative Societies Act, Sec. 33 — Inspection of Records",
    keywords: {
      en: ["inspect records", "see accounts", "audit report", "transparency"],
      hi: ["रिकॉर्ड निरीक्षण", "खाते देखना", "हिसाब देखना", "हिसाब-किताब", "हिसाब किताब", "बही खाता", "सोसाइटी का हिसाब", "ऑडिट रिपोर्ट"],
      ta: ["பதிவுகள் ஆய்வு", "கணக்குகள் பார்வை", "தணிக்கை அறிக்கை"],
      te: ["రికార్డులు చూడటం", "ఖాతాలు", "తనిఖీ", "పుస్తకాలు చూడాలి"],
      kn: ["ದಾಖಲೆ ನೋಡುವುದು", "ಲೆಕ್ಕಪತ್ರ", "ಪರಿಶೀಲನೆ", "ಪುಸ್ತಕ ನೋಡು"],
      ml: ["രേഖകൾ പരിശോധിക്കൽ", "കണക്കുകൾ", "പരിശോധന", "പുസ്തകം കാണണം"],
    },
    answer: {
      en: "Any member can submit a written request to the PACS secretary to inspect the society's books of account, audit reports, and general body meeting minutes. The society must make these available within 15 working days at the registered office, free of charge for the first inspection in a financial year. Refusal can be escalated to the Registrar of Cooperative Societies.",
      hi: "कोई भी सदस्य सोसाइटी के लेखा-बही, ऑडिट रिपोर्ट और सामान्य निकाय बैठक के कार्यवृत्त का निरीक्षण करने के लिए पीएसीएस सचिव को लिखित अनुरोध दे सकता है। सोसाइटी को वित्तीय वर्ष में पहले निरीक्षण के लिए निःशुल्क, पंजीकृत कार्यालय में 15 कार्य दिवसों के भीतर इन्हें उपलब्ध कराना होगा। मना करने पर सहकारी समिति रजिस्ट्रार के पास मामला बढ़ाया जा सकता है।",
      ta: "எந்த உறுப்பினரும் சங்கத்தின் கணக்கு புத்தகங்கள், தணிக்கை அறிக்கைகள் மற்றும் பொதுக் குழு கூட்ட நிமிடங்களை ஆய்வு செய்ய பாக்ஸ் செயலாளருக்கு எழுத்துப்பூர்வ கோரிக்கை சமர்ப்பிக்கலாம். நிதியாண்டில் முதல் ஆய்விற்கு கட்டணமின்றி, பதிவு செய்யப்பட்ட அலுவலகத்தில் 15 வேலை நாட்களுக்குள் சங்கம் இவற்றை கிடைக்கச் செய்ய வேண்டும். மறுப்பு கூட்டுறவு சங்கங்களின் பதிவாளரிடம் மேல்முறையீடு செய்யப்படலாம்.",
    },
  },
  {
    id: "grievance-how-to-file",
    agent: "grievance",
    source: "PACS Grievance Redressal Procedure, Ministry of Cooperation Circular",
    keywords: {
      en: ["file a complaint", "grievance", "how to complain", "report issue", "dispute"],
      hi: ["शिकायत दर्ज", "शिकायत कैसे करें", "समस्या", "विवाद"],
      ta: ["புகார் பதிவு", "புகார் செய்வது எப்படி", "பிரச்சனை", "தகராறு"],
      te: ["ఫిర్యాదు", "కంప్లైంట్", "ఫిర్యాదు నమోదు", "ఎలా ఫిర్యాదు చేయాలి"],
      kn: ["ದೂರು", "ಕಂಪ್ಲೇಂಟ್", "ದೂರು ದಾಖಲಿಸು", "ಹೇಗೆ ದೂರು ನೀಡುವುದು"],
      ml: ["പരാതി", "കംപ്ലയിന്റ്", "പരാതി നൽകുക", "എങ്ങനെ പരാതിപ്പെടാം"],
    },
    answer: {
      en: "I can file a structured grievance for you right now — I'll need your name, phone number, PACS name, the category (loan/claim/by-law/service/other), and a short description. You'll get a ticket ID immediately and can check its status anytime by voice, text, or at the kiosk. Would you like to file one now?",
      hi: "मैं अभी आपके लिए एक संरचित शिकायत दर्ज कर सकता हूं — मुझे आपका नाम, फोन नंबर, पीएसीएस का नाम, श्रेणी (ऋण/दावा/उपनियम/सेवा/अन्य), और संक्षिप्त विवरण चाहिए। आपको तुरंत एक टिकट आईडी मिलेगी और आप किसी भी समय आवाज़, टेक्स्ट या कियोस्क पर इसकी स्थिति जांच सकते हैं। क्या आप अभी एक दर्ज करना चाहेंगे?",
      ta: "நான் இப்போதே உங்களுக்காக ஒரு கட்டமைக்கப்பட்ட புகாரை பதிவு செய்யலாம் — உங்கள் பெயர், தொலைபேசி எண், பாக்ஸ் பெயர், வகை (கடன்/உரிமைகோரல்/துணைச்சட்டம்/சேவை/மற்றவை), மற்றும் ஒரு சிறு விளக்கம் தேவை. உடனடியாக ஒரு டிக்கெட் ஐடி கிடைக்கும், மேலும் எந்த நேரத்திலும் குரல், உரை அல்லது கியோஸ்கில் அதன் நிலையை சரிபார்க்கலாம். இப்போது ஒன்றைப் பதிவு செய்ய விரும்புகிறீர்களா?",
    },
  },
  {
    id: "grievance-check-status",
    agent: "grievance",
    source: "PACS Grievance Redressal Procedure, Ministry of Cooperation Circular",
    keywords: {
      en: ["check status", "track ticket", "grievance status", "my complaint status"],
      hi: ["स्थिति जांचें", "टिकट ट्रैक", "शिकायत की स्थिति"],
      ta: ["நிலை சரிபார்", "டிக்கெட் கண்காணிப்பு", "புகார் நிலை"],
      te: ["స్థితి", "టికెట్ స్థితి", "ఏమైంది", "ఫిర్యాదు స్థితి"],
      kn: ["ಸ್ಥಿತಿ", "ಟಿಕೆಟ್ ಸ್ಥಿತಿ", "ಏನಾಯಿತು", "ದೂರಿನ ಸ್ಥಿತಿ"],
      ml: ["നില", "ടിക്കറ്റ് നില", "എന്തായി", "പരാതിയുടെ നില"],
    },
    answer: {
      en: "Open the Grievance section and enter your ticket ID (or phone number) to see the live status — open, in progress, or resolved — along with the assigned PACS officer and days elapsed. Tickets open beyond 15 days are automatically escalated to the district cooperative office.",
      hi: "स्थिति देखने के लिए शिकायत अनुभाग खोलें और अपनी टिकट आईडी (या फोन नंबर) दर्ज करें — खुली, प्रगति में, या हल हो गई — साथ ही नियुक्त पीएसीएस अधिकारी और बीते दिनों की जानकारी। 15 दिनों से अधिक खुले टिकट स्वतः जिला सहकारी कार्यालय को भेज दिए जाते हैं।",
      ta: "நிலையைப் பார்க்க புகார் பிரிவைத் திறந்து உங்கள் டிக்கெட் ஐடி (அல்லது தொலைபேசி எண்) உள்ளிடவும் — திறந்திருக்கிறது, செயலில் உள்ளது, அல்லது தீர்க்கப்பட்டது — நியமிக்கப்பட்ட பாக்ஸ் அதிகாரி மற்றும் கடந்த நாட்களுடன். 15 நாட்களுக்கு மேல் திறந்திருக்கும் டிக்கெட்டுகள் தானாக மாவட்ட கூட்டுறவு அலுவலகத்திற்கு அனுப்பப்படும்.",
    },
  },
];
