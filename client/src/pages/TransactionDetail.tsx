import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  Loader2, Copy, Check, ArrowLeft,
  Hash, Clock, Layers, Activity, Zap, FileCode, ArrowRight,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

// ─── Constants (identical to Home.tsx) ────────────────────────────────────────
const RED       = "#e3231b";
const RED_LIGHT = "#ff7a72";

// ─── Helpers (identical to Home.tsx) ─────────────────────────────────────────
const fmt        = (n: number) => new Intl.NumberFormat().format(n);
const formatSats = (sats: number) => (sats / 1e8).toFixed(8);
const shortHash  = (h: string, n = 14) => h ? `${h.slice(0, n)}…${h.slice(-6)}` : "—";
const fmtTime    = (ts: number) =>
  ts ? new Date(ts * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

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

// ─── Copy button ──────────────────────────────────────────────────────────────
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

// ─── Confirmation badge (same color logic as tx list in Home) ─────────────────
function ConfBadge({ confirmations }: { confirmations: number }) {
  const confirmed = confirmations > 0;
  return (
    <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{
        background: confirmed ? "rgba(52,211,153,0.12)" : "rgba(251,191,36,0.12)",
        color:      confirmed ? "rgb(52,211,153)"        : "rgb(251,191,36)",
      }}>
      {confirmed ? `${fmt(confirmations)} confirmations` : "unconfirmed"}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function TransactionDetail() {
  const params = useParams<{ txid: string }>();
  const { data, isLoading, error } = trpc.blockchain.getTransaction.useQuery(
    { txid: params.txid ?? "" },
    { enabled: Boolean(params.txid) }
  );

  const [, navigate] = useLocation();
  const tx = data?.data as any;
  const totalOutput  = tx?.outputs?.reduce((s: number, o: any) => s + (o.value ?? 0), 0) ?? 0;
  const inputCount   = tx?.inputs?.length  ?? 0;
  const outputCount  = tx?.outputs?.length ?? 0;
  const isCoinbase   = tx?.inputs?.[0]?.coinbase != null;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Header — mirrors Home.tsx header exactly ── */}
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
            <p className="text-muted-foreground">Transaction not found.</p>
          </GlassCard>
        )}

        {/* Breadcrumb */}
        {tx && (
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-5">
            <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link>
            <ArrowRight className="w-3 h-3 shrink-0" />
            {tx.blockhash && (
              <>
                <Link href={`/block/${tx.blockhash}`} className="hover:text-foreground transition-colors font-mono" title={tx.blockhash}>
                  Block {shortHash(tx.blockhash, 8)}
                </Link>
                <ArrowRight className="w-3 h-3 shrink-0" />
              </>
            )}
            <span className="text-foreground font-mono" title={tx.txid}>{tx.txid.slice(0, 12)}…</span>
          </div>
        )}

        {tx && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >

            {/* ── TXID hero — same shadow treatment as top stat card in Dashboard ── */}
            <GlassCard className="p-6"
              style={{ boxShadow: "0 8px 32px rgba(227,35,27,0.12), inset 0 1px 0 rgba(255,255,255,0.06)" }}>

              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
                  Transaction ID
                </span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(227,35,27,0.12)", color: RED }}>
                  <Hash className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-start gap-2 mb-2">
                <span className="text-[13px] font-mono text-foreground break-all leading-relaxed flex-1 select-all">
                  {tx.txid}
                </span>
                <CopyButton text={tx.txid} />
              </div>

              {tx.confirmations != null && <ConfBadge confirmations={tx.confirmations} />}

              {/* Quick stats — same StatTile component as Home */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
                <StatTile label="Confirmations" value={tx.confirmations != null ? fmt(tx.confirmations) : "—"} sub={tx.confirmations > 0 ? "Confirmed" : "Unconfirmed"} />
                <StatTile label="Total Output"  value={`${formatSats(totalOutput)}`} sub="BTC" />
                <StatTile label="Inputs"        value={fmt(inputCount)}  sub={isCoinbase ? "Coinbase" : "UTXOs spent"} />
                <StatTile label="Outputs"       value={fmt(outputCount)} sub="UTXOs created" />
              </div>
            </GlassCard>

            {/* ── General Info + Block Info ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

              <GlassCard className="p-6">
                <CardHeader title="General Info" icon={<Activity className="w-4 h-4" />} />
                <div className="space-y-1">
                  {[
                    { label: "Version",  value: String(tx.version) },
                    { label: "Size",     value: `${fmt(tx.size)} bytes` },
                    { label: "vSize",    value: `${fmt(tx.vsize)} vbytes` },
                    { label: "Weight",   value: `${fmt(tx.weight)} WU` },
                    { label: "Locktime", value: String(tx.locktime) },
                  ].map(row => (
                    <div key={row.label}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/40 transition-colors">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(227,35,27,0.10)" }}>
                        <Activity className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{row.label}</div>
                        <div className="text-[13px] font-mono font-medium text-foreground">{row.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <CardHeader title="Block Info" icon={<Layers className="w-4 h-4" />} />
                <div className="space-y-1">
                  {/* Timestamp */}
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/40 transition-colors">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(227,35,27,0.10)" }}>
                      <Clock className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Timestamp</div>
                      <div className="text-[13px] font-medium text-foreground">{fmtTime(tx.time)}</div>
                    </div>
                  </div>

                  {/* Confirmations */}
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/40 transition-colors">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(227,35,27,0.10)" }}>
                      <Layers className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Confirmations</div>
                      <div className="text-[13px] font-medium text-foreground">
                        {tx.confirmations != null ? fmt(tx.confirmations) : "Unconfirmed"}
                      </div>
                    </div>
                  </div>

                  {/* Block hash */}
                  {tx.blockhash && (
                    <Link href={`/block/${tx.blockhash}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/40 transition-colors group cursor-pointer">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(227,35,27,0.10)" }}>
                        <Hash className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Block Hash</div>
                        <div className="text-[13px] font-mono font-medium text-primary truncate">{shortHash(tx.blockhash)}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                    </Link>
                  )}
                </div>
              </GlassCard>
            </div>

            {/* ── Inputs ── */}
            <GlassCard className="p-6">
              <CardHeader
                title="Inputs"
                sub={`${inputCount} input${inputCount !== 1 ? "s" : ""}${isCoinbase ? " · Coinbase" : ""}`}
                icon={<Zap className="w-4 h-4" />}
              />
              <div className="space-y-1">
                {tx.inputs?.map((inp: any, i: number) => (
                  inp.coinbase ? (
                    /* Coinbase input */
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/40 transition-colors">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(52,211,153,0.12)" }}>
                        <Zap className="w-3.5 h-3.5" style={{ color: "rgb(52,211,153)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(52,211,153,0.12)", color: "rgb(52,211,153)" }}>
                          Coinbase
                        </span>
                        <div className="text-[12px] text-muted-foreground mt-0.5">Newly minted coins</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] text-muted-foreground">seq: {(inp.sequence >>> 0).toString(16).padStart(8, "0")}</div>
                      </div>
                    </div>
                  ) : (
                    /* Regular input */
                    <Link key={i} href={`/tx/${inp.prevTxid}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/40 transition-colors group cursor-pointer">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(227,35,27,0.10)" }}>
                        <Zap className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-mono font-medium text-foreground truncate" title={inp.prevTxid}>
                          {inp.prevTxid ? `${inp.prevTxid.substring(0, 26)}…` : "—"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">vout: {inp.prevVout}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-muted-foreground font-mono hidden md:block">#{i}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
                      </div>
                    </Link>
                  )
                ))}
              </div>
            </GlassCard>

            {/* ── Outputs ── */}
            <GlassCard className="p-6">
              <CardHeader
                title="Outputs"
                sub={`${outputCount} output${outputCount !== 1 ? "s" : ""} · ${formatSats(totalOutput)} BTC`}
                icon={<FileCode className="w-4 h-4" />}
              />
              <div className="space-y-1">
                {tx.outputs?.map((out: any, i: number) => {
                  const btc = formatSats(out.value ?? 0);
                  const pct = totalOutput > 0 ? Math.max(((out.value ?? 0) / totalOutput) * 100, 3) : 0;
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/40 transition-colors">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(227,35,27,0.10)" }}>
                        <FileCode className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-mono font-medium text-foreground">{btc} BTC</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 rounded-full bg-muted/60 overflow-hidden max-w-[120px]">
                            <div className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: `linear-gradient(to right, ${RED}, ${RED_LIGHT})` }} />
                          </div>
                          {out.scriptPubKeyType && (
                            <span className="text-[10px] text-muted-foreground">{out.scriptPubKeyType}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] text-muted-foreground">vout #{out.vout ?? i}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

          </motion.div>
        )}
      </main>
    </div>
  );
}
