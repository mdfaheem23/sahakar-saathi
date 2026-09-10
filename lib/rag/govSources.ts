import { AgentId } from "../types";

/**
 * Passages taken from the actual government source documents.
 *
 * Everything else in the corpus is hand-written summary that cites a document
 * without anyone having opened it. These entries were extracted from the real
 * PDFs and pages listed in `url`, and each one carries the clause number the
 * statement actually comes from — so a wrong figure can be traced to a wrong
 * reading rather than to a guess.
 *
 * `verifiedOn` is the date the text was checked against the source. Scheme
 * parameters change (the KCC limit is under revision right now), so an entry
 * that has not been re-checked in a season should be treated as stale, not as
 * permanently true.
 */
export interface GovPassage {
  id: string;
  agent: AgentId;
  /** English body: what gets embedded and BM25-indexed. */
  text: string;
  /** Retrieval surfaces across the supported languages. */
  aliases: string[];
  /** Document name and the clause the statement rests on. */
  source: string;
  /** Where the document was retrieved from. */
  url: string;
  /** ISO date this passage was last checked against the source document. */
  verifiedOn: string;
  /**
   * ISO date after which this passage is known not to apply.
   *
   * Set when the document itself bounds the rule — a season's enrolment
   * window, a rate notified for one financial year, a scheme with a sunset
   * clause. Setting it is how a rule is retired: after that date every
   * channel reports it as possibly no longer in force, without anyone having
   * to remember to delete the passage. Left unset when the document states no
   * end, which is not the same as the rule being permanent.
   */
  validTill?: string;
}

const PMFBY_OG = "https://pmfby.gov.in/pdf/Revamped%20OGs_Final.pdf";
const PMFBY_DOC = "PMFBY Operational Guidelines (Revamped, effective Kharif 2020)";
const CHECKED = "2026-08-30";

export const GOV_PASSAGES: GovPassage[] = [
  {
    id: "gov:pmfby-premium-rates",
    agent: "pmfby",
    text: "Maximum premium payable by the farmer under PMFBY is 2.0% of the sum insured for Kharif food grain and oilseed crops, 1.5% for Rabi food grain and oilseed crops, and 5% for annual commercial and annual horticultural crops — or the actuarial rate, whichever is less. The balance of the actuarial premium is shared by the Central and State Governments.",
    aliases: ["premium", "how much do I pay", "2%", "1.5%", "5%", "kharif rabi premium", "प्रीमियम", "பிரீமியம்", "ప్రీమియం", "ಪ್ರೀಮಿಯಂ", "പ്രീമിയം", "प्रीमियम कितना", "पंट बीमा प्रीमियम", "பிரீமியம் எவ்வளவு", "பயிர் காப்பீட்டு பிரீமியம்", "ప్రీమియం ఎంత", "పంట బీమా ప్రీమియం", "ಪ್ರೀಮಿಯಂ ಎಷ್ಟು", "ಬೆಳೆ ವಿಮೆ ಪ್ರೀಮಿಯಂ", "പ്രീമിയം എത്ര", "വിള ഇൻഷുറൻസ് പ്രീമിയം"],
    source: `${PMFBY_DOC}, Premium Rates table (p. 22)`,
    url: PMFBY_OG,
    verifiedOn: CHECKED,
  },
  {
    id: "gov:pmfby-72-hour-intimation",
    agent: "pmfby",
    text: "For localised risks and post-harvest losses the insured farmer must intimate the loss within 72 hours of its occurrence. Intimation may be given to the Insurance Company, the bank, the Common Service Centre, the agriculture department official, or through the crop insurance app and the national portal.",
    aliases: ["72 hours", "how soon must I report", "intimate loss", "report damage", "72 घंटे", "72 மணி நேரம்", "72 గంటలు", "72 ಗಂಟೆ", "72 മണിക്കൂർ"],
    source: `${PMFBY_DOC}, Clause 21.5.4.2 and 21.6.3.2 — Intimation of Loss`,
    url: PMFBY_OG,
    verifiedOn: CHECKED,
  },
  {
    id: "gov:pmfby-penal-interest",
    agent: "pmfby",
    text: "All admissible PMFBY claims must be paid within the stipulated cut-off date. If they are not, penal interest at 12% per annum is payable to the farmer on admissible pending claims beyond 30 days of the State Government uploading actual yield data on the portal, subject to the State having released its share of the premium subsidy. The State Government calculates the penal interest and informs the Insurance Company.",
    aliases: ["late payment", "delay in claim", "penal interest", "12 percent", "30 days", "claim not paid", "विलंब ब्याज", "தாமத வட்டி", "ఆలస్య వడ్డీ", "ವಿಳಂಬ ಬಡ್ಡಿ", "വൈകിയ പലിശ", "दावा विलंब", "भुगतान में देरी", "உரிமைகோரல் தாமதம்", "క్లెయిమ్ ఆలస్యం", "డబ్బు రాలేదు", "ಕ್ಲೇಮ್ ವಿಳಂಬ", "ಹಣ ಬಂದಿಲ್ಲ", "ക്ലെയിം വൈകി", "പണം കിട്ടിയില്ല"],
    source: `${PMFBY_DOC}, Clause 16.12 — Payment of Claims`,
    url: PMFBY_OG,
    verifiedOn: CHECKED,
  },
  {
    id: "gov:pmfby-cutoff-not-extended",
    agent: "pmfby",
    text: "Once seasonality and enrolment cut-off dates are fixed and notified for a crop season, no request or relaxation for extension is considered or granted by the Ministry of Agriculture and Farmers Welfare. Under no circumstance will the Ministry or any State extend the cut-off date for enrolment of farmers; if a State chooses to do so it must be in agreement with the insurance company, and no central premium subsidy is provided for anyone covered in the extended period. No individual agent or official can enrol a single farmer after the cut-off or backdate an entry.",
    aliases: ["last date", "deadline passed", "late enrollment", "can I still enroll", "extend deadline", "अंतिम तिथि", "கடைசி தேதி", "చివరి తేదీ", "ಕೊನೆಯ ದಿನಾಂಕ", "അവസാന തീയതി", "గడువు దాటింది", "ಗಡುವು ಮುಗಿದಿದೆ", "സമയപരിധി കഴിഞ്ഞു"],
    source: `${PMFBY_DOC}, Clauses 16.8 and 16.9 — Seasonality Discipline`,
    url: PMFBY_OG,
    verifiedOn: CHECKED,
  },
  {
    id: "gov:pmfby-tenant-coverage",
    agent: "pmfby",
    text: "All farmers including sharecroppers and tenant farmers growing the notified crops in the notified areas are eligible for PMFBY coverage. To establish cultivation, a sharecropper or tenant farmer provides documentation prescribed by the State Government — a sowing certificate or a self-declaration of the intent to sow the proposed crop. Land ownership is not the qualifying condition.",
    aliases: ["tenant", "sharecropper", "rented land", "not my land", "lease", "sowing certificate", "किरायेदार", "बटाईदार", "குத்தகை", "కౌలుదారు", "ಗುತ್ತಿಗೆದಾರ", "പാട്ടക്കാരൻ", "కౌలు రైతు బీమా", "ಗುತ್ತಿಗೆ ರೈತ ವಿಮೆ", "പാട്ടക്കർഷക ഇൻഷുറൻസ്"],
    source: `${PMFBY_DOC}, Clause 3.1 — Coverage of Farmers`,
    url: PMFBY_OG,
    verifiedOn: CHECKED,
  },
  {
    id: "gov:pmfby-aadhaar",
    agent: "pmfby",
    text: "Aadhaar has been made mandatory for availing crop insurance under PMFBY from the Kharif 2017 season onwards. For farmers enrolling through a Common Service Centre or online, OTP or Aadhaar enabled verification applies. Aadhaar is what links the policy to the bank account that receives the Direct Benefit Transfer.",
    aliases: ["aadhaar", "aadhar mandatory", "is aadhaar needed", "आधार", "ஆதார்", "ఆధార్", "ಆಧಾರ್", "ആധാർ"],
    source: `${PMFBY_DOC}, Clause 6.4.1 — Aadhaar`,
    url: PMFBY_OG,
    verifiedOn: CHECKED,
  },
  {
    id: "gov:pmfby-service-charges",
    agent: "pmfby",
    text: "Service charges under PMFBY are paid by the Insurance Company to banks and intermediaries — banks receive 4% of the farmer's share of premium, and Common Service Centres are paid per successfully submitted application. These are never collected from the farmer. Beyond the notified premium share, a farmer owes nothing to any bank, Common Service Centre, agent or official for enrolling or for filing a claim.",
    aliases: ["fee", "service charge", "commission", "agent asking money", "bribe", "pay to file claim", "शुल्क", "கட்டணம்", "రుసుము", "ಶುಲ್ಕ", "ഫീസ്"],
    source: `${PMFBY_DOC}, Clause 27.1.1 and 27.2.1 — Service Charges`,
    url: PMFBY_OG,
    verifiedOn: CHECKED,
  },
  {
    id: "gov:pmkisan-benefit",
    agent: "schemes",
    text: "PM-KISAN provides income support of Rs 6,000 per year to eligible landholding farmer families, transferred by Direct Benefit Transfer in three equal instalments of Rs 2,000 every four months. Family is defined as husband, wife and minor children. Certain categories are excluded from the scheme, and land parcels held by family members across different revenue records are pooled to determine the benefit.",
    aliases: ["pm kisan", "6000", "2000 instalment", "income support", "किसान सम्मान निधि", "பிஎம் கிசான்", "పీఎం కిసాన్", "ಪಿಎಂ ಕಿಸಾನ್", "പിഎം കിസാൻ"],
    source: "PM-KISAN Revised Operational Guidelines — Benefit and Beneficiary Definition",
    url: "https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines(English).pdf",
    verifiedOn: CHECKED,
  },
  {
    id: "gov:kcc-interest-subvention",
    agent: "schemes",
    text: "Under the Modified Interest Subvention Scheme, short-term crop loans up to Rs 3 lakh through a Kisan Credit Card carry a ground-level interest rate of 7% per annum. A farmer who repays on or before the due date receives a Prompt Repayment Incentive of 3%, bringing the effective rate down to 4%. The incentive applies only against loans routed through a KCC.",
    aliases: ["kcc", "kisan credit card", "interest", "loan interest", "3 lakh", "7 percent", "4 percent", "ब्याज", "வட்டி", "వడ్డీ", "ಬಡ್ಡಿ", "പലിശ", "किसान क्रेडिट कार्ड ब्याज", "கிசான் கிரெடிட் கார்டு வட்டி", "కిసాన్ క్రెడిట్ కార్డు వడ్డీ", "ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ ಬಡ್ಡಿ", "കിസാൻ ക്രെഡിറ്റ് കാർഡ് പലിശ", "రుణం వడ్డీ", "ಸಾಲದ ಬಡ್ಡಿ", "വായ്പ പലിശ"],
    source: "NABARD — Interest Subvention Scheme / Modified Interest Subvention Scheme (MISS)",
    url: "https://www.nabard.org/content1.aspx?id=602&catid=23&mid=23",
    verifiedOn: CHECKED,
  },
  {
    id: "gov:pmkusum-component-b",
    agent: "schemes",
    text: "Under PM-KUSUM Component-B, an individual farmer installing a standalone solar agriculture pump of up to 7.5 HP receives Central Financial Assistance of 30% of the benchmark or tender cost, whichever is lower. The State Government provides at least a further 30%, and the farmer bears at most the remaining 40% — of which up to 30% may be taken as bank finance, so the farmer's own upfront contribution can be as low as 10%. In the North Eastern States, Sikkim, Jammu and Kashmir, Himachal Pradesh, Uttarakhand, Lakshadweep and the Andaman and Nicobar Islands the Central assistance is 50% instead of 30%.",
    aliases: ["kusum", "solar pump", "subsidy", "diesel pump", "सोलर पंप", "சூரிய பம்ப்", "సౌర పంపు", "ಸೌರ ಪಂಪ್", "സോളാർ പമ്പ്", "సౌర పంపు రాయితీ ఎంత", "ಸೌರ ಪಂಪ್ ಸಬ್ಸಿಡಿ ಎಷ್ಟು", "സോളാർ പമ്പ് സബ്‌സിഡി എത്ര"],
    source: "PM-KUSUM Component-B — Central Financial Assistance, MNRE",
    url: "https://mnre.gov.in/en/pradhan-mantri-kisan-urja-suraksha-evam-utthaan-mahabhiyaan-pm-kusum/",
    verifiedOn: CHECKED,
  },
];
