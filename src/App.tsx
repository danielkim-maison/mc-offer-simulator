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
 * Maison Collective — Offer Strategy Simulator (v1)
 * Single-file React component (Tailwind + shadcn/ui or stubs)
 * - No backend. All calculations run client-side.
 * - Export scenario as JSON (Download button).
 * - Desktop & mobile friendly.
 */

/* -------------------- 옵션 -------------------- */
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

/* -------------------- 헬퍼 -------------------- */
function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function labelForScore(score: number) {
  if (score >= 85) return { label: "Elite", emoji: "🚀" };
  if (score >= 70) return { label: "Strong", emoji: "💪" };
  if (score >= 55) return { label: "Competitive", emoji: "⚖️" };
  return { label: "Needs Work", emoji: "🧩" };
}

/* ===========================================================
   메인 컴포넌트
=========================================================== */
export default function OfferStrategySimulator() {
  // Step 0 — Competition
  const [competition, setCompetition] = useState<(typeof COMPETITION_OPTIONS)[number]["id"]>("maybe");

  // Step 1 — Basic
  const [propertyAddress, setPropertyAddress] = useState("");
  const [buyerNames, setBuyerNames] = useState("");
  const [settlementDate, setSettlementDate] = useState("");
  const [totalCash, setTotalCash] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Step 2 — Financing
  const [financing, setFinancing] = useState<(typeof FINANCING_OPTIONS)[number]["id"]>("conv");
  const [downPct, setDownPct] = useState<number>(20);

  // Step 3 — Home Sale Contingency
  const [saleCont, setSaleCont] = useState<(typeof SALE_CONTINGENCY)[number]["id"]>("noSale");

  // Step 4 — EMD
  const [emdPct, setEmdPct] = useState<number>(5);

  // Step 5 — Inspection
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

  // Derived score
  const score = useMemo(() => {
    let s = 60; // neutral base

    s += COMPETITION_OPTIONS.find((o) => o.id === competition)!.weight;
    s += FINANCING_OPTIONS.find((o) => o.id === financing)!.weight;
    s += Math.min(20, Math.max(0, (downPct - 10) * 0.6)); // +0.6 per 1% over 10, cap +20
    s += SALE_CONTINGENCY.find((o) => o.id === saleCont)!.weight;

    if (emdPct >= 10) s += 12;
    else if (emdPct >= 5) s += 6;
    else if (emdPct >= 2) s += 2;
    else s -= 4;

    s += INSPECTION_OPTIONS.find((o) => o.id === inspection)!.weight;
    s += APPRAISAL_OPTIONS.find((o) => o.id === appraisal)!.weight;
    if (appraisal === "gapCover") s += Math.min(10, Math.floor(gapAmount / 5000)); // +1 per $5k, cap +10

    s += FINANCING_CONT.find((o) => o.id === finCont)!.weight;
    s += TAX_TITLE_SPLIT.find((o) => o.id === taxSplit)!.weight;
    s += TITLE_PREF.find((o) => o.id === titlePref)!.weight;
    s += COMMISSION.find((o) => o.id === commission)!.weight;
    s += RENTBACK.find((o) => o.id === rentback)!.weight;

    const lp = Number(listPrice) || 0;
    const op = Number(offerPrice) || 0;
    if (lp > 0 && op > 0) {
      const premium = (op - lp) / lp;
      if (competition !== "solo") s += Math.min(12, Math.max(0, Math.round(premium * 100)) * 0.6);
      else if (premium > 0.02) s += 2;
    }

    return clamp(Math.round(s));
  }, [
    competition,
    financing,
    downPct,
    saleCont,
    emdPct,
    inspection,
    appraisal,
    gapAmount,
    finCont,
    taxSplit,
    titlePref,
    commission,
    rentback,
    listPrice,
    offerPrice,
  ]);

  const badge = useMemo(() => labelForScore(score), [score]);

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
    setCompetition("maybe");
    setPropertyAddress(""); setBuyerNames(""); setSettlementDate(""); setTotalCash(""); setNotes("");
    setFinancing("conv"); setDownPct(20); setSaleCont("noSale"); setEmdPct(5);
    setInspection("aLaCarte"); setInspectionChecks([]);
    setAppraisal("yes"); setGapAmount(0); setFinCont("yes");
    setTaxSplit("split"); setTitlePref("sellerPref"); setCommission("sellerPays");
    setListPrice(""); setOfferPrice(""); setEscalationCap(""); setEscalationBy(""); setRentback("none");
  }

  return (
    <div className="mc-bg min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* ---------- Hero ---------- */}
        <header className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300">
                <Sparkles className="h-3.5 w-3.5" />
                Interactive • No sign-in required
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Maison Collective —{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-blue-400 to-pink-400">
                  Offer Strategy Simulator
                </span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-400">
                Adjust terms and instantly see your offer strength. Export scenarios and finalize with your agent.
              </p>
            </div>
            <div className="flex gap-2">
              <Button className="mc-btn px-4" onClick={downloadScenario}>
                <Download className="mr-2 h-4 w-4" /> Download JSON
              </Button>
              <Button variant="secondary" className="mc-btn-secondary px-4 text-neutral-200" onClick={resetAll}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
            </div>
          </div>
        </header>

        {/* ---------- Layout ---------- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT: Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 0: Competition */}
            <Section title="First Question: Competition" icon={<Info className="h-4 w-4 text-neutral-400" />}>
              <p className="mt-1 text-sm text-neutral-400">Is there a competition or are you the only offer? Choose one.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {COMPETITION_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="mc-pill flex cursor-pointer items-center justify-between rounded-xl p-3 transition"
                    data-active={competition === opt.id}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="competition"
                        className="h-4 w-4"
                        checked={competition === opt.id}
                        onChange={() => setCompetition(opt.id)}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </div>
                    <span className="text-xs text-neutral-400">
                      {opt.weight >= 0 ? `+${opt.weight}` : opt.weight}
                    </span>
                  </label>
                ))}
              </div>
            </Section>

            {/* Step 1: Basics */}
            <Section title="Step 1: Basic Information" icon={<Calendar className="h-4 w-4 text-neutral-400" />}>
              <p className="text-sm text-neutral-400">
                Aligning with the seller’s preferred settlement date strengthens your offer. Understanding your cash flow is critical.
              </p>
              <div className="grid gap-4 md:grid-cols-2 mt-3">
                <Field label="Property Address">
                  <Input
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    placeholder="123 Main St, City, ST"
                  />
                </Field>
                <Field label="Buyers Names">
                  <Input
                    value={buyerNames}
                    onChange={(e) => setBuyerNames(e.target.value)}
                    placeholder="Jane & John Doe"
                  />
                </Field>
                <Field label="Preferred Settlement Date">
                  <Input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} />
                </Field>
                <Field label="Available Total Cash For Strategy ($)">
                  <Input
                    inputMode="numeric"
                    value={totalCash}
                    onChange={(e) => setTotalCash(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g., 160000"
                  />
                </Field>
              </div>
              <Field label="Notes" className="mt-3">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Renovation budget, timeline constraints, etc."
                />
              </Field>
            </Section>

            {/* Step 2: Financing */}
            <Section title="Step 2: Financing Method" icon={<BarChart3 className="h-4 w-4 text-neutral-400" />}>
              <p className="text-sm text-neutral-400">Sellers tend to see cash as lowest risk; higher down payments strengthen financed offers.</p>
              <div className="grid gap-3 mt-3">
                {FINANCING_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="mc-pill flex cursor-pointer items-center justify-between rounded-xl p-3 transition"
                    data-active={financing === opt.id}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="financing"
                        className="h-4 w-4"
                        checked={financing === opt.id}
                        onChange={() => setFinancing(opt.id)}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </div>
                    <span className="text-xs text-neutral-400">
                      {opt.weight >= 0 ? `+${opt.weight}` : opt.weight}
                    </span>
                  </label>
                ))}
              </div>
              <div className="pt-3">
                <Label className="text-neutral-300">Down Payment (%)</Label>
                <div className="mt-2 flex items-center gap-4">
                  <Slider value={[downPct]} min={0} max={100} step={1} onValueChange={(v) => setDownPct(v[0])} className="w-full" />
                  <div className="w-16 text-right text-sm">{downPct}%</div>
                </div>
              </div>
            </Section>

            {/* Step 3: Home Sale Contingency */}
            <Section title="Step 3: Home Sale Contingency">
              <div className="grid gap-3 sm:grid-cols-2">
                {SALE_CONTINGENCY.map((opt) => (
                  <label
                    key={opt.id}
                    className="mc-pill flex cursor-pointer items-center justify-between rounded-xl p-3 transition"
                    data-active={saleCont === opt.id}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="saleCont"
                        className="h-4 w-4"
                        checked={saleCont === opt.id}
                        onChange={() => setSaleCont(opt.id)}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </div>
                    <span className="text-xs text-neutral-400">
                      {opt.weight >= 0 ? `+${opt.weight}` : opt.weight}
                    </span>
                  </label>
                ))}
              </div>
            </Section>

            {/* Step 4: EMD */}
            <Section title="Step 4: Earnest Money Deposit (EMD)">
              <p className="text-sm text-neutral-400">Signals seriousness. Held by title/brokerage and credited at closing.</p>
              <div className="mt-3 flex items-center gap-4">
                <Slider value={[emdPct]} min={0} max={20} step={1} onValueChange={(v) => setEmdPct(v[0])} className="w-full" />
                <div className="w-20 text-right text-sm">{emdPct}%</div>
              </div>
              <div className="mt-2 flex gap-2 text-xs text-neutral-400">
                <span className="rounded bg-white/5 px-2 py-1">2% — Standard</span>
                <span className="rounded bg-white/5 px-2 py-1">5% — Strong</span>
                <span className="rounded bg-white/5 px-2 py-1">10%+ — Very Strong</span>
              </div>
            </Section>

            {/* Step 5: Inspection */}
            <Section title="Step 5: Home Inspection Contingency">
              <div className="grid gap-3">
                {INSPECTION_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="mc-pill flex cursor-pointer items-center justify-between rounded-xl p-3 transition"
                    data-active={inspection === opt.id}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="inspection"
                        className="h-4 w-4"
                        checked={inspection === opt.id}
                        onChange={() => setInspection(opt.id)}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </div>
                    <span className="text-xs text-neutral-400">
                      {opt.weight >= 0 ? `+${opt.weight}` : opt.weight}
                    </span>
                  </label>
                ))}
              </div>
              {inspection === "aLaCarte" && (
                <div className="mt-3">
                  <Label className="text-neutral-300">Pick specific tests (optional)</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                    {[
                      "Structural & Mechanical",
                      "Mold",
                      "Environmental",
                      "Radon",
                      "Chimney",
                      "Lead-Based Paint",
                      "Wood Destroying Insect",
                    ].map((k) => {
                      const id = k.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                      const checked = inspectionChecks.includes(id);
                      return (
                        <label key={id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setInspectionChecks((prev) =>
                                e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)
                              )
                            }
                          />
                          <span>{k}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </Section>

            {/* Step 6: Appraisal */}
            <Section title="Step 6: Appraisal Contingency">
              <div className="grid gap-3">
                {APPRAISAL_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="mc-pill flex cursor-pointer items-center justify-between rounded-xl p-3 transition"
                    data-active={appraisal === opt.id}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="appraisal"
                        className="h-4 w-4"
                        checked={appraisal === opt.id}
                        onChange={() => setAppraisal(opt.id)}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </div>
                    <span className="text-xs text-neutral-400">
                      {opt.weight >= 0 ? `+${opt.weight}` : opt.weight}
                    </span>
                  </label>
                ))}
              </div>
              {appraisal === "gapCover" && (
                <div className="mt-3">
                  <Label className="text-neutral-300">Guarantee to cover appraisal gap up to ($)</Label>
                  <Input
                    inputMode="numeric"
                    value={gapAmount || ""}
                    onChange={(e) => setGapAmount(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                    placeholder="e.g., 10000"
                    className="mt-2"
                  />
                  <p className="mt-1 text-xs text-neutral-400">+1 score per $5,000 guaranteed (max +10)</p>
                </div>
              )}
            </Section>

            {/* Step 7: Financing Contingency */}
            <Section title="Step 7: Financing Contingency">
              <div className="grid gap-3 sm:grid-cols-2">
                {FINANCING_CONT.map((opt) => (
                  <label
                    key={opt.id}
                    className="mc-pill flex cursor-pointer items-center justify-between rounded-xl p-3 transition"
                    data-active={finCont === opt.id}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="finCont"
                        className="h-4 w-4"
                        checked={finCont === opt.id}
                        onChange={() => setFinCont(opt.id)}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </div>
                    <span className="text-xs text-neutral-400">
                      {opt.weight >= 0 ? `+${opt.weight}` : opt.weight}
                    </span>
                  </label>
                ))}
              </div>
            </Section>

            {/* Step 8: Transfer/Recordation & Title */}
            <Section title="Step 8: Recordation / Transfer Tax / Title Company">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-3">
                  {TAX_TITLE_SPLIT.map((opt) => (
                    <label
                      key={opt.id}
                      className="mc-pill flex cursor-pointer items-center justify-between rounded-xl p-3 transition"
                      data-active={taxSplit === opt.id}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="taxSplit"
                          className="h-4 w-4"
                          checked={taxSplit === opt.id}
                          onChange={() => setTaxSplit(opt.id)}
                        />
                        <span className="text-sm">{opt.label}</span>
                      </div>
                      <span className="text-xs text-neutral-400">
                        {opt.weight >= 0 ? `+${opt.weight}` : opt.weight}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="space-y-3">
                  {TITLE_PREF.map((opt) => (
                    <label
                      key={opt.id}
                      className="mc-pill flex cursor-pointer items-center justify-between rounded-xl p-3 transition"
                      data-active={titlePref === opt.id}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="titlePref"
                          className="h-4 w-4"
                          checked={titlePref === opt.id}
                          onChange={() => setTitlePref(opt.id)}
                        />
                        <span className="text-sm">{opt.label}</span>
                      </div>
                      <span className="text-xs text-neutral-400">
                        {opt.weight >= 0 ? `+${opt.weight}` : opt.weight}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </Section>

            {/* Step 9: Commission */}
            <Section title="Step 9: Commission">
              <div className="grid gap-3 sm:grid-cols-2">
                {COMMISSION.map((opt) => (
                  <label
                    key={opt.id}
                    className="mc-pill flex cursor-pointer items-center justify-between rounded-xl p-3 transition"
                    data-active={commission === opt.id}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="commission"
                        className="h-4 w-4"
                        checked={commission === opt.id}
                        onChange={() => setCommission(opt.id)}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </div>
                    <span className="text-xs text-neutral-400">
                      {opt.weight >= 0 ? `+${opt.weight}` : opt.weight}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-neutral-400">
                Note: Commission structures are evolving; your agent will confirm what the seller offers on this listing.
              </p>
            </Section>

            {/* Step 10: Offer Price & Escalation */}
            <Section title="Step 10: Offer Price">
              <p className="text-sm text-neutral-400">List price is a starting point; competitiveness may warrant an escalation.</p>
              <div className="grid gap-4 md:grid-cols-2 mt-3">
                <Field label="Seller Asking (List Price)">
                  <Input
                    inputMode="numeric"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g., 875000"
                  />
                </Field>
                <Field label="Your Offer Price">
                  <Input
                    inputMode="numeric"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g., 895000"
                  />
                </Field>
                <Field label="Escalation Up To">
                  <Input
                    inputMode="numeric"
                    value={escalationCap}
                    onChange={(e) => setEscalationCap(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g., 920000"
                  />
                </Field>
                <Field label="Escalation By (increment)">
                  <Input
                    inputMode="numeric"
                    value={escalationBy}
                    onChange={(e) => setEscalationBy(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g., 5000"
                  />
                </Field>
              </div>

              <div className="mt-3">
                <Label className="text-neutral-300">Rent-back</Label>
                <div className="mt-2 grid gap-3 md:grid-cols-3">
                  {RENTBACK.map((opt) => (
                    <label
                      key={opt.id}
                      className="mc-pill flex cursor-pointer items-center justify-between rounded-xl p-3 transition"
                      data-active={rentback === opt.id}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="rentback"
                          className="h-4 w-4"
                          checked={rentback === opt.id}
                          onChange={() => setRentback(opt.id)}
                        />
                        <span className="text-sm">{opt.label}</span>
                      </div>
                      <span className="text-xs text-neutral-400">
                        {opt.weight >= 0 ? `+${opt.weight}` : opt.weight}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </Section>
          </div>

          {/* RIGHT: Summary */}
          <aside className="lg:col-span-1">
            <div className="mc-card sticky top-6 p-5">
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
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-3xl font-semibold tracking-tight">{score}</div>
                  <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-neutral-200">
                    <span className="mr-1">{badge.emoji}</span>
                    {badge.label}
                  </div>
                </div>
              </div>

              {/* Summary rows */}
              <div className="mt-5 space-y-3 text-sm">
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

              <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-neutral-300">
                <p className="mb-1 font-medium text-neutral-200">Heads up</p>
                <p>
                  This simulator is educational; listing agent feedback and local norms can shift strategy. We’ll finalize terms together before drafting.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <p className="mt-10 text-center text-xs text-neutral-500">
          © {new Date().getFullYear()} Maison Collective • Built for client education
        </p>
      </div>
    </div>
  );
}

/* -------------------- 작은 헬퍼 컴포넌트 -------------------- */
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mc-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        {icon}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-neutral-300">{label}</Label>
      <div className="mt-1.5">{children}</div>
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
