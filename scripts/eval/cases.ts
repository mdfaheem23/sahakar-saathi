/**
 * Labelled retrieval cases.
 *
 * `expect` is the passage that SHOULD be ranked first. Written from the
 * question's topic, not from what retrieval currently returns - a test that
 * records today's behaviour cannot detect a regression in it.
 *
 * `alt` lists passages that would also be a defensible first hit, so a case is
 * not counted wrong for a genuinely ambiguous question.
 */
export interface Case {
  lang: string;
  q: string;
  expect: string;
  alt?: string[];
}

export const CASES: Case[] = [
  // ---- crop insurance: claims ----
  { lang: "hi", q: "फसल बीमा का दावा कैसे करें?", expect: "kb:pmfby-claim-eligibility", alt: ["proc:pmfby-timeline"] },
  { lang: "hi", q: "फसल बीमा के लिए कौन से कागज़ चाहिए?", expect: "kb:pmfby-documents" },
  { lang: "hi", q: "फसल बीमा के लिए आवेदन की आखिरी तारीख क्या है?", expect: "kb:pmfby-enrollment-deadline", alt: ["myth:late-enrollment-possible"] },
  { lang: "hi", q: "फसल खराब होने पर कितने घंटे में बताना होता है?", expect: "gov:pmfby-72-hour-intimation" },
  { lang: "en", q: "My crop was damaged by rain. Will I get insurance?", expect: "kb:pmfby-claim-eligibility", alt: ["gov:pmfby-72-hour-intimation", "proc:notified-crops"] },
  { lang: "hi", q: "बीमा का पैसा कितने दिन में मिलता है?", expect: "proc:pmfby-timeline" },
  { lang: "hi", q: "मेरी फसल अधिसूचित है या नहीं कैसे पता करें?", expect: "proc:notified-crops" },
  { lang: "hi", q: "फसल बीमा का प्रीमियम कितना देना होता है?", expect: "ent:pmfby-subsidy", alt: ["gov:pmfby-premium-rates"] },

  // ---- crop insurance: myths ----
  { lang: "hi", q: "क्या बटाईदार किसान फसल बीमा करा सकता है?", expect: "myth:tenant-cannot-insure" },
  { lang: "hi", q: "क्या दावा दर्ज करने के लिए फीस देनी पड़ती है?", expect: "myth:fee-to-file-claim" },
  { lang: "hi", q: "एजेंट बीमा दावे के लिए पैसे माँग रहा है, क्या देना पड़ेगा?", expect: "myth:fee-to-file-claim" },
  { lang: "hi", q: "मेरा बीमा का पैसा PACS ने रोक लिया, क्या यह सही है?", expect: "myth:claim-money-to-pacs" },
  { lang: "hi", q: "क्या तारीख निकल जाने के बाद भी बीमा हो सकता है?", expect: "myth:late-enrollment-possible" },
  { lang: "hi", q: "क्या योजना के लिए आधार कार्ड ज़रूरी है?", expect: "myth:aadhaar-mandatory" },

  // ---- PM-KISAN ----
  { lang: "hi", q: "पीएम किसान योजना में कितना पैसा मिलता है?", expect: "ent:pm-kisan", alt: ["gov:pmkisan-benefit"] },
  { lang: "en", q: "Who is eligible for PM-KISAN?", expect: "gov:pmkisan-benefit", alt: ["ent:pm-kisan"] },
  { lang: "hi", q: "पीएम किसान का पैसा नहीं आया, क्या करूँ?", expect: "ent:pm-kisan", alt: ["gov:pmkisan-benefit", "kb:grievance-how-to-file"] },

  // ---- credit ----
  { lang: "hi", q: "किसान क्रेडिट कार्ड पर ब्याज कितना लगता है?", expect: "gov:kcc-interest-subvention", alt: ["ent:kcc-subvention", "kb:schemes-kcc-loan"] },
  { lang: "hi", q: "समय पर कर्ज़ चुकाने पर ब्याज में छूट मिलती है क्या?", expect: "ent:kcc-subvention", alt: ["gov:kcc-interest-subvention"] },
  { lang: "en", q: "How do I get a crop loan from my PACS?", expect: "kb:schemes-kcc-loan", alt: ["gov:kcc-interest-subvention"] },

  // ---- membership and member rights ----
  { lang: "en", q: "How do I become a PACS member?", expect: "proc:pacs-membership" },
  { lang: "hi", q: "PACS ने मुझे सदस्य बनाने से मना कर दिया", expect: "proc:pacs-membership", alt: ["kb:law-member-rights", "myth:loan-refusal-no-reason"] },
  { lang: "hi", q: "क्या मैं सोसाइटी का हिसाब-किताब देख सकता हूँ?", expect: "kb:law-inspect-records" },
  { lang: "hi", q: "सदस्य के रूप में मेरे क्या अधिकार हैं?", expect: "kb:law-member-rights" },
  { lang: "en", q: "When are PACS elections held?", expect: "kb:law-elections" },
  { lang: "hi", q: "PACS ने बिना कारण बताए मेरा लोन मना कर दिया", expect: "myth:loan-refusal-no-reason", alt: ["kb:law-member-rights"] },

  // ---- grievance ----
  { lang: "hi", q: "शिकायत कैसे दर्ज करें?", expect: "kb:grievance-how-to-file" },
  { lang: "hi", q: "मेरी शिकायत का क्या हुआ, स्थिति कैसे देखूँ?", expect: "kb:grievance-check-status" },
  { lang: "hi", q: "PACS सचिव ने नहीं सुना, आगे किसके पास जाऊँ?", expect: "proc:grievance-escalation", alt: ["kb:grievance-how-to-file"] },

  // ---- entitlements ----
  { lang: "hi", q: "सोलर पंप के लिए सब्सिडी मिलती है क्या?", expect: "ent:kusum-pump" },
  { lang: "hi", q: "महिला किसानों के लिए कोई योजना है?", expect: "ent:mahila-kisan" },
  { lang: "en", q: "Is there a subsidy for building a godown at the PACS?", expect: "ent:godown-subsidy" },
  { lang: "en", q: "What schemes are available for farmers?", expect: "kb:schemes-overview" },

  // ---- Tamil ----
  { lang: "ta", q: "பயிர் காப்பீடு கோர என்ன ஆவணங்கள் தேவை?", expect: "kb:pmfby-documents" },
  { lang: "ta", q: "மழையால் என் பயிர் சேதமானது, காப்பீடு கிடைக்குமா?", expect: "kb:pmfby-claim-eligibility", alt: ["gov:pmfby-72-hour-intimation", "proc:notified-crops"] },
  { lang: "ta", q: "குத்தகைதாரர் பயிர் காப்பீடு செய்ய முடியுமா?", expect: "myth:tenant-cannot-insure" },
  { lang: "ta", q: "PACS உறுப்பினராக எப்படி சேருவது?", expect: "proc:pacs-membership" },
  { lang: "ta", q: "புகார் எப்படி பதிவு செய்வது?", expect: "kb:grievance-how-to-file" },
];
