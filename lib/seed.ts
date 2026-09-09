import type Database from "better-sqlite3";
import type {
  DocumentStatus,
  FeatureFlagStatus,
  FlagEnvironment,
  KycStatus,
  RefundStatus,
  RiskLevel,
  Role,
} from "./types";

interface SeedUser {
  id: string;
  name: string;
  role: Role;
}

export const SEED_USERS: SeedUser[] = [
  { id: "u_ana", name: "Ana Duarte", role: "ANALYST" },
  { id: "u_ben", name: "Ben Okafor", role: "ANALYST" },
  { id: "u_cara", name: "Cara Lindqvist", role: "ANALYST" },
  { id: "u_maya", name: "Maya Rosenthal", role: "MANAGER" },
  { id: "u_theo", name: "Theo Novak", role: "MANAGER" },
];

const RISK_FLAG_POOL = [
  "Sanctions list near-match",
  "Device fingerprint reused across 4 accounts",
  "IP geolocation differs from stated country",
  "Rapid inbound/outbound transfer pattern",
  "PEP database soft match",
  "Business registry lookup inconclusive",
  "Email domain created 11 days ago",
];

const DOC_TYPES = ["Government ID", "Proof of Address", "Selfie Liveness Check", "Business Registration"];

const CUSTOMERS = [
  ["Priya Raman", "priya.raman@northloop.io", "US"],
  ["Lars Meyer", "lars.meyer@bergwerk.de", "DE"],
  ["Sofia Marchetti", "sofia@marchetti-studio.it", "IT"],
  ["Daniel Kim", "dkim@hanwoo-trading.kr", "KR"],
  ["Amara Nwosu", "amara@lagosfreight.ng", "NG"],
  ["Tomás Herrera", "tomas.herrera@viacampo.mx", "MX"],
  ["Elena Petrova", "elena.petrova@svetmail.bg", "BG"],
  ["Jonas Berg", "jonas.berg@fjordanalytics.no", "NO"],
  ["Grace Whitfield", "grace@whitfieldco.co.uk", "GB"],
  ["Rahul Mehta", "rahul.mehta@indusgrain.in", "IN"],
  ["Chloe Tran", "chloe.tran@saigonlabs.vn", "VN"],
  ["Marcus Adeyemi", "marcus@adeyemicapital.com", "US"],
  ["Ines Dupont", "ines.dupont@atelier9.fr", "FR"],
  ["Hiro Tanaka", "hiro.tanaka@kaizenparts.jp", "JP"],
  ["Nadia Haddad", "nadia.haddad@levantsupply.lb", "LB"],
  ["Owen Fitzgerald", "owen@fitzgeraldbrew.ie", "IE"],
  ["Sara Lindgren", "sara.lindgren@nordvind.se", "SE"],
  ["Victor Silva", "victor.silva@paulistafin.br", "BR"],
];

const RISKS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH"];
const KYC_STATUSES: KycStatus[] = ["PENDING", "PENDING", "PENDING", "APPROVED", "REJECTED", "ESCALATED"];
const DOC_STATUSES: DocumentStatus[] = ["VERIFIED", "PENDING", "FAILED"];

const REFUND_REASONS = ["DUPLICATE_CHARGE", "SERVICE_NOT_RENDERED", "FRAUD_CLAIM", "PRICING_ERROR", "GOODWILL"];
const REFUND_STATUSES: RefundStatus[] = ["PENDING", "PENDING", "PENDING", "APPROVED", "DENIED"];

const FEATURE_FLAGS: {
  flagKey: string;
  environment: FlagEnvironment;
  ownerId: string;
  status: FeatureFlagStatus;
  rolloutPercentage: number;
  scheduledIn: number | null;
  changedDaysAgo: number;
}[] = [
  {
    flagKey: "instant_payout_v2",
    environment: "PRODUCTION",
    ownerId: "u_maya",
    status: "ON",
    rolloutPercentage: 100,
    scheduledIn: null,
    changedDaysAgo: 2,
  },
  {
    flagKey: "instant_payout_v2",
    environment: "STAGING",
    ownerId: "u_ben",
    status: "ON",
    rolloutPercentage: 100,
    scheduledIn: null,
    changedDaysAgo: 6,
  },
  {
    flagKey: "kyc_document_autocheck",
    environment: "PRODUCTION",
    ownerId: "u_theo",
    status: "SCHEDULED",
    rolloutPercentage: 25,
    scheduledIn: 2,
    changedDaysAgo: 1,
  },
  {
    flagKey: "kyc_document_autocheck",
    environment: "DEVELOPMENT",
    ownerId: "u_ana",
    status: "ON",
    rolloutPercentage: 50,
    scheduledIn: null,
    changedDaysAgo: 4,
  },
  {
    flagKey: "refund_auto_approve_small",
    environment: "PRODUCTION",
    ownerId: "u_maya",
    status: "OFF",
    rolloutPercentage: 0,
    scheduledIn: null,
    changedDaysAgo: 9,
  },
  {
    flagKey: "refund_auto_approve_small",
    environment: "STAGING",
    ownerId: "u_cara",
    status: "ON",
    rolloutPercentage: 75,
    scheduledIn: null,
    changedDaysAgo: 3,
  },
  {
    flagKey: "merchant_dashboard_redesign",
    environment: "PRODUCTION",
    ownerId: "u_theo",
    status: "ON",
    rolloutPercentage: 10,
    scheduledIn: null,
    changedDaysAgo: 5,
  },
  {
    flagKey: "merchant_dashboard_redesign",
    environment: "DEVELOPMENT",
    ownerId: "u_ben",
    status: "ON",
    rolloutPercentage: 100,
    scheduledIn: null,
    changedDaysAgo: 12,
  },
  {
    flagKey: "sanctions_screening_v3",
    environment: "PRODUCTION",
    ownerId: "u_maya",
    status: "SCHEDULED",
    rolloutPercentage: 5,
    scheduledIn: 7,
    changedDaysAgo: 0,
  },
  {
    flagKey: "sanctions_screening_v3",
    environment: "STAGING",
    ownerId: "u_ana",
    status: "OFF",
    rolloutPercentage: 0,
    scheduledIn: null,
    changedDaysAgo: 8,
  },
  {
    flagKey: "ledger_double_write",
    environment: "STAGING",
    ownerId: "u_cara",
    status: "ON",
    rolloutPercentage: 100,
    scheduledIn: null,
    changedDaysAgo: 15,
  },
  {
    flagKey: "ledger_double_write",
    environment: "DEVELOPMENT",
    ownerId: "u_cara",
    status: "OFF",
    rolloutPercentage: 0,
    scheduledIn: null,
    changedDaysAgo: 20,
  },
];

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

export function seed(db: Database.Database): void {
  const alreadySeeded = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (alreadySeeded.c > 0) return;

  const insertUser = db.prepare("INSERT INTO users (id, name, role) VALUES (?, ?, ?)");
  for (const u of SEED_USERS) insertUser.run(u.id, u.name, u.role);

  const reviewers = SEED_USERS.filter((u) => u.role === "ANALYST");

  const insertCase = db.prepare(`
    INSERT INTO kyc_cases (id, customer_name, customer_email, customer_country, account_opened_at,
      risk_level, status, assigned_reviewer_id, submitted_at, risk_flags, documents)
    VALUES (@id, @customerName, @customerEmail, @customerCountry, @accountOpenedAt,
      @riskLevel, @status, @assignedReviewerId, @submittedAt, @riskFlags, @documents)
  `);

  const insertAudit = db.prepare(`
    INSERT INTO audit_events (id, entity_type, entity_id, action, reason, actor_id, actor_name, actor_role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  CUSTOMERS.forEach(([name, email, country], i) => {
    const risk = RISKS[i % RISKS.length];
    const status = KYC_STATUSES[i % KYC_STATUSES.length];
    const reviewer = reviewers[i % reviewers.length];
    const flagCount = risk === "HIGH" ? 3 : risk === "MEDIUM" ? 2 : 1;
    const flags = Array.from({ length: flagCount }, (_, k) => RISK_FLAG_POOL[(i + k) % RISK_FLAG_POOL.length]);
    const documents = DOC_TYPES.slice(0, 3 + (i % 2)).map((type, k) => ({
      type,
      status: DOC_STATUSES[(i + k) % (risk === "HIGH" ? 3 : 2)],
      checkedAt: (i + k) % 3 === 1 ? null : daysAgo(i % 12),
    }));
    const id = `KYC-${String(1000 + i)}`;
    insertCase.run({
      id,
      customerName: name,
      customerEmail: email,
      customerCountry: country,
      accountOpenedAt: daysAgo(30 + i * 3),
      riskLevel: risk,
      status,
      assignedReviewerId: reviewer.id,
      submittedAt: daysAgo(i % 14),
      riskFlags: JSON.stringify(flags),
      documents: JSON.stringify(documents),
    });

    insertAudit.run(
      `ae_seed_${id}_created`,
      "KYC_CASE",
      id,
      "CASE_SUBMITTED",
      "Onboarding flow completed by customer",
      "system",
      "Onboarding Service",
      "ANALYST",
      daysAgo(i % 14),
    );
    if (status !== "PENDING") {
      const actor = status === "ESCALATED" ? reviewer : SEED_USERS[3];
      insertAudit.run(
        `ae_seed_${id}_action`,
        "KYC_CASE",
        id,
        status === "APPROVED" ? "APPROVE" : status === "REJECTED" ? "REJECT" : "ESCALATE",
        status === "APPROVED"
          ? "Documents verified, no adverse media"
          : status === "REJECTED"
            ? "Identity document failed liveness check"
            : "Sanctions near-match requires manager review",
        actor.id,
        actor.name,
        actor.role,
        daysAgo(Math.max(0, (i % 14) - 1)),
      );
    }
  });

  const insertRefund = db.prepare(`
    INSERT INTO refund_requests (id, customer_name, amount_cents, currency, reason_code, status,
      assigned_reviewer_id, submitted_at, original_charge_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  CUSTOMERS.slice(0, 12).forEach(([name], i) => {
    const id = `RFD-${String(2000 + i)}`;
    const amount = [4250, 18900, 62500, 9900, 125000, 3400, 47500, 88000, 15000, 250000, 7300, 39900][i];
    const status = REFUND_STATUSES[i % REFUND_STATUSES.length];
    const reviewer = reviewers[(i + 1) % reviewers.length];
    insertRefund.run(
      id,
      name,
      amount,
      "USD",
      REFUND_REASONS[i % REFUND_REASONS.length],
      status,
      reviewer.id,
      daysAgo(i % 9),
      `ch_${(9000 + i * 137).toString(36)}`,
    );
    insertAudit.run(
      `ae_seed_${id}_created`,
      "REFUND_REQUEST",
      id,
      "REFUND_REQUESTED",
      "Submitted via support ticket",
      "system",
      "Support Desk",
      "ANALYST",
      daysAgo(i % 9),
    );
  });

  const insertFlag = db.prepare(`
    INSERT INTO feature_flags (id, flag_key, environment, owner_id, status, rollout_percentage,
      scheduled_for, last_changed_at, last_changed_by_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  FEATURE_FLAGS.forEach((flag, i) => {
    const id = `FLG-${String(3000 + i)}`;
    const owner = SEED_USERS.find((u) => u.id === flag.ownerId) ?? SEED_USERS[0];
    insertFlag.run(
      id,
      flag.flagKey,
      flag.environment,
      owner.id,
      flag.status,
      flag.rolloutPercentage,
      flag.scheduledIn === null ? null : daysAgo(-flag.scheduledIn),
      daysAgo(flag.changedDaysAgo),
      owner.name,
    );
    insertAudit.run(
      `ae_seed_${id}_created`,
      "FEATURE_FLAG",
      id,
      "FLAG_REGISTERED",
      `${flag.flagKey} registered for ${flag.environment.toLowerCase()}`,
      "system",
      "Flag Registry",
      "ANALYST",
      daysAgo(flag.changedDaysAgo + 10),
    );
    insertAudit.run(
      `ae_seed_${id}_action`,
      "FEATURE_FLAG",
      id,
      flag.status === "ON" ? "ENABLE" : flag.status === "OFF" ? "DISABLE" : "SCHEDULE",
      flag.status === "ON"
        ? `Rolled out to ${flag.rolloutPercentage}% after canary looked healthy`
        : flag.status === "OFF"
          ? "Turned off pending an incident review"
          : "Scheduled behind the release train",
      owner.id,
      owner.name,
      owner.role,
      daysAgo(flag.changedDaysAgo),
    );
  });

  const requester = reviewers[0];
  db.prepare(
    `INSERT INTO tool_requests (id, title, workflow_summary, records, actions, role_notes, status,
       requested_by_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?)`,
  ).run(
    "TR-100001",
    "Feature Flag Admin",
    "Let ops turn flags on and off per environment without waiting for a deploy",
    "Flag key, environment, owner, rollout percentage, last changed",
    "Enable / Disable / Schedule; statuses ON, OFF, SCHEDULED",
    "Analysts can view and request changes; Managers can change production flags",
    requester.id,
    daysAgo(1),
  );
  insertAudit.run(
    "ae_seed_TR-100001_created",
    "TOOL_REQUEST",
    "TR-100001",
    "REQUEST_CREATED",
    "Feature Flag Admin",
    requester.id,
    requester.name,
    requester.role,
    daysAgo(1),
  );
}
