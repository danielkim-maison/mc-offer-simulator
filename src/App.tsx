import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Info,
  RefreshCcw,
  Download,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

/* ---------------- Options ---------------- */
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

/* ---------------- Helpers ---------------- */
function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}
function labelForScore(score: number) {
  if (score >= 85) return { label: "Elite", emoji: "🚀" };
  if (score >= 70) return { label: "Strong", emoji: "💪" };
  if (score >= 55) return { label: "Competitive", emoji: "⚖️" };
  return { label: "Needs Work", emoji: "🧩" };
}
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
    rec.push("In competitive situations, consider offering 0.5–1.0% above list or enabling escalation.");
  }
  if (state.emdPct < 5) rec.push("Increase EMD to at least 5% to improve perceived commitment.");
  if (state.financing !== "cash" && state.downPct < 20) {
    rec.push("Target 20%+ down payment to reduce perceived financing risk.");
  }
  if (state.inspection !== "asIs" && state.competition === "competitive") {
    rec.push("Under heavy competition, consider a reduced-scope inspection or information-only.");
  }
  if (state.appraisal === "yes" && state.competition !== "solo") {
    rec.push("Guaranteeing part of any appraisal gap (e.g., $10k–$25k) can lower seller uncertainty.");
  }
  if (state.taxSplit !== "split" || state.titlePref !== "sellerPref") {
    rec.push("Align with seller’s preferred title and standard 50/50 taxes for smoother acceptance.");
  }
  if (state.commission !== "buyerPays" && state.competition === "competitive") {
    rec.push("Offering to pay part/all buyer agency commission may increase attractiveness.");
  }
  if (state.rentback !== "none") {
    rec.push("Clarify rent-back terms (free 30–60 days or paid) to support the seller’s move-out timing.");
  }
  if (rec.length === 0) rec.push("Your selections look balanced. Review timelines/clauses with your agent before drafting.");
  return rec.slice(0, 5);
}

/* ------------- Reusable UI: Option Tile ------------- */
function OptionTile({
  active,
  label,
  onSelect,
  fullWidth = true,
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
  /** Rent-back 가로 정렬용이면 false */
  fullWidth?: boolean;
}) {
  const outerStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: "14px 16px",
    cursor: "pointer",
    outline: "none",
    transition: "background .15s ease, border-color .15s ease, box-shadow .15s ease",
    width: fullWidth ? "100%" : "auto",
    whiteSpace: fullWidth ? "normal" : "nowrap",
  };
  const activeStyle: React.CSSProperties = active
    ? { background: "rgba(255,255,255,.14)", borderColor: "rgba(255,255,255,.55)", boxShadow: "0 0 0 3px rgba(255,255,255,.06)" }
    : {};

  return (
    <div
      role="radio"
      aria-checked={active}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => ((e.key === "Enter" || e.key === " ") && onSelect())}
      className="mc-pill"
      style={{ ...outerStyle, ...activeStyle, border: "1px solid rgba(255,255,255,.10)", background: active ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.04)" }}
    >
      <div style={{ display: "inline-flex", alignItems: "center", width: fullWidth ? "100%" : "auto" }}>
        <span
          aria-hidden
          style={{
            height: 22,
            width: 22,
            minWidth: 22,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "999px",
            border: active ? "1px solid #fff" : "1px solid rgba(255,255,255,.4)",
            background: active ? "rgba(255,255,255,.85)" : "transparent",
            color: "#111",
          }}
        >
          {active ? <CheckCircle2 size={16} color="#111" /> : null}
        </span>
        <div style={{ width: 24, flex: "0 0 24px" }} />
        <span style={{ lineHeight: 1.4, fontSize: 15 }}>{label}</span>
      </div>
    </div>
  );
}

/* --------- Reusable UI: Form Row --------- */
function FormRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(150px, 240px) 1fr",
        alignItems: "center",
        columnGap: 18,
        rowGap: 10,
        width: "100%",
      }}
    >
      <Label className="text-neutral-200" style={{ margin: 0 }}>{label}</Label>
      <div>{children}</div>
    </div>
  );
}

function SummaryKV({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ opacity: .7, fontSize: 12, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14 }}>{value}</div>
    </div>
  );
}

/* ---------------- Main ---------------- */
export default function App() {
  // 0 — Competition
  const [competition, setCompetition] = useState<(typeof COMPETITION_OPTIONS)[number]["id"]>("maybe");

  // 1 — Basics
  const [propertyAddress, setPropertyAddress] = useState("");
  const [buyerNames, setBuyerNames] = useState("");
  const [settlementDate, setSettlementDate] = useState("");
  const [totalCash, setTotalCash] = useState<string>("");
  const [notes, setNotes] = useState("");

  // 2 — Financing
  const [financing, setFinancing] = useState<(typeof FINANCING_OPTIONS)[number]["id"]>("conv");
  const [downPct, setDownPct] = useState<number>(20);

  // 3 — Home Sale Contingency
  const [saleCont, setSaleCont] = useState<(typeof SALE_CONTINGENCY)[number]["id"]>("noSale");

  // 4 — EMD
  const [emdPct, setEmdPct] = useState<number>(5);

  // 5 — Inspections
  const [inspection, setInspection] = useState<(typeof INSPECTION_OPTIONS)[number]["id"]>("aLaCarte");
  const [inspectionChecks, setInspectionChecks] = useState<string[]>([]);

  // 6 — Appraisal
  const [appraisal, setAppraisal] = useState<(typeof APPRAISAL_OPTIONS)[number]["id"]>("yes");
  const [gapAmount, setGapAmount] = useState<number>(0);

  // 7 — Financing Contingency
  const [finCont, setFinCont] = useState<(typeof FINANCING_CONT)[number]["id"]>("yes");

  // 8 — Taxes/Title
  const [taxSplit, setTaxSplit] = useState<(typeof TAX_TITLE_SPLIT)[number]["id"]>("split");
  const [titlePref, setTitlePref] = useState<(typeof TITLE_PREF)[number]["id"]>("sellerPref");

  // 9 — Commission
  const [commission, setCommission] = useState<(typeof COMMISSION)[number]["id"]>("sellerPays");

  // 10 — Price & extras
  const [listPrice, setListPrice] = useState<number | string>("");
  const [offerPrice, setOfferPrice] = useState<number | string>("");
  const [escalationCap, setEscalationCap] = useState<number | string>("");
  const [escalationBy, setEscalationBy] = useState<number | string>("");
  const [rentback, setRentback] = useState<(typeof RENTBACK)[number]["id"]>("none");

  // Derived score
  const score = useMemo(() => {
    let s = 60;

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

  const recsState = {
    competition, financing, downPct, emdPct, inspection, appraisal, finCont,
    taxSplit, titlePref, commission, listPrice, offerPrice, rentback,
  };

  return (
    <div className="mc-bg" style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 20px 48px" }}>
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Maison Collective — Offer Strategy Simulator
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Make your selections below. Your final Offer Strength appears at the end.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
            <Button variant="secondary" className="mc-btn-secondary" onClick={resetAll}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button onClick={downloadScenario}>
              <Download className="mr-2 h-4 w-4" /> Download JSON
            </Button>
          </div>
        </div>

        <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
          {/* 1. Competition */}
          <Card className="mc-card">
            <CardContent className="p-5 md:p-6">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 className="text-lg font-medium">1. Competition</h2>
                <Info className="h-4 w-4 text-neutral-400" />
              </div>
              <p className="mt-1 text-sm text-neutral-400">
                Is there a competition or are you the only offer? Choose one.
              </p>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr", marginTop: 14 }}>
                {COMPETITION_OPTIONS.map((opt) => (
                  <OptionTile
                    key={opt.id}
                    active={competition === opt.id}
                    label={opt.label}
                    onSelect={() => setCompetition(opt.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 2. Basic Information */}
          <Card className="mc-card">
            <CardContent className="p-5 md:p-6">
              <h2 className="text-lg font-medium">2. Basic Information</h2>
              <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
                <FormRow label="Property Address">
                  <Input
                    value={propertyAddress}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPropertyAddress(e.target.value)}
                    placeholder="123 Main St, City, ST"
                  />
                </FormRow>

                <FormRow label="Buyers Names">
                  <Input
                    value={buyerNames}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuyerNames(e.target.value)}
                    placeholder="Jane & John Doe"
                  />
                </FormRow>

                <FormRow label="Preferred Settlement Date">
                  <Input
                    type="date"
                    value={settlementDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettlementDate(e.target.value)}
                  />
                </FormRow>

                <FormRow label="Available Total Cash ($)">
                  <Input
                    inputMode="numeric"
                    value={totalCash}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTotalCash(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g., 160000"
                  />
                </FormRow>

                <FormRow label="Notes">
                  <Textarea
                    value={notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                    placeholder="Renovation budget, timeline constraints, etc."
                  />
                </FormRow>
              </div>
            </CardContent>
          </Card>

          {/* 3. Financing Method */}
          <Card className="mc-card">
            <CardContent className="p-5 md:p-6">
              <h2 className="text-lg font-medium">3. Financing Method</h2>

              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                {FINANCING_OPTIONS.map((opt) => (
                  <OptionTile
                    key={opt.id}
                    active={financing === opt.id}
                    label={opt.label}
                    onSelect={() => setFinancing(opt.id)}
                  />
                ))}
              </div>

              <div style={{ marginTop: 16 }}>
                <Label className="text-neutral-200">Down Payment (%)</Label>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
                  <Slider value={[downPct]} min={0} max={100} step={1} onValueChange={(v) => setDownPct(v[0])} className="w-full" />
                  <div style={{ width: 54, textAlign: "right", fontSize: 14 }}>{downPct}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Home Sale Contingency */}
          <Card className="mc-card">
            <CardContent className="p-5 md:p-6">
              <h2 className="text-lg font-medium">4. Home Sale Contingency</h2>
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                {SALE_CONTINGENCY.map((opt) => (
                  <OptionTile
                    key={opt.id}
                    active={saleCont === opt.id}
                    label={opt.label}
                    onSelect={() => setSaleCont(opt.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 5. Earnest Money Deposit */}
          <Card className="mc-card">
            <CardContent className="p-5 md:p-6">
              <h2 className="text-lg font-medium">5. Earnest Money Deposit (EMD)</h2>
              <p className="text-sm text-neutral-400" style={{ marginTop: 6 }}>
                Signals seriousness. Held by title/brokerage and credited at closing.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
                <Slider value={[emdPct]} min={0} max={20} step={1} onValueChange={(v) => setEmdPct(v[0])} className="w-full" />
                <div style={{ width: 64, textAlign: "right", fontSize: 14 }}>{emdPct}%</div>
              </div>
              <div style={{ display: "flex", gap: 8, fontSize: 12, opacity: .8, marginTop: 8, flexWrap: "wrap" }}>
                <span className="rounded" style={{ background: "rgba(255,255,255,.06)", padding: "4px 8px" }}>2% — Standard</span>
                <span className="rounded" style={{ background: "rgba(255,255,255,.06)", padding: "4px 8px" }}>5% — Strong</span>
                <span className="rounded" style={{ background: "rgba(255,255,255,.06)", padding: "4px 8px" }}>10%+ — Very Strong</span>
              </div>
            </CardContent>
          </Card>

          {/* 6. Home Inspection */}
          <Card className="mc-card">
            <CardContent className="p-5 md:p-6">
              <h2 className="text-lg font-medium">6. Home Inspection Contingency</h2>
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                {INSPECTION_OPTIONS.map((opt) => (
                  <OptionTile
                    key={opt.id}
                    active={inspection === opt.id}
                    label={opt.label}
                    onSelect={() => setInspection(opt.id)}
                  />
                ))}
              </div>

              {inspection === "aLaCarte" && (
                <div style={{ marginTop: 12 }}>
                  <Label className="text-neutral-200">Pick specific tests (optional)</Label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginTop: 10 }}>
                    {["Structural & Mechanical","Mold","Environmental","Radon","Chimney","Lead-Based Paint","Wood Destroying Insect"].map((k) => {
                      const id = k.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                      const checked = inspectionChecks.includes(id);
                      return (
                        <label key={id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
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

          {/* 7. Appraisal & Financing */}
          <Card className="mc-card">
            <CardContent className="p-5 md:p-6">
              <h2 className="text-lg font-medium">7. Appraisal & Financing Contingency</h2>
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                {APPRAISAL_OPTIONS.map((opt) => (
                  <OptionTile
                    key={opt.id}
                    active={appraisal === opt.id}
                    label={opt.label}
                    onSelect={() => setAppraisal(opt.id)}
                  />
                ))}
              </div>
              {appraisal === "gapCover" && (
                <div style={{ marginTop: 12 }}>
                  <Label className="text-neutral-200">Guarantee to cover appraisal gap up to ($)</Label>
                  <Input
                    inputMode="numeric"
                    value={gapAmount || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setGapAmount(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
                    }
                    placeholder="e.g., 10000"
                  />
                  <p className="mt-1 text-xs text-neutral-400" style={{ marginTop: 6 }}>
                    +1 score per $5,000 guaranteed (max +10)
                  </p>
                </div>
              )}
              <div style={{ display: "grid", gap: 12, marginTop: 12, gridTemplateColumns: "1fr" }}>
                {FINANCING_CONT.map((opt) => (
                  <OptionTile
                    key={opt.id}
                    active={finCont === opt.id}
                    label={opt.label}
                    onSelect={() => setFinCont(opt.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 8. Taxes/Title */}
          <Card className="mc-card">
            <CardContent className="p-5 md:p-6">
              <h2 className="text-lg font-medium">8. Recordation / Transfer Tax / Title Company</h2>
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                {TAX_TITLE_SPLIT.map((opt) => (
                  <OptionTile
                    key={opt.id}
                    active={taxSplit === opt.id}
                    label={opt.label}
                    onSelect={() => setTaxSplit(opt.id)}
                  />
                ))}
                {TITLE_PREF.map((opt) => (
                  <OptionTile
                    key={opt.id}
                    active={titlePref === opt.id}
                    label={opt.label}
                    onSelect={() => setTitlePref(opt.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 9. Commission */}
          <Card className="mc-card">
            <CardContent className="p-5 md:p-6">
              <h2 className="text-lg font-medium">9. Commission</h2>
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                {COMMISSION.map((opt) => (
                  <OptionTile
                    key={opt.id}
                    active={commission === opt.id}
                    label={opt.label}
                    onSelect={() => setCommission(opt.id)}
                  />
                ))}
              </div>
              <p className="text-xs text-neutral-400" style={{ marginTop: 10 }}>
                Note: Commission structures are evolving; your agent will confirm what the seller offers on this listing.
              </p>
            </CardContent>
          </Card>

          {/* 10. Offer Price & Escalation + Rent-back(옵션 왼쪽 / 라벨 오른쪽) */}
          <Card className="mc-card">
            <CardContent className="p-5 md:p-6">
              <h2 className="text-lg font-medium">10. Offer Price & Escalation</h2>

              <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
                <FormRow label="Seller Asking (List Price)">
                  <Input
                    inputMode="numeric"
                    value={listPrice}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setListPrice(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g., 875000"
                  />
                </FormRow>

                <FormRow label="Your Offer Price">
                  <Input
                    inputMode="numeric"
                    value={offerPrice}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOfferPrice(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g., 895000"
                  />
                </FormRow>

                <FormRow label="Escalation Up To">
                  <Input
                    inputMode="numeric"
                    value={escalationCap}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEscalationCap(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g., 920000"
                  />
                </FormRow>

                <FormRow label="Escalation By (increment)">
                  <Input
                    inputMode="numeric"
                    value={escalationBy}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEscalationBy(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g., 5000"
                  />
                </FormRow>
              </div>

              {/* 여기서 레이아웃 변경: 왼쪽에 옵션, 오른쪽에 라벨 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "start",
                  columnGap: 18,
                  rowGap: 10,
                  marginTop: 16,
                }}
              >
                {/* 왼쪽: 옵션들 (1~9번과 동일한 왼쪽 정렬, 세로 리스트) */}
                <div style={{ display: "grid", gap: 10 }}>
                  {RENTBACK.map((opt) => (
                    <OptionTile
                      key={opt.id}
                      active={rentback === opt.id}
                      label={opt.label}
                      onSelect={() => setRentback(opt.id)}
                      fullWidth={true}
                    />
                  ))}
                </div>

                {/* 오른쪽: Rent-back 라벨만 배치 */}
                <div style={{ textAlign: "right", alignSelf: "start" }}>
                  <Label className="text-neutral-200" style={{ margin: 0 }}>Rent-back</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Final — Offer Strength */}
          <Card className="mc-card">
            <CardContent className="p-6 md:p-8" style={{ textAlign: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Sparkles className="h-5 w-5 text-neutral-300" />
                <h2 className="text-xl md:text-2xl font-semibold">Final Offer Strength</h2>
              </div>

              <div style={{ marginTop: 18 }}>
                <div className="mc-bar" style={{ margin: "0 auto", maxWidth: 560 }}>
                  <motion.div
                    className="mc-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ type: "spring", stiffness: 80, damping: 20 }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 10 }}>
                  <div style={{ fontSize: 32, fontWeight: 600 }}>{score}</div>
                  <div className="rounded-full" style={{ border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.08)", padding: "6px 10px", fontSize: 14 }}>
                    <span style={{ marginRight: 6 }}>{badge.emoji}</span>
                    {badge.label}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0,1fr))", maxWidth: 680, margin: "18px auto 0" }}>
                <SummaryKV label="Competition" value={COMPETITION_OPTIONS.find(o=>o.id===competition)?.label || ""} />
                <SummaryKV label="Financing" value={`${FINANCING_OPTIONS.find(o=>o.id===financing)?.label?.split(" — ")[0]} • ${downPct}% down`} />
                <SummaryKV label="Appraisal" value={APPRAISAL_OPTIONS.find(o=>o.id===appraisal)?.label || ""} />
                <SummaryKV label="Price" value={`List $${Number(listPrice||0).toLocaleString()} → Offer $${Number(offerPrice||0).toLocaleString()}`} />
                {appraisal === "gapCover" && <SummaryKV label="Gap cover" value={`Up to $${gapAmount.toLocaleString()}`} />}
                <SummaryKV label="EMD" value={`${emdPct}% of offer`} />
              </div>

              <div style={{ marginTop: 18 }}>
                <p className="text-sm font-medium" style={{ marginBottom: 8 }}>Recommendations</p>
                <ul style={{ listStyle: "disc", paddingLeft: 18, margin: "0 auto", textAlign: "left", maxWidth: 680, lineHeight: 1.6 }}>
                  {getRecommendations(recsState).map((r, i) => (<li key={i} style={{ fontSize: 14 }}>{r}</li>))}
                </ul>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <Button
                  onClick={() => {
                    const txt = `Offer Plan (Score ${score} – ${badge.label})
- Competition: ${COMPETITION_OPTIONS.find(o=>o.id===competition)?.label}
- Financing: ${FINANCING_OPTIONS.find(o=>o.id===financing)?.label?.split(" — ")[0]} / ${downPct}% down
- Appraisal: ${APPRAISAL_OPTIONS.find(o=>o.id===appraisal)?.label}
- Price: List $${Number(listPrice||0).toLocaleString()} → Offer $${Number(offerPrice||0).toLocaleString()}
Recommendations:
${getRecommendations(recsState).map((x,i)=>`${i+1}. ${x}`).join("\n")}
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

              <p className="mt-5 text-xs text-neutral-400" style={{ textAlign: "center" }}>
                This output is educational. We will finalize with listing feedback and local norms before drafting.
              </p>
            </CardContent>
          </Card>

          {/* FOOTER — 항상 중앙 정렬 */}
          <footer
            className="text-xs text-neutral-500"
            style={{ marginTop: 8, width: "100%", textAlign: "center", display: "block" }}
          >
            © {new Date().getFullYear()} Maison Collective • Built for client education
          </footer>
        </div>
      </div>
    </div>
  );
}
