import { AgentId } from "../types";

/**
 * State-level cooperative and farmer schemes for the southern states.
 *
 * The corpus was entirely central — PMFBY, PM-KISAN, KCC, PM-KUSUM — so any
 * question about what a member's own state provides retrieved a generic
 * central passage, the model correctly refused to answer from it, and the
 * member was told a PACS officer would call. The assistant was not broken; it
 * had never been told these schemes exist.
 *
 * State schemes change with governments, and that is exactly where recall goes
 * stale: Telangana replaced Rythu Bandhu with Rythu Bharosa, and Andhra
 * replaced YSR Rythu Bharosa with Annadata Sukhibhava. Every figure below was
 * read off the government page named in `url` on `verifiedOn` rather than
 * recalled — and the ones that could not be verified were left out instead of
 * being written plausibly.
 */
export interface StatePassage {
  id: string;
  /** ISO-ish state code used to scope retrieval to the member's district. */
  state: "TN" | "KA" | "KL" | "TG" | "AP";
  agent: AgentId;
  text: string;
  aliases: string[];
  source: string;
  url: string;
  verifiedOn: string;
  /**
   * ISO date after which this scheme is known not to apply.
   *
   * State schemes are renamed and replaced with each government — Rythu Bandhu
   * became Rythu Bharosa, YSR Rythu Bharosa became Annadata Sukhibhava — and
   * the old page usually stays up. Dating the end of a scheme here is what
   * stops the superseded one being read out as current.
   */
  validTill?: string;
}

const CHECKED = "2026-08-31";

export const STATE_PASSAGES: StatePassage[] = [
  // ---------------------------------------------------------------- Karnataka
  {
    id: "state:ka-zero-interest-crop-loan",
    state: "KA",
    agent: "schemes",
    text: "In Karnataka, short-term agricultural crop loans taken through cooperative societies carry a 0% rate of interest for loans up to Rs 3.00 lakh. Loans for animal husbandry and fisheries are available at 0% interest up to Rs 2.00 lakh. This is a Karnataka State interest subsidy paid to the cooperative institutions, and it is more generous than the central Modified Interest Subvention Scheme, under which a farmer still pays an effective 4%.",
    aliases: [
      "karnataka crop loan", "zero interest loan", "0% interest karnataka", "free interest loan",
      "ಶೂನ್ಯ ಬಡ್ಡಿ ಸಾಲ", "ಕರ್ನಾಟಕ ಬೆಳೆ ಸಾಲ", "ಬಡ್ಡಿ ಇಲ್ಲದ ಸಾಲ",
      "కర్ణాటక పంట రుణం", "வட்டி இல்லா கடன்", "പലിശയില്ലാ വായ്പ",
    ],
    source: "Karnataka Department of Cooperation (Sahakara Sindhu) — Interest Subsidy for Agricultural Crop Loan",
    url: "https://sahakarasindhu.karnataka.gov.in/info-2/Interest+Subsidy+for+Agricultural+Crop+Loan/en",
    verifiedOn: CHECKED,
  },
  {
    id: "state:ka-medium-term-loan",
    state: "KA",
    agent: "schemes",
    text: "Karnataka provides medium-term and long-term agricultural loans through cooperative institutions at a 3% rate of interest for amounts up to Rs 10.00 lakh. Loans to Self Help Groups through cooperatives are available at 4%, with the State Government paying the interest subsidy to the cooperative institution.",
    aliases: [
      "karnataka long term loan", "medium term agricultural loan", "10 lakh loan", "self help group loan",
      "ಮಧ್ಯಮಾವಧಿ ಸಾಲ", "ದೀರ್ಘಾವಧಿ ಸಾಲ", "ಸ್ವಸಹಾಯ ಸಂಘ ಸಾಲ",
    ],
    source: "Karnataka Department of Cooperation (Sahakara Sindhu) — Interest Subsidy for Agricultural Crop Loan",
    url: "https://sahakarasindhu.karnataka.gov.in/info-2/Interest+Subsidy+for+Agricultural+Crop+Loan/en",
    verifiedOn: CHECKED,
  },
  {
    id: "state:ka-yeshasvini",
    state: "KA",
    agent: "schemes",
    text: "Yeshasvini is a health care scheme run for members of cooperative societies in Karnataka, administered by the Yeshasvini Co-operative Members Health Care Trust and listed by the Karnataka Department of Cooperation. Membership of a cooperative society is the basis of eligibility, so a PACS member should ask their society about the current enrolment window, the annual contribution and the treatment package, which are set by the Trust each year.",
    aliases: [
      "yeshasvini", "cooperative health scheme", "health card karnataka", "operation coverage",
      "ಯಶಸ್ವಿನಿ", "ಆರೋಗ್ಯ ಯೋಜನೆ", "ಸಹಕಾರಿ ಆರೋಗ್ಯ",
    ],
    source: "Karnataka Department of Cooperation (Sahakara Sindhu) — Yeshasvini",
    url: "https://sahakarasindhu.karnataka.gov.in/page/YESHASVINI/en",
    verifiedOn: CHECKED,
  },

  // ---------------------------------------------------------------- Telangana
  {
    id: "state:tg-rythu-bharosa",
    state: "TG",
    agent: "schemes",
    text: "Telangana's Rythu Bharosa provides investment support of Rs 12,000 per acre per year to farmers, paid in two equal instalments of Rs 6,000 per acre for the Kharif and Rabi seasons. It replaced the earlier Rythu Bandhu scheme, which paid Rs 4,000 per acre per season. Eligibility is limited to actively cultivated arable land, verified through satellite mapping.",
    aliases: [
      "rythu bharosa", "rythu bandhu", "telangana farmer support", "12000 per acre", "investment support",
      "రైతు భరోసా", "రైతు బంధు", "ఎకరాకు 12000", "తెలంగాణ రైతు పథకం",
    ],
    source: "Rythu Bharosa, Government of Telangana — scheme portal and district scheme pages",
    url: "https://rythubharosa.telangana.gov.in/",
    verifiedOn: CHECKED,
  },
  {
    id: "state:tg-rythu-bima",
    state: "TG",
    agent: "schemes",
    text: "Rythu Bima is Telangana's group life insurance scheme for farmers, linked to Rythu Bharosa registration. On the death of an enrolled farmer, Rs 5 lakh is paid to the nominee. Enrolment is tied to the farmer's registration under the state's farmer support scheme, so a member should confirm their record is active rather than assume cover.",
    aliases: [
      "rythu bima", "farmer life insurance", "5 lakh insurance", "death benefit nominee",
      "రైతు బీమా", "జీవిత బీమా", "5 లక్షల బీమా",
    ],
    source: "Rythu Bima, Government of Telangana — farmer group life insurance",
    url: "https://rythubandhu.telangana.gov.in/Default_LIC1.aspx",
    verifiedOn: CHECKED,
  },
  {
    id: "state:tg-paddy-bonus",
    state: "TG",
    agent: "schemes",
    text: "Telangana pays a bonus of Rs 500 per quintal on paddy, in addition to the investment support paid under Rythu Bharosa. This is a state bonus over and above the central Minimum Support Price for the crop.",
    aliases: [
      "paddy bonus", "500 per quintal", "telangana paddy", "bonus on paddy",
      "వరి బోనస్", "క్వింటాలుకు 500", "ధాన్యం బోనస్",
    ],
    source: "Rythu Bharosa, Government of Telangana — paddy bonus",
    url: "https://rythubharosa.telangana.gov.in/",
    verifiedOn: CHECKED,
  },

  // ----------------------------------------------------------- Andhra Pradesh
  {
    id: "state:ap-annadata-sukhibhava",
    state: "AP",
    agent: "schemes",
    text: "Andhra Pradesh provides financial assistance of Rs 20,000 per year per farmer family under Annadata Sukhibhava - PM KISAN. That figure is inclusive of the Rs 6,000 paid by the Government of India under PM-KISAN, so the State adds the balance. Landholding farmer families and ROFR land cultivators are covered, and landless cultivators in the state also receive Rs 20,000 per year from the State budget. It replaced the earlier YSR Rythu Bharosa scheme.",
    aliases: [
      "annadata sukhibhava", "ysr rythu bharosa", "andhra farmer scheme", "20000 per year",
      "landless cultivator", "tenant farmer andhra",
      "అన్నదాత సుఖీభవ", "రైతు భరోసా ఆంధ్ర", "సంవత్సరానికి 20000", "కౌలు రైతు",
    ],
    source: "Annadata Sukhibhava, Government of Andhra Pradesh — scheme portal and district scheme pages",
    url: "https://annadathasukhibhava.ap.gov.in/",
    verifiedOn: CHECKED,
  },

  // ------------------------------------------------------------------- Kerala
  {
    id: "state:kl-paddy-zero-interest",
    state: "KL",
    agent: "schemes",
    text: "In Kerala, agricultural loans for paddy disbursed through cooperative institutions are given at 0% interest on behalf of farmers, and the Department of Cooperation reimburses the insurance premium paid by the cooperative institution on those loans. A paddy farmer borrowing through a PACS or a Farmers Service Cooperative Bank should therefore not be charged interest on the paddy crop loan.",
    aliases: [
      "kerala paddy loan", "zero interest paddy", "cooperative paddy loan", "nellu loan",
      "പലിശയില്ലാത്ത വായ്പ", "നെല്ല് വായ്പ", "കേരള കാർഷിക വായ്പ", "സഹകരണ വായ്പ",
    ],
    source: "Department of Cooperation, Government of Kerala — Assistance to Credit Co-operatives/Banks",
    url: "https://cooperation.kerala.gov.in/assistance-to-credit-co-operatives-banks/",
    verifiedOn: CHECKED,
  },
  {
    id: "state:kl-pacs-paddy-incentive",
    state: "KL",
    agent: "schemes",
    text: "Kerala pays an incentive grant of up to Rs 25,000 per society in a financial year to a Primary Agricultural Credit Society, Farmers Service Cooperative Bank or Farmers Service Cooperative Society whose paddy cultivation lending exceeds 20% of the total agricultural loan it issued in the previous year. This is a grant to the society, not a payment to individual members.",
    aliases: [
      "pacs incentive kerala", "25000 grant", "paddy lending incentive", "society grant",
      "പ്രോത്സാഹന ധനസഹായം", "സഹകരണ സംഘം ഗ്രാന്റ്",
    ],
    source: "Department of Cooperation, Government of Kerala — Schemes Applicable to PACS/FSCB/FSCS",
    url: "https://cooperation.kerala.gov.in/schemes-applicable-to-primary-agricultural-credit-societies-pacs-fscb-fscs/",
    verifiedOn: CHECKED,
  },
  {
    id: "state:kl-karshaka-pension",
    state: "KL",
    agent: "schemes",
    text: "Kerala runs a Karshaka Pension for small and marginal farmers through the Kerala Farmers' Welfare Fund Board, which provides pension and financial support as social security to farmers engaged in agriculture and allied sectors. Applications are made through the Kerala e-Services route; a member should confirm the current pension amount and eligibility age with the Welfare Fund Board, as those are revised by government order.",
    aliases: [
      "karshaka pension", "farmer pension kerala", "welfare fund", "old age pension farmer",
      "കർഷക പെൻഷൻ", "ക്ഷേമനിധി", "പെൻഷൻ",
    ],
    source: "Kerala Farmers' Welfare Fund Board — Karshaka Pension for small and marginal farmers",
    url: "https://kfwfb.kerala.gov.in/",
    verifiedOn: CHECKED,
  },

  // -------------------------------------------------------------- Tamil Nadu
  {
    id: "state:tn-paccs-credit",
    state: "TN",
    agent: "schemes",
    text: "In Tamil Nadu, Primary Agricultural Cooperative Credit Societies (PACCS) provide agricultural and non-agricultural credit in rural areas. Agricultural lending includes Kisan Credit Card loans and loans for allied agricultural purposes such as purchase of farm machinery, micro irrigation and purchase of milch animals. Non-agricultural lending covers housing and income-generating activities for Self Help Groups. A member applies at their own PACCS with land and identity documents.",
    aliases: [
      "tamil nadu pacs", "paccs loan", "kcc tamil nadu", "farm machinery loan", "micro irrigation loan",
      "milch animal loan", "தமிழ்நாடு கூட்டுறவு", "பாக்ஸ் கடன்", "விவசாய கடன்", "பண்ணை இயந்திரம்",
    ],
    source: "Office of the Registrar of Cooperative Societies, Tamil Nadu — Primary Agricultural Cooperative Credit Societies",
    url: "https://rcs.tn.gov.in/credit_copperative.php",
    verifiedOn: CHECKED,
  },
  {
    id: "state:tn-crop-loan-terms",
    state: "TN",
    agent: "schemes",
    text: "In Tamil Nadu, cooperatives extend interest-free crop loans to farmers who repay promptly within the due date, on top of the 3% central interest subvention paid directly to farmers for prompt repayment. When a farmer applies for a crop loan with the relevant documents, the loan is generally sanctioned within seven days. There are 4,451 Primary Agricultural Cooperative Credit Societies in the state, supported by Central Cooperative Banks. Repaying on or before the due date is what unlocks the benefit, so the due date matters as much as the loan itself.",
    aliases: [
      "tamil nadu crop loan interest", "interest free loan tamil nadu", "prompt repayment",
      "how many days for loan", "loan sanctioned in 7 days", "crop loan due date",
      "வட்டியில்லா பயிர்க் கடன்", "தமிழ்நாடு பயிர்க் கடன்", "உரிய நேரத்தில் திருப்பிச் செலுத்த",
      "ஏழு நாட்கள்", "கடன் வட்டி",
    ],
    source: "Press Information Bureau — Access to cooperative loan to small farmers (Ministry of Cooperation)",
    url: "https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2238404",
    verifiedOn: CHECKED,
  },
  {
    id: "state:tn-pcard-jewel-loan",
    state: "TN",
    agent: "schemes",
    text: "Primary Cooperative Agriculture and Rural Development Banks (PCARD) in Tamil Nadu issue jewel loans to members. Because refinance from NABARD has not been available, PCARD banks are currently issuing jewel loans out of their own available funds, so the amount a branch can lend at any time depends on its own funds. A member should ask their PCARD branch what is available rather than assume a fixed entitlement.",
    aliases: [
      "jewel loan", "gold loan", "pcard", "pawn jewellery loan", "nagai kadan",
      "நகைக் கடன்", "தங்கக் கடன்", "கூட்டுறவு வங்கி கடன்",
    ],
    source: "Office of the Registrar of Cooperative Societies, Tamil Nadu — Cooperative credit structure",
    url: "https://rcs.tn.gov.in/mpd_cooperative_5.php",
    verifiedOn: CHECKED,
  },
  {
    id: "state:tn-icdp",
    state: "TN",
    agent: "schemes",
    text: "Under the Integrated Cooperative Development Project (ICDP) in Tamil Nadu, Primary Cooperatives receive assistance for construction and repair of godowns and office buildings, and for modern banking infrastructure including banking counters, strong rooms and computers. This is assistance to the society's infrastructure, so an individual member benefits through better storage and services rather than by a direct payment.",
    aliases: [
      "icdp", "godown construction", "storage tamil nadu", "society building",
      "கிடங்கு", "சேமிப்பு கிடங்கு", "கூட்டுறவு கட்டிடம்",
    ],
    source: "Office of the Registrar of Cooperative Societies, Tamil Nadu — Integrated Cooperative Development Project",
    url: "https://rcs.tn.gov.in/Icdp_cooperative.php",
    verifiedOn: CHECKED,
  },
];

/**
 * District records carry a full state name ("Tamil Nadu"); passages carry a
 * code ("TN"). Districts outside the covered states map to undefined, which
 * simply means no state preference is applied.
 */
export function stateCodeFromName(name: string | undefined): string | undefined {
  switch ((name ?? "").trim().toLowerCase()) {
    case "tamil nadu": return "TN";
    case "karnataka": return "KA";
    case "kerala": return "KL";
    case "telangana": return "TG";
    case "andhra pradesh": return "AP";
    default: return undefined;
  }
}

/**
 * State names as a member might name them, for spotting an explicit
 * cross-state question.
 *
 * Without this, demoting other states also buries the answer to "what is the
 * crop loan rate in Karnataka?" asked by a Tamil Nadu member — a question with
 * an obvious right answer that the corpus holds. Naming a state in the
 * question is treated as asking about that state.
 */
const STATE_MENTIONS: { code: StatePassage["state"]; names: string[] }[] = [
  { code: "TN", names: ["tamil nadu", "tamilnadu", "தமிழ்நாடு", "तमिलनाडु", "తమిళనాడు", "ತಮಿಳುನಾಡು", "തമിഴ്നാട്"] },
  { code: "KA", names: ["karnataka", "கர்நாடகா", "कर्नाटक", "కర్ణాటక", "ಕರ್ನಾಟಕ", "കർണാടക"] },
  { code: "KL", names: ["kerala", "கேரளா", "केरल", "కేరళ", "ಕೇರಳ", "കേരളം", "കേരള"] },
  { code: "TG", names: ["telangana", "தெலங்கானா", "तेलंगाना", "తెలంగాణ", "ತೆಲಂಗಾಣ", "തെലങ്കാന"] },
  { code: "AP", names: ["andhra pradesh", "andhra", "ஆந்திரா", "आंध्र", "ఆంధ్ర", "ಆಂಧ್ರ", "ആന്ധ്ര"] },
];

/** The state a question explicitly names, if any. */
export function stateFromQuery(query: string): string | undefined {
  const q = query.toLowerCase();
  for (const { code, names } of STATE_MENTIONS) {
    if (names.some((n) => q.includes(n))) return code;
  }
  return undefined;
}
