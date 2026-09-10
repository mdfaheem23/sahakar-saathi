import { Grievance } from "./types";

// ---------------------------------------------------------------------------
// Collective grievance intelligence
//
// A single farmer complaining about their PACS is easy to dismiss. Twelve
// farmers complaining about the SAME thing at the SAME PACS is a systemic
// failure with a named accountable officer.
//
// Individually-filed tickets never surface that pattern — each one is handled
// (or ignored) in isolation. This clusters them, so the grievance system
// produces evidence for the Registrar instead of just a queue.
// ---------------------------------------------------------------------------

export interface GrievancePattern {
  pacsName: string;
  category: string;
  count: number;
  affectedMembers: number;
  oldestDays: number;
  severity: "systemic" | "emerging";
  recommendation: string;
}

// Threshold at which a cluster stops being coincidence and becomes a pattern
// worth escalating above the society itself.
const SYSTEMIC_THRESHOLD = 5;
const EMERGING_THRESHOLD = 3;

// Demo backlog representing grievances filed across the pilot district through
// all channels (app, web, kiosk, IVR) — the pool a real deployment would
// cluster over. Locally-filed tickets are merged into this at runtime.
export const SEED_GRIEVANCES: Pick<
  Grievance,
  "pacsName" | "category" | "description" | "createdAt"
>[] = [
  ...Array.from({ length: 8 }, (_, i) => ({
    pacsName: "Vidisha Block PACS #114",
    category: "Loan",
    description: "Crop loan application rejected without any written reason given",
    createdAt: Date.now() - (18 + i) * 86400000,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    pacsName: "Gaya East PACS #207",
    category: "PMFBY Claim",
    description: "Claim rejected; Crop Cutting Experiment data never shared with members",
    createdAt: Date.now() - (11 + i) * 86400000,
  })),
  ...Array.from({ length: 3 }, (_, i) => ({
    pacsName: "Hardoi North PACS #051",
    category: "PACS Service",
    description: "Membership records not updated after land transfer; unable to vote",
    createdAt: Date.now() - (5 + i) * 86400000,
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    pacsName: "Thanjavur Delta PACS #009",
    category: "By-law Dispute",
    description: "Annual accounts not made available for inspection on written request",
    createdAt: Date.now() - (3 + i) * 86400000,
  })),
];

function recommendationFor(category: string, pacsName: string): string {
  switch (category) {
    case "Loan":
      return `Escalate to Registrar of Cooperative Societies: ${pacsName} appears to be rejecting loan applications without recording reasons, contrary to Sec. 27/33 of the Cooperative Societies Act.`;
    case "PMFBY Claim":
      return `Refer to the District Level Monitoring Committee: members at ${pacsName} report Crop Cutting Experiment data is not being disclosed, which blocks claim verification under PMFBY Sec. 14.`;
    case "PACS Service":
      return `Flag for the PACS computerisation rollout: ${pacsName} has recurring record-keeping failures that an ERP migration would structurally fix.`;
    default:
      return `Assign a cooperative inspector to audit ${pacsName} for recurring ${category.toLowerCase()} complaints.`;
  }
}

export function detectPatterns(local: Grievance[]): GrievancePattern[] {
  const pool = [
    ...SEED_GRIEVANCES,
    ...local.map((g) => ({
      pacsName: g.pacsName,
      category: g.category,
      description: g.description,
      createdAt: g.createdAt,
    })),
  ];

  const clusters = new Map<string, typeof pool>();
  for (const g of pool) {
    const key = `${g.pacsName}||${g.category}`;
    const bucket = clusters.get(key);
    if (bucket) bucket.push(g);
    else clusters.set(key, [g]);
  }

  const now = Date.now();
  const patterns: GrievancePattern[] = [];

  for (const [key, group] of clusters) {
    if (group.length < EMERGING_THRESHOLD) continue;
    const [pacsName, category] = key.split("||");
    const oldest = Math.min(...group.map((g) => g.createdAt));

    patterns.push({
      pacsName,
      category,
      count: group.length,
      affectedMembers: group.length,
      oldestDays: Math.floor((now - oldest) / 86400000),
      severity: group.length >= SYSTEMIC_THRESHOLD ? "systemic" : "emerging",
      recommendation: recommendationFor(category, pacsName),
    });
  }

  return patterns.sort((a, b) => b.count - a.count);
}
