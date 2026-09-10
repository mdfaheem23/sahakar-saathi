import { LangCode, LocalizedText } from "./types";

// Demo dataset shaped exactly like the real published sources — PMFBY's
// district/season admin statistics dashboard (pmfby.gov.in) and the PACS
// lists on data.gov.in / the National Cooperative Database. Numbers here are
// illustrative for the demo, not a live feed — the intended production path
// is pulling these same fields from the PMFBY statistics API and the NCD
// API (already exposed on cooperatives.gov.in) instead of this static file.

export interface DistrictInsight {
  id: string;
  state: string;
  district: string;
  crop: string;
  season: "Kharif" | "Rabi";
  enrollmentDeadline: string; // ISO date
  perilAlert: { type: string; issuedHoursAgo: number; windowHours: number } | null;
  approvalRatePct: number;
  medianPayoutInr: number;
  medianSettlementDays: number;
  grievanceRatePer1000: number;
  pacsComputerized: boolean;
  pacsCount: number;
}

export const DISTRICTS: DistrictInsight[] = [
  {
    id: "tn-thanjavur",
    state: "Tamil Nadu",
    district: "Thanjavur",
    crop: "Paddy",
    season: "Kharif",
    enrollmentDeadline: "2026-08-31",
    perilAlert: { type: "Heavy rainfall / flood advisory", issuedHoursAgo: 6, windowHours: 72 },
    approvalRatePct: 81,
    medianPayoutInr: 14200,
    medianSettlementDays: 38,
    grievanceRatePer1000: 4.2,
    pacsComputerized: true,
    pacsCount: 187,
  },
  {
    id: "mp-vidisha",
    state: "Madhya Pradesh",
    district: "Vidisha",
    crop: "Soybean",
    season: "Kharif",
    enrollmentDeadline: "2026-09-05",
    perilAlert: null,
    approvalRatePct: 64,
    medianPayoutInr: 9800,
    medianSettlementDays: 52,
    grievanceRatePer1000: 7.8,
    pacsComputerized: false,
    pacsCount: 241,
  },
  {
    id: "up-hardoi",
    state: "Uttar Pradesh",
    district: "Hardoi",
    crop: "Sugarcane",
    season: "Kharif",
    enrollmentDeadline: "2026-08-28",
    perilAlert: { type: "Pest outbreak advisory (locust)", issuedHoursAgo: 18, windowHours: 72 },
    approvalRatePct: 58,
    medianPayoutInr: 11500,
    medianSettlementDays: 61,
    grievanceRatePer1000: 9.1,
    pacsComputerized: false,
    pacsCount: 356,
  },
  {
    id: "mh-nashik",
    state: "Maharashtra",
    district: "Nashik",
    crop: "Onion",
    season: "Rabi",
    enrollmentDeadline: "2026-12-15",
    perilAlert: null,
    approvalRatePct: 76,
    medianPayoutInr: 16700,
    medianSettlementDays: 41,
    grievanceRatePer1000: 5.0,
    pacsComputerized: true,
    pacsCount: 198,
  },
  {
    id: "bh-gaya",
    state: "Bihar",
    district: "Gaya",
    crop: "Paddy",
    season: "Kharif",
    enrollmentDeadline: "2026-08-30",
    perilAlert: { type: "Drought stress advisory", issuedHoursAgo: 40, windowHours: 96 },
    approvalRatePct: 49,
    medianPayoutInr: 8200,
    medianSettlementDays: 74,
    grievanceRatePer1000: 11.6,
    pacsComputerized: false,
    pacsCount: 312,
  },
  {
    id: "ka-belagavi",
    state: "Karnataka",
    district: "Belagavi",
    crop: "Cotton",
    season: "Kharif",
    enrollmentDeadline: "2026-09-10",
    perilAlert: null,
    approvalRatePct: 72,
    medianPayoutInr: 12900,
    medianSettlementDays: 45,
    grievanceRatePer1000: 5.7,
    pacsComputerized: true,
    pacsCount: 176,
  },
];

export function getDistrict(id: string): DistrictInsight | undefined {
  return DISTRICTS.find((d) => d.id === id);
}

export function daysUntil(dateIso: string): number {
  const ms = new Date(dateIso).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

const ALERT_LABEL: Record<string, LocalizedText> = {
  __enrollment: {
    en: "Enrollment window closing",
    hi: "नामांकन विंडो बंद हो रही है",
    ta: "பதிவு காலம் முடிவடைகிறது",
    te: "నమోదు గడువు ముగుస్తోంది",
    kn: "ನೋಂದಣಿ ಅವಧಿ ಮುಗಿಯುತ್ತಿದೆ",
    ml: "രജിസ്ട്രേഷൻ സമയം അവസാനിക്കുന്നു",
  },
  __peril: {
    en: "Active peril advisory — claim window open",
    hi: "सक्रिय आपदा सलाह — दावा विंडो खुली है",
    ta: "செயலில் உள்ள ஆபத்து அறிவிப்பு — உரிமைகோரல் காலம் திறந்துள்ளது",
    te: "క్రియాశీల ప్రమాద సూచన — క్లెయిమ్ గడువు తెరిచి ఉంది",
    kn: "ಸಕ್ರಿಯ ಅಪಾಯ ಸಲಹೆ — ಕ್ಲೇಮ್ ಅವಧಿ ತೆರೆದಿದೆ",
    ml: "സജീവ അപകട ഉപദേശം — ക്ലെയിം സമയം തുറന്നിരിക്കുന്നു",
  },
};

export function alertLabel(kind: "__enrollment" | "__peril", lang: LangCode): string {
  return ALERT_LABEL[kind][lang] ?? ALERT_LABEL[kind].en;
}
