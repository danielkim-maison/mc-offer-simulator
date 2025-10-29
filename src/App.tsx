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

/**
 * Maison Collective — Offer Strategy Simulator (v1)
 * Single-file React component (Tailwind + TypeScript)
 * NOTE: Original shadcn/ui component imports have been replaced with standard
 * HTML elements (button, input, div) to prevent Vercel build errors, as the
 * required library configuration is not present. Styles may differ slightly.
 */

// ---------- Types (옵션 및 가중치) ----------
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

// ---------- Helpers ----------
function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function labelForScore(score: number) {
  if (score >= 85) return { label: "Elite", emoji: "🚀" };
  if (score >= 70) return { label: "Strong", emoji: "💪" };
  if (score >= 55) return { label: "Competitive", emoji: "⚖️" };
  return { label: "Needs Work", emoji: "🧩" };
}

// ⚠️ Note: Original code used shadcn/ui components (Card, Button, Input, Slider, Label, Textarea).
// These have been replaced with standard HTML elements (div, button, input, textarea, label)
// and corresponding Tailwind classes to ensure Vercel deployment without specialized setup.

const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "text-neutral-200 block mb-1" }) => (
  <label className={className}>{children}</label>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`flex h-10 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus-visible:outline-none ${props.className || ''}`}
  />
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    className={`flex min-h-[80px] w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus-visible:outline-none ${props.className || ''}`}
  />
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "bg-neutral-900 border-neutral-800 rounded-xl border" }) => (
  <div className={className}>
    <div className="p-5">{children}</div>
  </div>
);


// ---------- Component ----------
export default function OfferStrategySimulator() {
  // Step 0 — Competition
  const [competition, setCompetition] = useState<(typeof COMPETITION_OPTIONS)[number]["id"]>("maybe");

  // Step 1 — Basics
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

  // Derived score
  const score = useMemo(() => {
    let s = 60; // start at neutral

    // Competition context
    s += COMPETITION_OPTIONS.find(o => o.id === competition)!.weight;

    // Financing strength + down payment boost
    s += FINANCING_OPTIONS.find(o => o.id === financing)!.weight;
    s += Math.min(20, Math.max(0, (downPct - 10) * 0.6)); // 10% baseline; +0.6 per extra pct up to +20

    // Home sale contingency
    s += SALE_CONTINGENCY.find(o => o.id === saleCont)!.weight;

    // EMD strength
    if (emdPct >= 10) s += 12;
    else if (emdPct >= 5) s += 6;
    else if (emdPct >= 2) s += 2;
    else s -= 4;

    // Inspection choice
    s += INSPECTION_OPTIONS.find(o => o.id === inspection)!.weight;

    // Appraisal
    s += APPRAISAL_OPTIONS.find(o => o.id === appraisal)!.weight;
    if (appraisal === "gapCover") s += Math.min(10, Math.floor(gapAmount / 5000)); // +1 per 5k gap cover (cap +10)

    // Financing contingency
    s += FINANCING_CONT.find(o => o.id === finCont)!.weight;

    // Taxes/title
    s += TAX_TITLE_SPLIT.find(o => o.id === taxSplit)!.weight;
    s += TITLE_PREF.find(o => o.id === titlePref)!.weight;

    // Commission
    s += COMMISSION.find(o => o.id === commission)!.weight;

    // Rent-back goodwill
    s += RENTBACK.find(o => o.id === rentback)!.weight;

    // Offer relative to list: slight bump if meaningfully above in competitive context
    const lp = Number(listPrice) || 0;
    const op = Number(offerPrice) || 0;
    if (lp > 0 && op > 0) {
      const premium = (op - lp) / lp; // e.g., 0.03 = +3%
      if (competition !== "solo") s += Math.min(12, Math.max(0, Math.round(premium * 100)) * 0.6);
      else if (premium > 0.02) s += 2; // small bump even if solo
    }

    return clamp(Math.round(s));
  }, [competition, financing, downPct, saleCont, emdPct, inspection, appraisal, gapAmount, finCont, taxSplit, titlePref, commission, rentback, listPrice, offerPrice]);

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
  }

  const Button: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string }> = ({ onClick, children, className = "bg-white text-neutral-900 hover:bg-neutral-200" }) => (
    <button
      onClick={onClick}
      className={`${className} inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors h-10 px-4 py-2`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Maison Collective — Offer Strategy Simulator</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Play with choices, learn the trade‑offs, and see how your offer strength evolves in real time.
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700" onClick={resetAll}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button onClick={downloadScenario}>
              <Download className="mr-2 h-4 w-4" /> Download JSON
            </Button>
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Competition */}
            <Card>
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">First Question: Competition</h2>
                  <Info className="h-4 w-4 text-neutral-400" />
                </div>
                <p className="mt-1 text-sm text-neutral-400">
                  Is there a competition or are you the only offer? Choose one.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {COMPETITION_OPTIONS.map((opt) => (
                    <label key={opt.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${competition === opt.id ? "border-white bg-neutral-800" : "border-neutral-800 hover:bg-neutral-850"}`}>
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
                      <span className="text-xs text-neutral-400">{opt.weight >= 0 ? `+${opt.weight}` : opt.weight}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Card>

            {/* Step 1: Basics */}
            <Card>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-neutral-400" />
                  <h2 className="text-lg font-medium">Step 1: Basic Information</h2>
                </div>
                <p className="text-sm text-neutral-400">
                  Although the list price often matches the offer price, this step ensures names and settlement date are accurate. Aligning with the seller’s preferred settlement date strengthens your offer. Understanding your cash flow is critical (e.g., down payment vs. renovation funds).
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Property Address</Label>
                    <Input value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} placeholder="123 Main St, City, ST" />
                  </div>
                  <div>
                    <Label>Buyers Names</Label>
                    <Input value={buyerNames} onChange={(e) => setBuyerNames(e.target.value)} placeholder="Jane & John Doe" />
                  </div>
                  <div>
                    <Label>Preferred Settlement Date</Label>
                    <Input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Available Total Cash For Strategy ($)</Label>
                    <Input inputMode="numeric" value={totalCash} onChange={(e) => setTotalCash(e.target.value.replace(/[^0-9]/g, ''))} placeholder="e.g., 160000" />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Renovation budget, timeline constraints, etc." />
                </div>
              </div>
            </Card>

            {/* Step 2: Financing */}
            <Card>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-neutral-400" />
                  <h2 className="text-lg font-medium">Step 2: Financing Method</h2>
                </div>
                <p className="text-sm text-neutral-400">Sellers tend to see cash as lowest risk; higher down payments also strengthen financed offers.</p>
                <div className="grid gap-3">
                  {FINANCING_OPTIONS.map((opt) => (
                    <label key={opt.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${financing === opt.id ? "border-white bg-neutral-800" : "border-neutral-800 hover:bg-neutral-850"}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="financing" className="h-4 w-4" checked={financing === opt.id} onChange={() => setFinancing(opt.id)} />
                        <span className="text-sm">{opt.label}</span>
                      </div>
                      <span className="text-xs text-neutral-400">{opt.weight >= 0 ? `+${opt.weight}` : opt.weight}</span>
                    </label>
                  ))}
                </div>
                <div className="pt-2">
                  <Label>Down Payment (%)</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {/* Slider 대신 input type="range" 사용 */}
                    <input type="range" value={downPct} min={0} max={100} step={1} onChange={(e) => setDownPct(Number(e.target.value))} className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer" />
                    <div className="w-16 text-right text-sm">{downPct}%</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Step 3: Home Sale Contingency */}
            <Card>
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Step 3: Home Sale Contingency</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SALE_CONTINGENCY.map((opt) => (
                    <label key={opt.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${saleCont === opt.id ? "border-white bg-neutral-800" : "border-neutral-800 hover:bg-neutral-850"}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="saleCont" className="h-4 w-4" checked={saleCont === opt.id} onChange={() => setSaleCont(opt.id)} />
                        <span className="text-sm">{opt.label}</span>
                      </div>
                      <span className="text-xs text-neutral-400">{opt.weight >= 0 ? `+${opt.weight}` : opt.weight}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Card>

            {/* Step 4: EMD */}
            <Card>
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Step 4: Earnest Money Deposit (EMD)</h2>
                <p className="text-sm text-neutral-400">Signals seriousness. Held by title/brokerage and credited at closing.</p>
                <div className="flex items-center gap-4">
                  {/* Slider 대신 input type="range" 사용 */}
                  <input type="range" value={emdPct} min={0} max={20} step={1} onChange={(e) => setEmdPct(Number(e.target.value))} className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer" />
                  <div className="w-20 text-right text-sm">{emdPct}%</div>
                </div>
                <div className="flex gap-2 text-xs text-neutral-400">
                  <span className="rounded bg-neutral-800 px-2 py-1">2% — Standard</span>
                  <span className="rounded bg-neutral-800 px-2 py-1">5% — Strong</span>
                  <span className="rounded bg-neutral-800 px-2 py-1">10%+ — Very Strong</span>
                </div>
              </div>
            </Card>

            {/* Step 5: Inspection */}
            <Card>
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Step 5: Home Inspection Contingency</h2>
                <div className="grid gap-3">
                  {INSPECTION_OPTIONS.map((opt) => (
                    <label key={opt.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${inspection === opt.id ? "border-white bg-neutral-800" : "border-neutral-800 hover:bg-neutral-850"}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="inspection" className="h-4 w-4" checked={inspection === opt.id} onChange={() => setInspection(opt.id)} />
                        <span className="text-sm">{opt.label}</span>
                      </div>
                      <span className="text-xs text-neutral-400">{opt.weight >= 0 ? `+${opt.weight}` : opt.weight}</span>
                    </label>
                  ))}
                </div>
                {inspection === "aLaCarte" && (
                  <div className="mt-2">
                    <Label>Pick specific tests (optional)</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                      {["Structural & Mechanical","Mold","Environmental","Radon","Chimney","Lead-Based Paint","Wood Destroying Insect"].map((k) => {
                        const id = k.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                        const checked = inspectionChecks.includes(id);
                        return (
                          <label key={id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
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
              </div>
            </Card>

            {/* Step 6: Appraisal */}
            <Card>
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Step 6: Appraisal Contingency</h2>
                <div className="grid gap-3">
                  {APPRAISAL_OPTIONS.map((opt) => (
                    <label key={opt.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${appraisal === opt.id ? "border-white bg-neutral-800" : "border-neutral-800 hover:bg-neutral-850"}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="appraisal" className="h-4 w-4" checked={appraisal === opt.id} onChange={() => setAppraisal(opt.id)} />
                        <span className="text-sm">{opt.label}</span>
                      </div>
                      <span className="text-xs text-neutral-400">{opt.weight >= 0 ? `+${opt.weight}` : opt.weight}</span>
                    </label>
                  ))}
                </div>
                {appraisal === "gapCover" && (
                  <div>
                    <Label>Guarantee to cover appraisal gap up to ($)</Label>
                    <Input inputMode="numeric" value={gapAmount || ""} onChange={(e) => setGapAmount(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} placeholder="e.g., 10000" className="mt-2" />
                    <p className="mt-1 text-xs text-neutral-400">+1 score per $5,000 guaranteed (max +10)</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Step 7: Financing Contingency */}
            <Card>
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Step 7: Financing Contingency</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {FINANCING_CONT.map((opt) => (
                    <label key={opt.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${finCont === opt.id ? "border-white bg-neutral-800" : "border-neutral-800 hover:bg-neutral-850"}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="finCont" className="h-4 w-4" checked={finCont === opt.id} onChange={() => setFinCont(opt.id)} />
                        <span className="text-sm">{opt.label}</span>
                      </div>
                      <span className="text-xs text-neutral-400">{opt.weight >= 0 ? `+${opt.weight}` : opt.weight}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Card>

            {/* Step 8: Transfer/Recordation & Title */}
            <Card>
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Step 8: Recordation / Transfer Tax / Title Company</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-3">
                    {TAX_TITLE_SPLIT.map((opt) => (
                      <label key={opt.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${taxSplit === opt.id ? "border-white bg-neutral-800" : "border-neutral-800 hover:bg-neutral-850"}`}>
                        <div className="flex items-center gap-3">
                          <input type="radio" name="taxSplit" className="h-4 w-4" checked={taxSplit === opt.id} onChange={() => setTaxSplit(opt.id)} />
                          <span className="text-sm">{opt.label}</span>
                        </div>
                        <span className="text-xs text-neutral-400">{opt.weight >= 0 ? `+${opt.weight}` : opt.weight}</span>
                      </label>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {TITLE_PREF.map((opt) => (
                      <label key={opt.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${titlePref === opt.id ? "border-white bg-neutral-800" : "border-neutral-800 hover:bg-neutral-850"}`}>
                        <div className="flex items-center gap-3">
                          <input type="radio" name="titlePref" className="h-4 w-4" checked={titlePref === opt.id} onChange={() => setTitlePref(opt.id)} />
                          <span className="text-sm">{opt.label}</span>
                        </div>
                        <span className="text-xs text-neutral-400">{opt.weight >= 0 ? `+${opt.weight}` : opt.weight}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Step 9: Commission */}
            <Card>
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Step 9: Commission</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {COMMISSION.map((opt) => (
                    <label key={opt.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${commission === opt.id ? "border-white bg-neutral-800" : "border-neutral-800 hover:bg-neutral-850"}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="commission" className="h-4 w-4" checked={commission === opt.id} onChange={() => setCommission(opt.id)} />
                        <span className="text-sm">{opt.label}</span>
                      </div>
                      <span className="text-xs text-neutral-400">{opt.weight >= 0 ? `+${opt.weight}` : opt.weight}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-neutral-400">Note: Commission structures are evolving; your agent will confirm what the seller offers on this listing.</p>
              </div>
            </Card>

            {/* Step 10: Offer Price & Escalation */}
            <Card>
              <div className="space-y-4">
                <h2 className="text-lg font-medium">Step 10: Offer Price</h2>
                <p className="text-sm text-neutral-400">List price is a starting point; competitiveness may warrant an escalation.</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Seller Asking (List Price)</Label>
                    <Input inputMode="numeric" value={listPrice} onChange={(e) => setListPrice(e.target.value.replace(/[^0-9]/g, ''))} placeholder="e.g., 875000" />
                  </div>
                  <div>
                    <Label>Your Offer Price</Label>
                    <Input inputMode="numeric" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value.replace(/[^0-9]/g, ''))} placeholder="e.g., 895000" />
                  </div>
                  <div>
                    <Label>Escalation Up To</Label>
                    <Input inputMode="numeric" value={escalationCap} onChange={(e) => setEscalationCap(e.target.value.replace(/[^0-9]/g, ''))} placeholder="e.g., 920000" />
                  </div>
                  <div>
                    <Label>Escalation By (increment)</Label>
                    <Input inputMode="numeric" value={escalationBy} onChange={(e) => setEscalationBy(e.target.value.replace(/[^0-9]/g, ''))} placeholder="e.g., 5000" />
                  </div>
                </div>
                <div>
                  <Label>Rent-back</Label>
                  <div className="mt-2 grid gap-3 md:grid-cols-3">
                    {RENTBACK.map((opt) => (
                      <label key={opt.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${rentback === opt.id ? "border-white bg-neutral-800" : "border-neutral-800 hover:bg-neutral-850"}`}>
                        <div className="flex items-center gap-3">
                          <input type="radio" name="rentback" className="h-4 w-4" checked={rentback === opt.id} onChange={() => setRentback(opt.id)} />
                          <span className="text-sm">{opt.label}</span>
                        </div>
                        <span className="text-xs text-neutral-400">{opt.weight >= 0 ? `+${opt.weight}` : opt.weight}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Summary & Score */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-neutral-900 border-neutral-800 rounded-xl border">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium">Offer Strength</h3>
                  <Sparkles className="h-4 w-4 text-neutral-400" />
                </div>
                <div className="mt-4">
                  <div className="h-3 w-full rounded-full bg-neutral-800">
                    <motion.div
                      className="h-3 rounded-full bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ type: "spring", stiffness: 80, damping: 20 }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-2xl font-semibold">{score}</div>
                    <div className="rounded-full border border-neutral-700 px-3 py-1 text-sm text-neutral-200">
                      <span className="mr-1">{badge.emoji}</span>
                      {badge.label}
                    </div>
                  </div>
                </div>

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

                <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-400">
                  <p className="mb-1 font-medium text-neutral-300">Heads up</p>
                  <p>
                    This simulator is educational; listing agent feedback and local norms can shift strategy. We’ll finalize terms together before drafting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-neutral-500">© {new Date().getFullYear()} Maison Collective • Built for client education</p>
      </div>
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