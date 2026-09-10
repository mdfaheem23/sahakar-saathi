import { KNOWLEDGE_BASE } from "./knowledge";
import { AgentId, KnowledgeEntry, LangCode, LocalizedText } from "./types";

export interface RouteResult {
  matched: boolean;
  agent: AgentId | null;
  entry: KnowledgeEntry | null;
  score: number;
}

// Every supported language, not just the three the corpus was first written
// in: this is the offline kiosk path, so a Telugu speaker with no connectivity
// has nothing else to fall back on.
const GRIEVANCE_TRIGGERS = [
  "complain", "complaint", "grievance", "file a",
  "शिकायत",
  "புகார்",
  "ఫిర్యాదు", "కంప్లైంట్",
  "ದೂರು", "ಕಂಪ್ಲೇಂಟ್",
  "പരാതി", "കംപ്ലയിന്റ്",
];

/**
 * Standing in for the LangGraph intent-classification router: scores the
 * query against every knowledge entry's keyword list (query language first,
 * English as a secondary signal for mixed-language input) and returns the
 * single best grounded match. No match => the caller escalates instead of
 * letting a model free-generate an answer.
 */
export function routeQuery(query: string, lang: LangCode): RouteResult {
  const q = query.toLowerCase().trim();

  if (!q) {
    return { matched: false, agent: null, entry: null, score: 0 };
  }

  let best: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    const primaryKeywords = entry.keywords[lang] ?? [];
    const englishKeywords = entry.keywords.en;

    // Weighted by the length of the keyword that matched, so a specific term
    // beats an incidental one. "నేను ఫిర్యాదు ఎలా నమోదు చేయాలి" (how do I file
    // a grievance) contains both the grievance noun and the generic verb for
    // "register", which is also an enrolment keyword; with every match worth a
    // flat 3 the two tied and the question was answered with crop-insurance
    // enrolment deadlines.
    for (const kw of primaryKeywords) {
      if (q.includes(kw.toLowerCase())) score += 3 * kw.length;
    }
    for (const kw of englishKeywords) {
      if (q.includes(kw.toLowerCase())) score += 2 * kw.length;
    }

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best && bestScore > 0) {
    return { matched: true, agent: best.agent, entry: best, score: bestScore };
  }

  const looksLikeGrievance = GRIEVANCE_TRIGGERS.some((t) => q.includes(t));
  if (looksLikeGrievance) {
    return { matched: false, agent: "grievance", entry: null, score: 0 };
  }

  return { matched: false, agent: null, entry: null, score: 0 };
}

export const AGENT_LABELS: Record<AgentId, LocalizedText> = {
  cooperative_law: {
    en: "Cooperative Law / By-laws Agent",
    hi: "सहकारी कानून / उपनियम एजेंट",
    ta: "கூட்டுறவு சட்டம் / துணைச்சட்ட முகவர்",
    te: "సహకార చట్టం / ఉప-చట్టాల ఏజెంట్",
    kn: "ಸಹಕಾರಿ ಕಾನೂನು / ಉಪ-ನಿಯಮಗಳ ಏಜೆಂಟ್",
    ml: "സഹകരണ നിയമം / ഉപനിയമ ഏജന്റ്",
  },
  schemes: {
    en: "Schemes / PACS Services Agent",
    hi: "योजना / पीएसीएस सेवा एजेंट",
    ta: "திட்டங்கள் / பாக்ஸ் சேவை முகவர்",
    te: "పథకాలు / PACS సేవల ఏజెంట్",
    kn: "ಯೋಜನೆಗಳು / PACS ಸೇವೆಗಳ ಏಜೆಂಟ್",
    ml: "പദ്ധതികൾ / PACS സേവന ഏജന്റ്",
  },
  pmfby: {
    en: "PMFBY / Agri Support Agent",
    hi: "पीएमएफबीवाई / कृषि सहायता एजेंट",
    ta: "பிஎம்எஃப்பிவை / விவசாய ஆதரவு முகவர்",
    te: "PMFBY / వ్యవసాయ సహాయ ఏజెంట్",
    kn: "PMFBY / ಕೃಷಿ ಬೆಂಬಲ ಏಜೆಂಟ್",
    ml: "PMFBY / കാർഷിക പിന്തുണാ ഏജന്റ്",
  },
  grievance: {
    en: "Grievance Redressal Agent",
    hi: "शिकायत निवारण एजेंट",
    ta: "புகார் தீர்வு முகவர்",
    te: "ఫిర్యాదు పరిష్కార ఏజెంట్",
    kn: "ದೂರು ಪರಿಹಾರ ಏಜೆಂಟ್",
    ml: "പരാതി പരിഹാര ഏജന്റ്",
  },
};
