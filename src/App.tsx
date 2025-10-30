import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Info,
  RefreshCcw,
  Download,
  Sparkles,
  Calendar,
  BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

/**
 * Maison Collective — Offer Strategy Simulator (v2, guided)
 * - Step-based UX, large clickable tiles, clear final panel with recommendations
 * - No backend; all client-side
 */

/* ---------- Options & Types ---------- */
const COMPETITION_OPTIONS = [
  { id: "solo", label: "I am the only offer", weight: +10 },
  { id: "maybe", label: "I expect maybe another", weight: 0 },
  { id: "competitive", label: "I'm pretty sure it's going to be competitive", weight: -10 },
] as const;

const FINANCING_OPTIONS = [
  { id: "fha", label: "FHA — Least Strong / Requires Appraisal for All Homes", weight: -15 },
  { id: "va", label: "VA — Least Strong / Requires Appraisal for All Homes & WDI", weight: -12 },
  { id: "conv", label: "Conventional — Less Strong / Requires Appraisal for +$1M Homes", weight: 0 },
  { id: "cash", label: "Cash — Strongest / No Appraisal Needed", weight: +20 },
] as const;

const SALE_CONTINGENCY = [
  { id: "needToSell", label: "Yes — I must sell before I buy (Less strong)", weight: -12 },
  { id: "noSale", label: "No — I don't need to sell (Strong)", weight: +6 },
] as const;

const INSPECTION_OPTIONS = [
  { id: "full", label: "Full Inspection — Standard (right to negotiate/terminate)", weight: -6 },
  { id: "aLaCarte", label: "A La Carte — Specific tests only (e.g., radon, mold)", weight: -2 },
  { id: "asIs", label: "AS-IS (No Inspection) — Strong", weight: +10 },
  { id: "infoOnly", label: "Information Only — Depends on seller", weight: -1 },
] as const;

const APPRAISAL_OPTIONS = [
  { id: "yes", label: "Yes Appraisal — Least Strong", weight: -10 },
  { id: "gapCover", label: "Yes Appraisal, but guarantee to cover gap (price firm)", weight: +6 },
  { id: "no", label: "No Appraisal — Strongest", weight: +14 },
] as const;

const FINANCING_CONT = [
  { id: "yes", label: "Yes — If loan denied, I can terminate (Less strong)", weight: -8 },
  { id: "no", label: "No — Confident in approval (Stronger)", weight: +8 },
] as const;

const TAX_TITLE_SPLIT = [
  { id: "split", label: "Split 50/50 — Standard", weight: 0 },
  { id: "buyer100", label: "Buyer 100% — Strongest", weight: +8 },
] as const;

const TITLE_PREF = [
  { id: "sellerPref", label: "Use Seller's Preferred Title Company — Stronger", weight: +4 },
  { id: "buyerPref", label: "Use Buyer's Preferred Title Company — Less Strong", weight: -2 },
] as const;

const COMMISSION = [
  { id: "sellerPays", label: "Seller pays Buyer Agency Commission — Standard", weight: 0 },
  { id: "buyerPays", label: "Buyer pays 100% of Buyer Agency Commission — Strongest", weight: +10 },
] as const;

const RENTBACK = [
  { id: "none", label: "No rent-back requested", weight: 0 },
  { id: "paid", label: "Offer seller a paid rent-back (market rate)", weight: +3 },
  { id: "free", label: "Offer seller a free rent-back (30–60 days)", weight: +7 },
] as const;

/* ---------- Helpers ---------- */
function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}
function labelForScore(score: number) {
  if (score >= 85) return { label: "Elite", emoji: "🚀" };
  if (score >= 70) return { label: "Strong", emoji: "💪" };
  if (score >= 55) return { label: "Competitive", emoji: "⚖️" };
  return { label: "Needs Work", emoji: "🧩" };
}

/* ---------- Recs ---------- */
function getRecommendations(state: {
  competition: typeof COMPETITION_OPTIONS[number]["id"];
  financing: typeof FINANCING_OPTIONS[number]["id"];
  downPct: number;
  emdPct: number;
  inspection: typeof INSPECTION_OPTIONS[number]["id"];
  appraisal: typeof APPRAISAL_OPTIONS[number]["id"];
  finCont: typeof FINANCING_CONT[number]["id"];
  taxSplit: typeof TAX_TITLE_SPLIT[number]["id"];
  titlePref: typeof TITLE_PREF[number]["id"];
  commission: typeof COMMISSION[number]["id"];
  listPrice: number | string;
  offerPrice: number | string;
  rentback: typeof RENTBACK[number]["id"];
}): string[] {
  const rec: string[] = [];
  const lp = Number(state.listPrice) || 0;
  const op = Number(state.offerPrice) || 0;

  if (state.competition !== "solo" && (op <= lp)) {
    rec.push("경쟁 상황이면 제안가를 리스팅가보다 0.5~1.0% 상향하거나, 에스컬레이션을 활성화하세요.");
  }
  if (state.emdPct < 5) rec.push("EMD를 최소 5% 이상으로 상향하면 진정성을 크게 개선할 수 있습니다.");
  if (state.financing !== "cash" && state.downPct < 20) {
    rec.push("다운페이를 20% 이상으로 맞추면 대출 리스크 인식이 줄어듭니다.");
  }
  if (state.inspection !== "asIs" && state.competition === "competitive") {
    rec.push("경쟁이 치열하면 점검을 축소(선택항목)하거나 정보용으로 전환을 고려하세요.");
  }
  if (state.appraisal === "yes" && state.competition !== "solo") {
    rec.push("감정갭 일부 보장(예: $10k~$25k)은 셀러 불확실성을 줄이는 데 도움 됩니다.");
  }
  if (state.taxSplit !== "split" || state.titlePref !== "sellerPref") {
    rec.push("타이틀/세금 분담에서 셀러 선호에 맞추면(셀러 지명 타이틀, 세금 50:50) 협상력이 올라갑니다.");
  }
  if (state.commission !== "buyerPays" && state.competition === "competitive") {
    rec.push("바이어측 수수료 일부/전부 부담을 제안하면 경쟁구도에서 매력도가 상승합니다.");
  }
  if (state.rentback !== "none") {
    rec.push("렌트백 조건을 명확히(무료 30~60일 or 유상) 표기해 셀러 이사 유연성을 보장하세요.");
  }
  if (rec.length === 0) rec.push("핵심 조합이 균형적입니다. 서면 제안 전에 일정/특약 문구를 에이전트와 최종 점검하세요.");

  return rec.slice(0, 5);
}

/* ---------- Reusable UI ---------- */
function OptionTile({
  active,
  label,
  weight,
  onSelect,
}: {
  active: boolean;
  label: string;
  weight?: number;
  onSelect: () => void;
}) {
  return (
    <div
      role="radio"
      aria-checked={active}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => ((e.key === "Enter" || e.key === " ") && onSelect())}
      className="mc-pill flex items-center justify-between rounded-2xl p-4 md:p-5 cursor-pointer outline-none
                 transition focus-visible:ring-2 focus-visible:ring-white/20"
      data-active={active}
    >
      <div className="flex items-center gap-3 text-sm md:text-base">
        <span className={`h-5 w-5 rounded-full border ${active ? "bg-white" : "border-white/40"}`} />
        <span>{label}</span>
      </div>
      {typeof weight === "number" && (
        <span className="text-xs text-neutral-400">{weight >= 0 ? `+${weight}` : weight}</span>
      )}
    </div>
  );
}

function StepNav({
  step,
  total,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onFinish,
}: {
  step: number;
  total: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
        <div className="mc-card flex items-center justify-between p-3 md:p-4">
          <div className="text-sm text-neutral-400">Step {step + 1} of {total}</div>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={!canPrev} onClick={onPrev}>Back</Button>
            {step < total - 1 ? (
              <Button disabled={!canNext} onClick={onNext}>Next</Button>
            ) : (
              <Button onClick={onFinish}>Generate Plan</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinalPanel({
  score, badge, state,
}: {
  score: number;
  badge: { label: string; emoji: string };
  state: any;
}) {
  const recs = getRecommendations(state);
  return (
    <div className="mc-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">Final Offer Plan</h3>
        <span className="text-sm opacity-70">Auto-generated</span>
      </div>

      <div className="mt-4">
        <div className="mc-bar">
          <motion.div className="mc-bar-fill" initial={{ width: 0 }} animate={{ width: `${score}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-3xl font-semibold">{score}</div>
          <div className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-sm text-neutral-200">
            <span className="mr-1">{badge.emoji}</span>{badge.label}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2 text-sm">
        <div className="opacity-80">• Competition: <b>{COMPETITION_OPTIONS.find(o=>o.id===state.competition)?.label}</b></div>
        <div className="opacity-80">• Financing: <b>{FINANCING_OPTIONS.find(o=>o.id===state.financing)?.label?.split(" — ")[0]}</b> / {state.downPct}% down</div>
        <div className="opacity-80">• Appraisal: <b>{APPRAISAL_OPTIONS.find(o=>o.id===state.appraisal)?.label}</b></div>
        <div className="opacity-80">• Price: List ${Number(state.listPrice||0).toLocaleString()} → Offer ${Number(state.offerPrice||0).toLocaleString()}</div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium mb-2">Recommendations</p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-200">
          {recs.map((r: string, i: number) => (<li key={i}>{r}</li>))}
        </ul>
      </div>

      <div className="mt-6 flex gap-2">
        <Button
          onClick={() => {
            const txt = `Offer Plan (Score ${score} – ${badge.label})
- Competition: ${COMPETITION_OPTIONS.find(o=>o.id===state.competition)?.label}
- Financing: ${FINANCING_OPTIONS.find(o=>o.id===state.financing)?.label?.split(" — ")[0]} / ${state.downPct}% down
- Appraisal: ${APPRAISAL_OPTIONS.find(o=>o.id===state.appraisal)?.label}
- Price: List $${Number(state.listPrice||0).toLocaleString()} → Offer $${Number(state.offerPrice||0).toLocaleString()}
Recommendations:
${recs.map((x:string,i:number)=>`${i+1}. ${x}`).join("\n")}
`;
            navigator.clipboard.writeText(txt);
            alert("Copied final plan to clipboard.");
          }}
        >
          Copy Plan
        </Button>
        <Button variant="secondary" className="mc-btn-secondary" onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <p className="mt-5 text-xs text-neutral-400">
        This output is educational. We will finalize with listing feedback and local norms before drafting.
      </p>
    </div>
  );
}

/* ---------- Main ---------- */
export default function App() {
  // Wizard step
  const [step, setStep] = useState<number>(0);
  const totalSteps = 4;

  // Step 0 — Competition
  const [competition, setCompetition] = useState<(typeof COMPETITION_OPTIONS)[number]["id"]>("maybe");

  // Step 1 — Basics
  const [propertyAddress, setPropertyAddress] = useState("");
  const [buyerNames, setBuyerNames] = useState("");
  const [settlementDate, setSettlementDate] = useState("");
  const [totalCash, setTotalCash] = useState<string>(""); // numeric string
  const [notes, setNotes] = useState("");

  // Step 2 — Financing
  const [financing, setFinancing] = useState<(typeof FINANCING_OPTIONS)[number]["id"]>("conv");
  const [downPct, setDownPct] = useState<number>(20);

  // Step 3 — Home Sale Contingency
  const [saleCont, setSaleCont] = useState<(typeof SALE_CONTINGENCY)[number]["id"]>("noSale");

  // Step 4 — EMD
  const [emdPct, setEmdPct] = useState<number>(5);

  // Step 5 — Inspections
  const [inspection, setInspection] = useState<(typeof INSPECTION_OPTIONS)[number]["id"]>("aLaCarte");
  const [inspectionChecks, setInspectionChecks] = useState<string[]>([]);

  // Step 6 — Appraisal
  const [appraisal, setAppraisal] = useState<(typeof APPRAISAL_OPTIONS)[number]["id"]>("yes");
  const [gapAmount, setGapAmount] = useState<number>(0);

  // Step 7 — Financing Contingency
  const [finCont, setFinCont] = useState<(typeof FINANCING_CONT)[number]["id"]>("yes");

  // Step 8 — Taxes/Title
  const [taxSplit, setTaxSplit] = useState<(typeof TAX_TITLE_SPLIT)[number]["id"]>("split");
  const [titlePref, setTitlePref] = useState<(typeof TITLE_PREF)[number]["id"]>("sellerPref");

  // Step 9 — Commission
  const [commission, setCommission] = useState<(typeof COMMISSION)[number]["id"]>("sellerPays");

  // Step 10 — Price & extras
  const [listPrice, setListPrice] = useState<number | string>("");
  const [offerPrice, setOfferPrice] = useState<number | string>("");
  const [escalationCap, setEscalationCap] = useState<number | string>("");
  const [escalationBy, setEscalationBy] = useState<number | string>("");
  const [rentback, setRentback] = useState<(typeof RENTBACK)[number]["id"]>("none");

  const score = useMemo(() => {
    let s = 60; // base

    s += COMPETITION_OPTIONS.find(o => o.id === competition)!.weight;
    s += FINANCING_OPTIONS.find(o => o.id === financing)!.weight;
    s += Math.min(20, Math.max(0, (downPct - 10) * 0.6));
    s += SALE_CONTINGENCY.find(o => o.id === saleCont)!.weight;

    if (emdPct >= 10) s += 12;
    else if (emdPct >= 5) s += 6;
    else if (emdPct >= 2) s += 2;
    else s -= 4;

    s += INSPECTION_OPTIONS.find(o => o.id === inspection)!.weight;
    s += APPRAISAL_OPTIONS.find(o => o.id === appraisal)!.weight;
    if (appraisal === "gapCover") s += Math.min(10, Math.floor(gapAmount / 5000));

    s += FINANCING_CONT.find(o => o.id === finCont)!.weight;

    s += TAX_TITLE_SPLIT.find(o => o.id === taxSplit)!.weight;
    s += TITLE_PREF.find(o => o.id === titlePref)!.weight;

    s += COMMISSION.find(o => o.id === commission)!.weight;
    s += RENTBACK.find(o => o.id === rentback)!.weight;

    const lp = Number(listPrice) || 0;
    const op = Number(offerPrice) || 0;
    if (lp > 0 && op > 0) {
      const premium = (op - lp) / lp;
      if (competition !== "solo") s += Math.min(12, Math.max(0, Math.round(premium * 100)) * 0.6);
      else if (premium > 0.02) s += 2;
    }

    return clamp(Math.round(s));
  }, [
    competition, financing, downPct, saleCont, emdPct, inspection, appraisal,
    gapAmount, finCont, taxSplit, titlePref, commission, rentback, listPrice, offerPrice
  ]);
  const badge = useMemo(() => labelForScore(score), [score]);

  const [showFinal, setShowFinal] = useState(false);

  function downloadScenario() {
    const data = {
      competition,
      basics: { propertyAddress, buyerNames, settlementDate, totalCash, notes },
      financing: { type: financing, downPct },
      saleCont,
      emdPct,
      inspection: { type: inspection, checks: inspectionChecks },
      appraisal: { type: appraisal, gapAmount },
      finCont,
      taxesTitle: { taxSplit, titlePref },
      commission,
      price: { listPrice, offerPrice, escalationCap, escalationBy },
      rentback,
      score,
      label: badge,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mc-offer-scenario-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetAll() {
    setStep(0);
    setCompetition("maybe");
    setPropertyAddress("");
    setBuyerNames("");
    setSettlementDate("");
    setTotalCash("");
    setNotes("");
    setFinancing("conv");
    setDownPct(20);
    setSaleCont("noSale");
    setEmdPct(5);
    setInspection("aLaCarte");
    setInspectionChecks([]);
    setAppraisal("yes");
    setGapAmount(0);
    setFinCont("yes");
    setTaxSplit("split");
    setTitlePref("sellerPref");
    setCommission("sellerPays");
    setListPrice("");
    setOfferPrice("");
    setEscalationCap("");
    setEscalationBy("");
    setRentback("none");
    setShowFinal(false);
  }

  // 간단한 next 제한: 가격 스텝에서 offerPrice 필요
  const canGoNext = (() => {
    if (step === 2) return Boolean(offerPrice);
    return true;
  })();

  const stateForRecs = {
    competition, financing, downPct, emdPct, inspection, appraisal, finCont,
    taxSplit, titlePref, commission, listPrice, offerPrice, rentback,
  };

  return (
    <div className="mc-bg min-h-screen">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-8 lg:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Maison Collective — Offer Strategy Simulator
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Guided steps. Make choices, learn the trade-offs, and generate a final plan.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="mc-btn-secondary" onClick={resetAll}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button onClick={downloadScenario}>
              <Download className="mr-2 h-4 w-4" /> Download JSON
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-white"
            initial={false}
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
          />
        </div>

        {/* Main grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column (forms) */}
          <div className="lg:col-span-2 space-y-6">
            {/* STEP 0: Competition + Basics */}
            {step === 0 && (
              <>
                <Card className="mc-card">
                  <CardContent className="p-5 md:p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium">First Question: Competition</h2>
                      <Info className="h-4 w-4 text-neutral-400" />
                    </div>
                    <p className="mt-1 text-sm text-neutral-400">
                      Is there a competition or are you the only offer? Choose one.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {COMPETITION_OPTIONS.map((opt) => (
                        <OptionTile
                          key={opt.id}
                          active={competition === opt.id}
                          label={opt.label}
                          weight={opt.weight}
                          onSelect={() => setCompetition(opt.id)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="mc-card">
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-neutral-400" />
                      <h2 className="text-lg font-medium">Step 1: Basic Information</h2>
                    </div>
                    <p className="text-sm text-neutral-400">
                      Aligning with the seller’s preferred settlement date strengthens your offer. Understanding your cash flow is critical.
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-neutral-200">Property Address</Label>
                        <Input
                          value={propertyAddress}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPropertyAddress(e.target.value)}
                          placeholder="123 Main St, City, ST"
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-200">Buyers Names</Label>
                        <Input
                          value={buyerNames}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuyerNames(e.target.value)}
                          placeholder="Jane & John Doe"
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-200">Preferred Settlement Date</Label>
                        <Input
                          type="date"
                          value={settlementDate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettlementDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-200">Available Total Cash For Strategy ($)</Label>
                        <Input
                          inputMode="numeric"
                          value={totalCash}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTotalCash(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="e.g., 160000"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-neutral-200">Notes</Label>
                      <Textarea
                        value={notes}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                        placeholder="Renovation budget, timeline constraints, etc."
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* STEP 1: Financing, EMD, Inspection, Appraisal, Financing Cont */}
            {step === 1 && (
              <>
                <Card className="mc-card">
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-neutral-400" />
                      <h2 className="text-lg font-medium">Step 2: Financing Method</h2>
                    </div>
                    <p className="text-sm text-neutral-400">Sellers tend to see cash as lowest risk; higher down payments also strengthen financed offers.</p>
                    <div className="grid gap-3">
                      {FINANCING_OPTIONS.map((opt) => (
                        <OptionTile
                          key={opt.id}
                          active={financing === opt.id}
                          label={opt.label}
                          weight={opt.weight}
                          onSelect={() => setFinancing(opt.id)}
                        />
                      ))}
                    </div>
                    <div className="pt-2">
                      <Label className="text-neutral-200">Down Payment (%)</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <Slider value={[downPct]} min={0} max={100} step={1} onValueChange={(v) => setDownPct(v[0])} className="w-full" />
                        <div className="w-16 text-right text-sm">{downPct}%</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mc-card">
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <h2 className="text-lg font-medium">Home Sale Contingency</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {SALE_CONTINGENCY.map((opt) => (
                        <OptionTile
                          key={opt.id}
                          active={saleCont === opt.id}
                          label={opt.label}
                          weight={opt.weight}
                          onSelect={() => setSaleCont(opt.id)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="mc-card">
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <h2 className="text-lg font-medium">Earnest Money Deposit (EMD)</h2>
                    <p className="text-sm text-neutral-400">Signals seriousness. Held by title/brokerage and credited at closing.</p>
                    <div className="flex items-center gap-4">
                      <Slider value={[emdPct]} min={0} max={20} step={1} onValueChange={(v) => setEmdPct(v[0])} className="w-full" />
                      <div className="w-20 text-right text-sm">{emdPct}%</div>
                    </div>
                    <div className="flex gap-2 text-xs text-neutral-400">
                      <span className="rounded bg-white/5 px-2 py-1">2% — Standard</span>
                      <span className="rounded bg-white/5 px-2 py-1">5% — Strong</span>
                      <span className="rounded bg-white/5 px-2 py-1">10%+ — Very Strong</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mc-card">
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <h2 className="text-lg font-medium">Home Inspection Contingency</h2>
                    <div className="grid gap-3">
                      {INSPECTION_OPTIONS.map((opt) => (
                        <OptionTile
                          key={opt.id}
                          active={inspection === opt.id}
                          label={opt.label}
                          weight={opt.weight}
                          onSelect={() => setInspection(opt.id)}
                        />
                      ))}
                    </div>
                    {inspection === "aLaCarte" && (
                      <div className="mt-2">
                        <Label className="text-neutral-200">Pick specific tests (optional)</Label>
                        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                          {["Structural & Mechanical","Mold","Environmental","Radon","Chimney","Lead-Based Paint","Wood Destroying Insect"].map((k) => {
                            const id = k.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                            const checked = inspectionChecks.includes(id);
                            return (
                              <label key={id} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setInspectionChecks((prev) =>
                                      e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)
                                    );
                                  }}
                                />
                                <span>{k}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="mc-card">
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <h2 className="text-lg font-medium">Appraisal & Financing Contingency</h2>
                    <div className="grid gap-3">
                      {APPRAISAL_OPTIONS.map((opt) => (
                        <OptionTile
                          key={opt.id}
                          active={appraisal === opt.id}
                          label={opt.label}
                          weight={opt.weight}
                          onSelect={() => setAppraisal(opt.id)}
                        />
                      ))}
                    </div>
                    {appraisal === "gapCover" && (
                      <div className="mt-2">
                        <Label className="text-neutral-200">Guarantee to cover appraisal gap up to ($)</Label>
                        <Input
                          inputMode="numeric"
                          value={gapAmount || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setGapAmount(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
                          }
                          placeholder="e.g., 10000"
                        />
                        <p className="mt-1 text-xs text-neutral-400">+1 score per $5,000 guaranteed (max +10)</p>
                      </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {FINANCING_CONT.map((opt) => (
                        <OptionTile
                          key={opt.id}
                          active={finCont === opt.id}
                          label={opt.label}
                          weight={opt.weight}
                          onSelect={() => setFinCont(opt.id)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* STEP 2: Taxes/Title/Commission/Price/Rentback */}
            {step === 2 && (
              <>
                <Card className="mc-card">
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <h2 className="text-lg font-medium">Recordation / Transfer Tax / Title Company</h2>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-3">
                        {TAX_TITLE_SPLIT.map((opt) => (
                          <OptionTile
                            key={opt.id}
                            active={taxSplit === opt.id}
                            label={opt.label}
                            weight={opt.weight}
                            onSelect={() => setTaxSplit(opt.id)}
                          />
                        ))}
                      </div>
                      <div className="space-y-3">
                        {TITLE_PREF.map((opt) => (
                          <OptionTile
                            key={opt.id}
                            active={titlePref === opt.id}
                            label={opt.label}
                            weight={opt.weight}
                            onSelect={() => setTitlePref(opt.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mc-card">
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <h2 className="text-lg font-medium">Commission</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {COMMISSION.map((opt) => (
                        <OptionTile
                          key={opt.id}
                          active={commission === opt.id}
                          label={opt.label}
                          weight={opt.weight}
                          onSelect={() => setCommission(opt.id)}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-neutral-400">Note: Commission structures are evolving; your agent will confirm what the seller offers on this listing.</p>
                  </CardContent>
                </Card>

                <Card className="mc-card">
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <h2 className="text-lg font-medium">Offer Price & Escalation</h2>
                    <p className="text-sm text-neutral-400">List price is a starting point; competitiveness may warrant an escalation.</p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-neutral-200">Seller Asking (List Price)</Label>
                        <Input
                          inputMode="numeric"
                          value={listPrice}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setListPrice(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="e.g., 875000"
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-200">Your Offer Price</Label>
                        <Input
                          inputMode="numeric"
                          value={offerPrice}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOfferPrice(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="e.g., 895000"
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-200">Escalation Up To</Label>
                        <Input
                          inputMode="numeric"
                          value={escalationCap}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEscalationCap(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="e.g., 920000"
                        />
                      </div>
                      <div>
                        <Label className="text-neutral-200">Escalation By (increment)</Label>
                        <Input
                          inputMode="numeric"
                          value={escalationBy}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEscalationBy(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="e.g., 5000"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-neutral-200">Rent-back</Label>
                      <div className="mt-2 grid gap-3 md:grid-cols-3">
                        {RENTBACK.map((opt) => (
                          <OptionTile
                            key={opt.id}
                            active={rentback === opt.id}
                            label={opt.label}
                            weight={opt.weight}
                            onSelect={() => setRentback(opt.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* STEP 3: Review Only (left side could stay empty or show read-only summary) */}
            {step === 3 && (
              <Card className="mc-card">
                <CardContent className="p-5 md:p-6">
                  <h2 className="text-lg font-medium">Review Inputs (Read-only)</h2>
                  <p className="text-sm text-neutral-400">Confirm details before generating the final plan.</p>
                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <SummaryRow label="Competition" value={COMPETITION_OPTIONS.find(o=>o.id===competition)?.label || ""} />
                    <SummaryRow label="Financing" value={`${FINANCING_OPTIONS.find(o=>o.id===financing)?.label?.split(" — ")[0]} • ${downPct}% down`} />
                    <SummaryRow label="Home Sale Cont." value={SALE_CONTINGENCY.find(o=>o.id===saleCont)?.label || ""} />
                    <SummaryRow label="EMD" value={`${emdPct}% of offer`} />
                    <SummaryRow label="Inspection" value={INSPECTION_OPTIONS.find(o=>o.id===inspection)?.label || ""} />
                    <SummaryRow label="Appraisal" value={APPRAISAL_OPTIONS.find(o=>o.id===appraisal)?.label || ""} />
                    {appraisal === "gapCover" && <SummaryRow label="Gap cover" value={`Up to $${gapAmount.toLocaleString()}`} />}
                    <SummaryRow label="Financing Cont." value={FINANCING_CONT.find(o=>o.id===finCont)?.label || ""} />
                    <SummaryRow label="Taxes/Title" value={`${TAX_TITLE_SPLIT.find(o=>o.id===taxSplit)?.label} • ${TITLE_PREF.find(o=>o.id===titlePref)?.label}`} />
                    <SummaryRow label="Commission" value={COMMISSION.find(o=>o.id===commission)?.label || ""} />
                    <SummaryRow label="Price" value={`List $${Number(listPrice||0).toLocaleString()} → Offer $${Number(offerPrice||0).toLocaleString()}`} />
                    {(escalationCap||escalationBy) && (
                      <SummaryRow label="Escalation" value={`Up to $${Number(escalationCap||0).toLocaleString()} by $${Number(escalationBy||0).toLocaleString()}`} />
                    )}
                    <SummaryRow label="Rent-back" value={RENTBACK.find(o=>o.id===rentback)?.label || ""} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column (summary / final) */}
          <div className="lg:col-span-1">
            {step < 3 ? (
              <Card className="sticky top-6 mc-card">
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-medium">Offer Strength</h3>
                    <Sparkles className="h-4 w-4 text-neutral-400" />
                  </div>
                  <div className="mt-4">
                    <div className="mc-bar">
                      <motion.div
                        className="mc-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ type: "spring", stiffness: 80, damping: 20 }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-2xl font-semibold">{score}</div>
                      <div className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-sm text-neutral-200">
                        <span className="mr-1">{badge.emoji}</span>
                        {badge.label}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <SummaryRow label="Competition" value={COMPETITION_OPTIONS.find(o=>o.id===competition)?.label || ""} />
                    <SummaryRow label="Financing" value={`${FINANCING_OPTIONS.find(o=>o.id===financing)?.label?.split(" — ")[0]} • ${downPct}% down`} />
                    <SummaryRow label="Appraisal" value={APPRAISAL_OPTIONS.find(o=>o.id===appraisal)?.label || ""} />
                    <SummaryRow label="Price" value={`List $${Number(listPrice||0).toLocaleString()} → Offer $${Number(offerPrice||0).toLocaleString()}`} />
                  </div>

                  <div className="mt-6 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-neutral-400">
                    <p className="mb-1 font-medium text-neutral-300">Heads up</p>
                    <p>
                      This simulator is educational; listing agent feedback and local norms can shift strategy. We’ll finalize terms together before drafting.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="sticky top-6">
                <FinalPanel score={score} badge={badge} state={{
                  competition, financing, downPct, emdPct, inspection, appraisal, finCont,
                  taxSplit, titlePref, commission, listPrice, offerPrice, rentback
                }} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-neutral-500">
          © {new Date().getFullYear()} Maison Collective • Built for client education
        </p>
      </div>

      {/* Bottom step navigation */}
      <StepNav
        step={step}
        total={totalSteps}
        canPrev={step > 0}
        canNext={step < totalSteps - 1 && canGoNext}
        onPrev={() => setStep((s) => Math.max(0, s - 1))}
        onNext={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
        onFinish={() => setShowFinal(true)}
      />

      {/* Generate plan -> 자동으로 오른쪽 FinalPanel이 보이도록 step 3 유지 + alert 안내(선택) */}
      {showFinal && step === totalSteps - 1 && null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-neutral-400">{label}</span>
      <span className="text-right text-neutral-100">{value}</span>
    </div>
  );
}
