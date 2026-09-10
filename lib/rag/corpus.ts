import { KNOWLEDGE_BASE } from "../knowledge";
import { MYTHS } from "../myths";
import { ENTITLEMENTS } from "../entitlements";
import { AgentId, LangCode, LocalizedText } from "../types";
import { SUPPORTED_LANGS } from "../i18n";
import { GOV_PASSAGES } from "./govSources";
import { STATE_PASSAGES } from "./stateSchemes";

/**
 * Retrieval corpus.
 *
 * Assembled from the same structured sources the rest of the app renders, so
 * there is exactly one place a legal fact lives. If a clause is corrected in
 * knowledge.ts it is corrected in retrieval too — no drifting second copy.
 *
 * Each chunk carries its own citation. Generation is required to cite, so a
 * chunk without a real source line is a bug, not a cosmetic omission.
 */
export interface Chunk {
  id: string;
  /** English body — what gets embedded and BM25-indexed. */
  text: string;
  /** Cross-lingual surface forms, folded into the sparse index. */
  aliases: string[];
  source: string;
  agent: AgentId;
  /** Pre-written answers per language, used as fallback when no LLM key. */
  canned?: LocalizedText;
  /** Where the source document was retrieved from, when it was checked. */
  url?: string;
  /** ISO date this passage was last verified against its source document. */
  verifiedOn?: string;
  /** ISO date after which this passage is known not to apply, when known. */
  validTill?: string;
  /** Set on state-specific passages, so retrieval can prefer the member's own state. */
  state?: string;
}

function stripLang(v: LocalizedText): string {
  return v.en;
}

/**
 * Flattens a per-language keyword map into one alias list.
 *
 * Folds every language in SUPPORTED_LANGS rather than a hardcoded few. The
 * previous version listed en/hi/ta by hand, so a question typed in Telugu,
 * Kannada or Malayalam contributed nothing to the sparse index and scored
 * zero on the lexical side of retrieval — which, whenever semantic retrieval
 * was unavailable, meant the member was told to see a PACS officer for a
 * question the corpus could answer.
 */
function foldKeywords(keywords: Partial<Record<LangCode, string[]>>): string[] {
  const out: string[] = [];
  for (const lang of SUPPORTED_LANGS) {
    for (const kw of keywords[lang] ?? []) {
      if (kw.trim()) out.push(kw);
    }
  }
  return out;
}

/** Every translation present on a LocalizedText, in supported-language order. */
function foldTranslations(v: LocalizedText): string[] {
  return SUPPORTED_LANGS.map((l) => v[l]).filter((s): s is string => !!s?.trim());
}

export function buildCorpus(): Chunk[] {
  const chunks: Chunk[] = [];

  // 1. Source-verified government passages. These go first so exact clause
  //    matches outrank older demo summaries when retrieval scores tie.
  for (const passage of GOV_PASSAGES) {
    chunks.push({
      id: passage.id,
      text: passage.text,
      aliases: passage.aliases,
      source: passage.source,
      agent: passage.agent,
      url: passage.url,
      verifiedOn: passage.verifiedOn,
      validTill: passage.validTill,
    });
  }

  // 2. State cooperative and farmer schemes. Central schemes alone left every
  //    "what does my state give me" question unanswerable.
  for (const p of STATE_PASSAGES) {
    chunks.push({
      id: p.id,
      text: p.text,
      aliases: p.aliases,
      source: p.source,
      agent: p.agent,
      url: p.url,
      verifiedOn: p.verifiedOn,
      validTill: p.validTill,
      state: p.state,
    });
  }

  // 3. Cooperative law / schemes / PMFBY passages
  for (const entry of KNOWLEDGE_BASE) {
    const aliases = foldKeywords(entry.keywords);
    chunks.push({
      id: `kb:${entry.id}`,
      text: entry.answer.en,
      aliases,
      source: entry.source,
      agent: entry.agent,
      canned: entry.answer,
    });
  }

  // 3. Misinformation rulings — high-value retrieval targets, because a
  //    farmer's question is often a disguised version of the myth itself.
  for (const myth of MYTHS) {
    // The claim is folded in in every language it exists in: a member usually
    // asks the myth back in their own words, so the translated claim text is
    // the single highest-value retrieval surface for that language.
    const aliases = [...foldKeywords(myth.keywords), ...foldTranslations(myth.claim)];
    chunks.push({
      id: `myth:${myth.id}`,
      text: `Claim commonly made to farmers: "${stripLang(myth.claim)}". Ruling: ${stripLang(myth.ruling)}`,
      aliases,
      source: myth.source,
      agent: myth.verdict === "false" ? "grievance" : "schemes",
      canned: myth.ruling,
    });
  }

  // 4. Entitlement definitions — eligibility rules and monetary value
  for (const e of ENTITLEMENTS) {
    chunks.push({
      id: `ent:${e.id}`,
      // The figure is labelled as what the member RECEIVES, explicitly. Left as
      // a bare "Approximate value: Rs 4,800" next to "you pay only 2%", the
      // model attached the rupee amount to the wrong side and told a farmer
      // asking about premiums that they must pay Rs 4,800 — inverting who pays.
      text: `${e.name.en}. ${e.why.en} Benefit received by the member: about Rs ${e.valueInr.toLocaleString(
        "en-IN"
      )} ${e.cadence === "yearly" ? "per year" : "one time"}. This is the value of the support the member gets, not an amount the member pays.`,
      // Name AND reason, in every language each exists in.
      //
      // The name alone gave these chunks about six aliases against a myth's
      // thirty-five, so an entitlement lost almost every contest it should
      // have won - a question about the prompt-repayment rebate was answered
      // from a passage about insurance deadlines. `why` is the sentence that
      // actually describes what the entitlement is for, and it is already
      // translated, so folding it in costs nothing and is the difference
      // between a chunk that can be found in Hindi and one that cannot.
      //
      // Only the translations that exist — a missing one would index as
      // undefined and poison the sparse index with the literal "undefined".
      aliases: [
        ...Object.values(e.name),
        ...Object.values(e.why),
      ].filter(Boolean) as string[],
      source: e.source,
      agent: "schemes",
      canned: SUPPORTED_LANGS.reduce(
        (acc, l) => {
          const name = e.name[l];
          const why = e.why[l];
          // Both halves must exist in the same language, otherwise the entry
          // would splice two languages into one sentence.
          if (name && why) acc[l] = `${name} — ${why}`;
          return acc;
        },
        { en: `${e.name.en} — ${e.why.en}` } as LocalizedText
      ),
    });
  }

  // 5. Procedural passages that have no natural home in the UI data but are
  //    frequently asked about at the counter.
  chunks.push(
    {
      id: "proc:grievance-escalation",
      text: "A grievance filed against a PACS must be acknowledged and acted on by the society. If it remains unresolved beyond 15 days it is escalated to the district cooperative office, and from there to the Registrar of Cooperative Societies. The member is entitled to a written reason for any rejection and may inspect the relevant board resolution.",
      aliases: [
        "escalate", "registrar", "15 days", "unresolved", "no response",
        "who do i go to next", "secretary did not respond", "next step",
        "शिकायत बढ़ाना", "आगे कहाँ जाऊँ", "आगे किसके पास", "किसके पास जाऊँ",
        "सचिव ने नहीं सुना", "कोई जवाब नहीं", "रजिस्ट्रार", "अगला कदम",
        "பதிவாளர்", "அடுத்து யாரிடம்", "செயலாளர் கேட்கவில்லை", "பதில் இல்லை",
      ],
      source: "PACS Grievance Redressal Procedure, Ministry of Cooperation Circular",
      agent: "grievance",
      verifiedOn: "2026-08-30",
    },
    {
      id: "proc:pmfby-timeline",
      // Corrected against the source document on 2026-08-30. This previously
      // read "settlement is due within 21 days of receipt of yield data";
      // Clause 16.12 sets the penal-interest trigger at 30 days from the
      // State uploading actual yield data, and makes it conditional on the
      // State having released its premium subsidy. The 21-day figure and the
      // 7-day localised-risk assessment step were not in the guidelines.
      text: "PMFBY claim timeline: intimate loss within 72 hours of the event. All admissible claims must be paid within the stipulated cut-off date; if they are not, penal interest at 12 percent per annum is payable to the farmer on admissible pending claims beyond 30 days of the State Government uploading actual yield data on the portal, subject to the State having released its share of the premium subsidy.",
      aliases: ["how long", "timeline", "delay", "30 days", "72 hours", "penal interest", "कितने दिन", "எவ்வளவு நாட்கள்", "ఎన్ని రోజులు", "ಎಷ್ಟು ದಿನ", "എത്ര ദിവസം"],
      source: "PMFBY Operational Guidelines (Revamped, effective Kharif 2020), Clause 16.12 — Payment of Claims",
      agent: "pmfby",
      verifiedOn: "2026-08-30",
    },
    {
      id: "proc:notified-crops",
      text: "PMFBY only covers crops that the State Government has notified for a given season and area, and coverage is decided at the level of the notified unit — usually a village panchayat for major crops. A farmer cannot determine this themselves: the notification list for the district is issued each season by the State Level Coordination Committee on Crop Insurance, and the PACS secretary or the district agriculture officer holds the current list. If your crop or your village is not on that season's notification, no insurer can enroll you, and any agent claiming otherwise is misleading you. Ask your PACS secretary to show you the notification for your block for the current season — they are required to have it.",
      aliases: ["notified crop", "is my area eligible", "is my village covered", "is my crop covered", "eligible in my area", "notification", "अधिसूचित फसल", "मेरा गाँव", "அறிவிக்கப்பட்ட பயிர்", "என் கிராமம்"],
      source: "PMFBY Operational Guidelines (Revamped, effective Kharif 2020), Clause 3.1 — notified crops in notified areas",
      agent: "pmfby",
      verifiedOn: "2026-08-30",
    },
    {
      id: "proc:pacs-membership",
      text: "Any resident of the area of operation who is over 18, is not a defaulter to another cooperative, and buys the minimum share capital may apply for PACS membership. The board must decide on the application within 90 days; if it does not, the applicant may appeal to the Registrar. Membership cannot be refused on grounds of caste, gender, or political affiliation.",
      aliases: [
        "become a member", "join pacs", "membership", "how to join",
        "सदस्य कैसे बनें", "सदस्य बनना", "सदस्यता",
        "உறுப்பினராக", "உறுப்பினர்", "உறுப்பினராக சேர", "எப்படி சேருவது",
        "PACS உறுப்பினர்", "உறுப்பினர் ஆவது எப்படி",
      ],
      source: "Cooperative Societies Act, Sec. 22 — Admission of Members",
      agent: "cooperative_law",
      verifiedOn: "2026-08-30",
    }
  );

  return chunks;
}

export const CORPUS = buildCorpus();
