import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  Loader2, Copy, Check, ArrowLeft, ArrowRight,
  Hash, Clock, Layers, Activity, Zap, ChevronRight, Cpu, TrendingUp,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

// ─── Constants (identical to Home.tsx) ────────────────────────────────────────
const RED       = "#e3231b";
const RED_LIGHT = "#ff7a72";

// ─── Helpers (identical to Home.tsx) ─────────────────────────────────────────
const fmt       = (n: number | undefined | null) => n != null ? new Intl.NumberFormat().format(n) : "—";
const shortHash = (h: string | undefined | null, n = 14) => h ? `${h.slice(0, n)}…${h.slice(-6)}` : "—";
const fmtTime   = (ts: number | undefined | null) =>
  ts ? new Date(ts * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
const fmtDiff   = (d: number | undefined | null) =>
  d == null ? "—" : d >= 1e12 ? (d / 1e12).toFixed(2) + " T" : d >= 1e9 ? (d / 1e9).toFixed(2) + " B" : d.toFixed(2);

// ─── Shared Components (same as Home.tsx) ─────────────────────────────────────
function GlassCard({ children, className = "", style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={`glass rounded-3xl ${className}`}
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)", ...style }}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, sub, icon }: { title: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        {sub && <p className="text-[12px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(227,35,27,0.12)", color: RED }}>
        {icon}
      </div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl px-4 py-3.5"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{label}</div>
      <div className="text-[15px] font-bold font-mono text-foreground truncate">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1.5 rounded-lg transition-colors hover:bg-muted/60 shrink-0"
      style={{ color: copied ? "rgb(52,211,153)" : "var(--color-muted-foreground)" }}
      title="Copy">
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Info row — reusable list item matching Home's list pattern ───────────────
function InfoRow({ icon, label, value, mono = false }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/40 transition-colors">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "rgba(227,35,27,0.10)" }}>
        <span style={{ color: RED }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className={`text-[13px] font-medium text-foreground truncate ${mono ? "font-mono" : ""}`}>{value}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function BlockDetail() {
  const params = useParams<{ hash: string }>();
  const { data, isLoading, error } = trpc.blockchain.getBlock.useQuery(
    { hash: params.hash ?? "" },
    { enabled: Boolean(params.hash) }
  );

  const [, navigate] = useLocation();
  const block = data?.data as any;
  // tx can be an array of txid strings OR tx objects depending on verbosity
  const txList: string[] = Array.isArray(block?.tx)
    ? block.tx.map((t: any) => (typeof t === "string" ? t : t?.txid ?? ""))
    : [];
  const txCount = txList.length || block?.nTx || 0;
  const sizePct = block?.size ? Math.min((block.size / 1_000_000) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Header ── */}
      <header className="flex items-center gap-4 px-7 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border, var(--border))", backdropFilter: "blur(12px)" }}>
        <Link href="/" className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #e3231b 0%, #ff5a4e 100%)", boxShadow: "0 4px 20px rgba(227,35,27,0.5), inset 0 1px 0 rgba(255,255,255,0.2)" }}>
            <span className="text-white font-bold text-xl leading-none">₿</span>
          </div>
          <div>
            <div className="font-semibold text-[15px] text-foreground tracking-tight">BTC Explorer</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">UFM · Mainnet</div>
          </div>
        </Link>
        <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors ml-2">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[13px] font-medium hidden sm:block">Dashboard</span>
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 px-7 py-7 max-w-5xl mx-auto w-full">

        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <GlassCard className="p-8 text-center">
            <p className="text-muted-foreground">Block not found.</p>
          </GlassCard>
        )}

        {/* Breadcrumb */}
        {block && (
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-5">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="text-foreground font-mono">Block #{fmt(block.height)}</span>
          </div>
        )}

        {block && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >

            {/* ── Block Hash Hero ── */}
            <GlassCard className="p-6"
              style={{ boxShadow: "0 8px 32px rgba(227,35,27,0.12), inset 0 1px 0 rgba(255,255,255,0.06)" }}>

              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
                  Block Hash
                </span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(227,35,27,0.12)", color: RED }}>
                  <Layers className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-start gap-2 mb-4">
                <span className="text-[13px] font-mono text-foreground break-all leading-relaxed flex-1 select-all">
                  {block.hash}
                </span>
                <CopyButton text={block.hash} />
              </div>

              {/* Size progress bar */}
              <div className="mb-5">
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                  <span>Block size</span>
                  <span>{(block.size / 1e3).toFixed(1)} KB of ~1 MB limit</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${sizePct}%`, background: `linear-gradient(to right, ${RED}, ${RED_LIGHT})` }} />
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <StatTile label="Height"        value={block.height != null ? `#${fmt(block.height)}` : "—"} sub="Mainnet" />
                <StatTile label="Confirmations" value={block.confirmations != null ? fmt(block.confirmations) : "—"} sub="Confirmations" />
                <StatTile label="Transactions"  value={fmt(txCount)} sub="In this block" />
                <StatTile label="Weight"        value={block.weight ? `${(block.weight / 1e6).toFixed(3)} MWU` : "—"} sub="Block weight" />
              </div>
            </GlassCard>

            {/* ── Block Info + Mining Info ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

              <GlassCard className="p-6">
                <CardHeader title="Block Info" icon={<Layers className="w-4 h-4" />} />
                <div className="space-y-1">
                  <InfoRow icon={<Clock    className="w-3.5 h-3.5" />} label="Timestamp"   value={fmtTime(block.time)} />
                  <InfoRow icon={<Hash     className="w-3.5 h-3.5" />} label="Merkle Root" value={shortHash(block.merkleroot, 18)} mono />
                  <InfoRow icon={<Activity className="w-3.5 h-3.5" />} label="Version"     value={block.version != null ? `0x${(block.version >>> 0).toString(16).toUpperCase()}` : "—"} mono />
                  <InfoRow icon={<Layers   className="w-3.5 h-3.5" />} label="Size"        value={`${fmt(block.size)} bytes`} />
                  <InfoRow icon={<Zap      className="w-3.5 h-3.5" />} label="Median Time" value={fmtTime(block.mediantime)} />
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <CardHeader title="Mining Info" icon={<Cpu className="w-4 h-4" />} />
                <div className="space-y-1">
                  <InfoRow icon={<TrendingUp className="w-3.5 h-3.5" />} label="Difficulty" value={fmtDiff(block.difficulty)} />
                  <InfoRow icon={<Hash       className="w-3.5 h-3.5" />} label="Bits"       value={block.bits} mono />
                  <InfoRow icon={<Cpu        className="w-3.5 h-3.5" />} label="Nonce"      value={fmt(block.nonce)} />
                  <InfoRow icon={<Activity   className="w-3.5 h-3.5" />} label="Chain Work" value={block.chainwork ? shortHash(block.chainwork, 16) : "—"} mono />
                </div>
              </GlassCard>
            </div>

            {/* ── Prev / Next navigation ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {block.previousblockhash && (
                <GlassCard className="p-4 hover:scale-[1.02] transition-transform cursor-pointer group"
                  onClick={() => navigate(`/block/${block.previousblockhash}`)}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(227,35,27,0.10)" }}>
                      <ArrowLeft className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Previous Block</div>
                      <div className="text-[12px] font-mono text-primary truncate">{shortHash(block.previousblockhash)}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0 rotate-180" />
                  </div>
                </GlassCard>
              )}
              {block.nextblockhash && (
                <GlassCard className="p-4 hover:scale-[1.02] transition-transform cursor-pointer group"
                  onClick={() => navigate(`/block/${block.nextblockhash}`)}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(227,35,27,0.10)" }}>
                      <ArrowRight className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Next Block</div>
                      <div className="text-[12px] font-mono text-primary truncate">{shortHash(block.nextblockhash)}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                  </div>
                </GlassCard>
              )}
            </div>

            {/* ── Transactions list ── */}
            {txList.length > 0 && (
              <GlassCard className="p-6">
                <CardHeader
                  title="Transactions"
                  sub={`${fmt(txList.length)} transaction${txList.length !== 1 ? "s" : ""} in this block`}
                  icon={<Activity className="w-4 h-4" />}
                />
                <div className="space-y-1">
                  {txList.map((txid: string, i: number) => (
                    <Link key={txid} href={`/tx/${txid}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/40 transition-colors group cursor-pointer">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(227,35,27,0.10)" }}>
                        <Activity className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-mono font-medium text-foreground truncate" title={txid}>
                          {txid.substring(0, 32)}…
                        </div>
                        {i === 0 && (
                          <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5"
                            style={{ background: "rgba(52,211,153,0.12)", color: "rgb(52,211,153)" }}>
                            Coinbase
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-muted-foreground font-mono hidden md:block">#{i}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              </GlassCard>
            )}

          </motion.div>
        )}
      </main>
    </div>
  );
}
