/**
 * The government documents this corpus is derived from, and how to tell when
 * one of them changes.
 *
 * Change detection, not auto-ingestion. A changed PDF is a signal for a human
 * to read the diff and update the passages — never a trigger to re-embed
 * whatever the new file happens to say. This assistant gives legal and
 * financial guidance to people who cannot verify it: a malformed parse, a
 * draft uploaded by mistake, or a consultation document would otherwise flow
 * straight to a farmer wearing a citation that makes it look verified.
 */

export interface WatchedSource {
  id: string;
  /** Document this source backs, as cited in the corpus. */
  title: string;
  url: string;
  /**
   * How the source reports change.
   * - `headers`: ETag / Last-Modified on a HEAD request. Costs ~0 bytes.
   * - `body-hash`: no validators, so the body must be fetched and hashed.
   * - `blocked`: refuses automated requests; a human has to check it.
   */
  strategy: "headers" | "body-hash" | "blocked";
  /** Which corpus passages would need revisiting if this document changed. */
  affects: string[];
  /**
   * The page that actually accepts applications, when the scheme has one.
   *
   * The strongest signal that a scheme has ended is not its brochure page,
   * which nobody takes down, but its intake form, which stops accepting.
   * Checked alongside the document so a live-looking page with a dead portal
   * is caught.
   */
  applyUrl?: string;
  /**
   * A page carrying the scheme's published payment record.
   *
   * The last question worth asking, and the only one a department cannot
   * answer wrongly by inattention: is money still moving? Pages stay up for
   * free; payment runs do not happen by accident.
   */
  activityUrl?: string;
  /**
   * Days without a recorded payment before the scheme is treated as dormant.
   *
   * Set from the scheme's own cycle, not a round number. PM-KISAN pays three
   * instalments a year, roughly four months apart, so 240 days means two
   * consecutive instalments were missed — which no running scheme does.
   */
  dormantAfterDays?: number;
  /**
   * Days a passage drawn from this document may go without a human
   * re-verification before answers built on it are downgraded.
   *
   * Not uniform, because these documents do not age at the same rate. PMFBY
   * terms are set per season, so a passage six months old has outlived the
   * season it was read in; the Cooperative Societies Act does not move for
   * years. Setting one global number would either flag everything constantly
   * or miss the seasonal changes entirely.
   */
  reviewDays?: number;
  /** ISO date a person last read this document and re-checked its passages. */
  lastHumanCheck?: string;
  /** For `blocked` sources: how often that manual check must happen. */
  humanCheckDays?: number;
  /** Why a source is blocked, so nobody wastes an afternoon rediscovering it. */
  note?: string;
}

export const WATCHED_SOURCES: WatchedSource[] = [
  {
    id: "pmfby-operational-guidelines",
    title: "PMFBY Operational Guidelines (Revamped, effective Kharif 2020)",
    url: "https://pmfby.gov.in/pdf/Revamped%20OGs_Final.pdf",
    applyUrl: "https://pmfby.gov.in/farmerRegistrationForm",
    strategy: "headers",
    // Enrolment terms are notified per season, so a passage read in Kharif
    // must not still be served as current in Rabi.
    reviewDays: 120,
    lastHumanCheck: "2026-08-30",
    affects: [
      "gov:pmfby-premium-rates",
      "gov:pmfby-72-hour-intimation",
      "gov:pmfby-penal-interest",
      "gov:pmfby-cutoff-not-extended",
      "gov:pmfby-tenant-coverage",
      "gov:pmfby-aadhaar",
      "gov:pmfby-service-charges",
      "proc:pmfby-timeline",
      "proc:notified-crops",
      "ent:pmfby-subsidy",
      // The "Is this true?" rulings rest on these guidelines too, so a revised
      // PDF must downgrade the fact-check page along with everything else.
      // Leaving them out meant the page a farmer visits to check a middleman's
      // claim was the one page the change detector could not reach.
      "myth:fee-to-file-claim",
      "myth:tenant-cannot-insure",
      "myth:claim-money-to-pacs",
      "myth:late-enrollment-possible",
      "myth:aadhaar-mandatory",
    ],
  },
  {
    id: "pmkisan-operational-guidelines",
    title: "PM-KISAN Revised Operational Guidelines",
    url: "https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines(English).pdf",
    applyUrl: "https://pmkisan.gov.in/RegistrationFormNew.aspx",
    activityUrl: "https://pmkisan.gov.in/",
    dormantAfterDays: 240,
    strategy: "headers",
    reviewDays: 180,
    lastHumanCheck: "2026-08-30",
    affects: ["gov:pmkisan-benefit", "ent:pm-kisan"],
  },
  {
    id: "nabard-interest-subvention",
    title: "NABARD — Modified Interest Subvention Scheme (MISS)",
    url: "https://www.nabard.org/content1.aspx?id=602&catid=23&mid=23",
    strategy: "body-hash",
    // Interest subvention is fixed per financial year and the KCC ceiling is
    // under revision, so this is on the short cadence.
    reviewDays: 120,
    lastHumanCheck: "2026-08-30",
    affects: ["gov:kcc-interest-subvention", "ent:kcc-subvention", "kb:schemes-kcc-loan"],
    note: "Serves no ETag or Last-Modified, so the 68KB body is hashed instead.",
  },
  {
    id: "mnre-pm-kusum",
    title: "PM-KUSUM Component-B — Central Financial Assistance, MNRE",
    url: "https://mnre.gov.in/en/pradhan-mantri-kisan-urja-suraksha-evam-utthaan-mahabhiyaan-pm-kusum/",
    strategy: "body-hash",
    reviewDays: 180,
    lastHumanCheck: "2026-08-30",
    affects: ["gov:pmkusum-component-b", "ent:kusum-pump"],
  },
  {
    id: "pib-kcc-limit",
    title: "PIB — KCC / MISS loan limit announcements",
    url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2099696",
    strategy: "blocked",
    // A source no machine can poll cannot be assumed unchanged. After this
    // many days every figure resting on it is served as possibly revised,
    // whether or not anyone got round to looking.
    humanCheckDays: 90,
    lastHumanCheck: "2026-08-30",
    affects: ["gov:kcc-interest-subvention", "ent:kcc-subvention"],
    note:
      "PIB returns 401/403 to automated requests. The Rs 3 lakh -> Rs 5 lakh KCC " +
      "revision is exactly the kind of change this source carries, so it needs a " +
      "human check each season rather than a cron job.",
  },
  /* ------------------------------------------------------------------ states
     State schemes are the fastest-moving thing in this corpus and were the
     last thing watched, which was the wrong way round. Telangana replaced
     Rythu Bandhu with Rythu Bharosa and Andhra replaced YSR Rythu Bharosa with
     Annadata Sukhibhava — both within one electoral cycle, both leaving the
     old page up. A central guideline PDF revised once in four years was being
     fingerprinted daily while these were not being watched at all.

     Short cadence for the same reason: these follow state budgets and
     governments, not five-year plan periods. -------------------------------*/
  {
    id: "ka-cooperation-crop-loan",
    title: "Karnataka Dept. of Cooperation — Interest Subsidy for Agricultural Crop Loan",
    url: "https://sahakarasindhu.karnataka.gov.in/info-2/Interest+Subsidy+for+Agricultural+Crop+Loan/en",
    strategy: "body-hash",
    reviewDays: 90,
    lastHumanCheck: "2026-08-31",
    affects: ["state:ka-zero-interest-crop-loan", "state:ka-medium-term-loan"],
  },
  {
    id: "ka-yeshasvini",
    title: "Karnataka Dept. of Cooperation — Yeshasvini health scheme",
    url: "https://sahakarasindhu.karnataka.gov.in/page/YESHASVINI/en",
    strategy: "body-hash",
    reviewDays: 90,
    lastHumanCheck: "2026-08-31",
    affects: ["state:ka-yeshasvini"],
  },
  {
    id: "tg-rythu-bharosa",
    title: "Telangana — Rythu Bharosa",
    url: "https://rythubharosa.telangana.gov.in/",
    applyUrl: "https://rythubharosa.telangana.gov.in/",
    strategy: "body-hash",
    // This scheme replaced Rythu Bandhu. The next one will replace it.
    reviewDays: 90,
    lastHumanCheck: "2026-08-31",
    affects: ["state:tg-rythu-bharosa", "state:tg-paddy-bonus"],
  },
  {
    id: "tg-rythu-bima",
    title: "Telangana — Rythu Bima life cover",
    url: "https://rythubandhu.telangana.gov.in/Default_LIC1.aspx",
    strategy: "body-hash",
    reviewDays: 90,
    lastHumanCheck: "2026-08-31",
    // Still served from the rythubandhu domain after the scheme was renamed,
    // which is exactly why the domain being alive proves nothing.
    affects: ["state:tg-rythu-bima"],
  },
  {
    id: "ap-annadata-sukhibhava",
    title: "Andhra Pradesh — Annadata Sukhibhava",
    url: "https://annadathasukhibhava.ap.gov.in/",
    applyUrl: "https://annadathasukhibhava.ap.gov.in/",
    strategy: "body-hash",
    reviewDays: 90,
    lastHumanCheck: "2026-08-31",
    affects: ["state:ap-annadata-sukhibhava"],
  },
  {
    id: "kl-cooperation-credit",
    title: "Kerala Dept. of Cooperation — Assistance to Credit Co-operative Banks",
    url: "https://cooperation.kerala.gov.in/assistance-to-credit-co-operatives-banks/",
    strategy: "body-hash",
    reviewDays: 90,
    lastHumanCheck: "2026-08-31",
    affects: ["state:kl-paddy-zero-interest"],
  },
  {
    id: "kl-pacs-schemes",
    title: "Kerala Dept. of Cooperation — Schemes applicable to PACS",
    url: "https://cooperation.kerala.gov.in/schemes-applicable-to-primary-agricultural-credit-societies-pacs-fscb-fscs/",
    strategy: "body-hash",
    reviewDays: 90,
    lastHumanCheck: "2026-08-31",
    affects: ["state:kl-pacs-paddy-incentive"],
  },
  {
    id: "kl-farmers-welfare-fund",
    title: "Kerala Farmers' Welfare Fund Board — Karshaka pension",
    url: "https://kfwfb.kerala.gov.in/",
    strategy: "body-hash",
    reviewDays: 90,
    lastHumanCheck: "2026-08-31",
    affects: ["state:kl-karshaka-pension"],
  },
  {
    id: "tn-rcs-credit",
    title: "Tamil Nadu Registrar of Cooperative Societies — Credit cooperatives",
    url: "https://rcs.tn.gov.in/credit_copperative.php",
    strategy: "body-hash",
    reviewDays: 90,
    lastHumanCheck: "2026-08-31",
    affects: ["state:tn-paccs-credit"],
  },
  {
    id: "tn-rcs-jewel-loan",
    title: "Tamil Nadu RCS — PCARDB jewel loans",
    url: "https://rcs.tn.gov.in/mpd_cooperative_5.php",
    strategy: "body-hash",
    reviewDays: 90,
    lastHumanCheck: "2026-08-31",
    affects: ["state:tn-pcard-jewel-loan"],
  },
  {
    id: "tn-rcs-icdp",
    title: "Tamil Nadu RCS — Integrated Cooperative Development Project",
    url: "https://rcs.tn.gov.in/Icdp_cooperative.php",
    strategy: "body-hash",
    reviewDays: 90,
    lastHumanCheck: "2026-08-31",
    affects: ["state:tn-icdp"],
  },
  {
    id: "pib-tn-crop-loan",
    title: "PIB — Tamil Nadu cooperative crop loan terms",
    url: "https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2238404",
    strategy: "blocked",
    humanCheckDays: 90,
    lastHumanCheck: "2026-08-31",
    affects: ["state:tn-crop-loan-terms"],
    note: "PIB refuses automated requests; a press release is also a snapshot of one day's announcement, so it needs re-reading rather than re-fetching.",
  },
];
