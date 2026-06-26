import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, Search, TrendingUp, Users, Zap, Layers,
  Activity, LayoutDashboard, Wifi, ChevronRight, Cpu, Globe, DollarSign,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";

// ─── Types ────────────────────────────────────────────────────────────────────
type View = "dashboard" | "blocks" | "transactions" | "mempool" | "network";
interface BlockchainInfo { chain: string; blocks: number; difficulty: number; mediantime: number; verificationprogress: number; }

// ─── Constants ────────────────────────────────────────────────────────────────
const NAV: { icon: React.ReactNode; label: string; view: View }[] = [
  { icon: <LayoutDashboard className="w-[18px] h-[18px]" />, label: "Dashboard",    view: "dashboard" },
  { icon: <Layers className="w-[18px] h-[18px]" />,          label: "Blocks",       view: "blocks" },
  { icon: <Activity className="w-[18px] h-[18px]" />,        label: "Transactions", view: "transactions" },
  { icon: <Zap className="w-[18px] h-[18px]" />,             label: "Mempool",      view: "mempool" },
  { icon: <Wifi className="w-[18px] h-[18px]" />,            label: "Network",      view: "network" },
];

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(10,10,16,0.97)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "12px",
  },
  labelStyle: { color: "rgba(255,255,255,0.6)" },
};
const GRID_COLOR  = "var(--color-border)";
const AXIS_COLOR  = "var(--color-muted-foreground)";
const RED         = "#e3231b";
const RED_LIGHT   = "#ff7a72";

// ─── Shared Components ────────────────────────────────────────────────────────

// Stagger animation variants (Apple-style sequential entrance)
const STAGGER = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } } },
  item: { hidden: { opacity: 0, y: 18, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.38, ease: [0.25, 0.1, 0.25, 1] } } },
};

function GlassCard({ children, className = "", style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={`glass rounded-2xl ${className}`}
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)", ...style }}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, sub, icon }: { title: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-[0.08em]">{title}</h3>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: "rgba(227,35,27,0.10)", color: RED }}>
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

function Loading() {
  return (
    <div className="flex justify-center items-center h-48">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

const PAGE = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.18 } };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt      = (n: number) => new Intl.NumberFormat().format(n);
const fmtDiff  = (d: number) => d >= 1e12 ? (d/1e12).toFixed(2)+"T" : d >= 1e9 ? (d/1e9).toFixed(2)+"B" : d.toFixed(2);
const fmtHash  = (h: number) => h >= 1e18 ? (h/1e18).toFixed(2)+" EH/s" : h >= 1e15 ? (h/1e15).toFixed(2)+" PH/s" : h >= 1e12 ? (h/1e12).toFixed(2)+" TH/s" : h.toFixed(0)+" H/s";
const fmtBytes = (b: number) => b >= 1e9 ? (b/1e9).toFixed(2)+" GB" : b >= 1e6 ? (b/1e6).toFixed(2)+" MB" : b >= 1e3 ? (b/1e3).toFixed(1)+" KB" : b+" B";

// ─── Halving Countdown ────────────────────────────────────────────────────────
function HalvingCard({ blockHeight }: { blockHeight: number | undefined }) {
  const INTERVAL = 210_000;
  if (!blockHeight) return null;
  const nextHalving  = Math.ceil(blockHeight / INTERVAL) * INTERVAL;
  const lastHalving  = nextHalving - INTERVAL;
  const remaining    = nextHalving - blockHeight;
  const progress     = ((blockHeight - lastHalving) / INTERVAL) * 100;
  const halvingNum   = nextHalving / INTERVAL;
  const estDate      = new Date(Date.now() + remaining * 10 * 60 * 1000);
  const estStr       = estDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <GlassCard className="p-6"
      style={{ boxShadow: "0 8px 40px rgba(227,35,27,0.08), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
      <CardHeader
        title={`Halving #${halvingNum}`}
        sub={`Est. ${estStr} · every 210,000 blocks`}
        icon={<Zap className="w-4 h-4" />}
      />

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-[12px] mb-2">
          <span className="text-muted-foreground">
            Block <span className="font-mono font-semibold text-foreground">{fmt(lastHalving)}</span>
          </span>
          <span className="text-muted-foreground">
            Block <span className="font-mono font-semibold text-foreground">{fmt(nextHalving)}</span>
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: `linear-gradient(to right, ${RED}, ${RED_LIGHT})` }} />
        </div>
        <div className="text-center mt-2">
          <span className="text-[11px] text-muted-foreground">
            {fmt(progress.toFixed(1))}% of epoch complete
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Blocks Left",  value: fmt(remaining) },
          { label: "Current",      value: `#${fmt(blockHeight)}` },
          { label: "Reward →",     value: `${(6.25 / Math.pow(2, halvingNum - 3)).toFixed(4)} BTC` },
        ].map(s => (
          <div key={s.label} className="rounded-2xl px-3 py-2.5 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{s.label}</div>
            <div className="text-[13px] font-bold font-mono text-foreground">{s.value}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW: DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function DashboardView({ blockchainInfo, recentBlocks, recentTxs, networkInfo, mempoolInfo, maxTx, isLoading, btcPrice, priceHistory }: any) {
  const stats = [
    { label: "Block Height", raw: blockchainInfo?.blocks,          value: blockchainInfo ? fmt(blockchainInfo.blocks) : "—",          sub: "Mainnet",          icon: <Layers className="w-5 h-5" /> },
    { label: "Difficulty",   raw: null,                            value: blockchainInfo ? fmtDiff(blockchainInfo.difficulty) : "—",   sub: "Current epoch",    icon: <TrendingUp className="w-5 h-5" /> },
    { label: "Peers",        raw: networkInfo?.connections,        value: networkInfo ? String(networkInfo.connections) : "—",         sub: networkInfo?.networkactive ? "Network active" : "Offline", icon: <Users className="w-5 h-5" /> },
    { label: "Mempool",      raw: mempoolInfo?.size,               value: mempoolInfo ? fmt(mempoolInfo.size) : "—",                   sub: mempoolInfo ? `${(mempoolInfo.bytes/1e6).toFixed(1)} MB pending` : "—", icon: <Zap className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <motion.div className="grid grid-cols-2 xl:grid-cols-4 gap-4"
        variants={STAGGER.container} initial="hidden" animate="show">
        {stats.map((s, i) => (
          <motion.div key={s.label} variants={STAGGER.item}>
            <GlassCard className="p-6 h-full cursor-default"
              style={{ boxShadow: i === 0 ? "0 8px 40px rgba(227,35,27,0.15), inset 0 1px 0 rgba(255,255,255,0.08)" : undefined }}>
              <div className="flex items-center justify-between mb-5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">{s.label}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(227,35,27,0.12)", color: RED }}>{s.icon}</div>
              </div>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : (
                <div className={`text-[2.25rem] font-semibold leading-none tracking-tight tabular-nums ${i === 0 ? "text-gradient-red" : "text-foreground"}`}>
                  {s.raw != null ? <AnimatedNumber value={s.raw} /> : s.value}
                </div>
              )}
              <div className="mt-2.5 text-[11px] text-muted-foreground font-medium">{s.sub}</div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Blocks + Transactions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <GlassCard className="p-6">
          <CardHeader title="Recent Blocks" sub="Latest 10 blocks" icon={<Layers className="w-4 h-4" />} />
          {isLoading ? <Loading /> : (
            <motion.div className="space-y-1" variants={STAGGER.container} initial="hidden" animate="show">
              {recentBlocks.map((block: any) => (
                <motion.div key={block.hash} variants={STAGGER.item}>
                  <Link href={`/block/${block.hash}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/40 transition-colors group cursor-pointer">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(227,35,27,0.10)" }}>
                      <Layers className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="w-28 shrink-0">
                      <div className="text-[13px] font-semibold text-foreground">#{fmt(block.height)}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">{block.hash.substring(0, 14)}…</div>
                    </div>
                    <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.max((block.nTx/maxTx)*100, 4)}%`, background: `linear-gradient(to right, ${RED}, ${RED_LIGHT})` }} />
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[13px] font-medium text-foreground">{fmt(block.nTx)} txs</div>
                      <div className="text-[11px] text-muted-foreground">{(block.size/1e6).toFixed(2)} MB</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <CardHeader title="Recent Transactions" sub="Mempool activity" icon={<Activity className="w-4 h-4" />} />
          {isLoading ? <Loading /> : (
            <motion.div className="space-y-1" variants={STAGGER.container} initial="hidden" animate="show">
              {recentTxs.slice(0, 10).map((tx: any) => (
                <motion.div key={tx.txid} variants={STAGGER.item}>
                  <Link href={`/tx/${tx.txid}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-muted/40 transition-colors group cursor-pointer">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(227,35,27,0.10)" }}>
                      <Activity className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-mono font-medium text-foreground truncate">{tx.txid.substring(0, 26)}…</div>
                      <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5"
                        style={{ background: tx.confirmations > 0 ? "rgba(52,211,153,0.12)" : "rgba(251,191,36,0.12)", color: tx.confirmations > 0 ? "rgb(52,211,153)" : "rgb(251,191,36)" }}>
                        {tx.confirmations > 0 ? `${tx.confirmations} conf` : "unconfirmed"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[13px] text-muted-foreground">{fmt(tx.size)} B</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </GlassCard>
      </div>

      {/* ── Price Chart + Satoshi Converter ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* 30-day price chart */}
        <GlassCard className="p-6 xl:col-span-2">
          <CardHeader
            title="BTC Price — 30 Days"
            sub={btcPrice ? `$${new Intl.NumberFormat("en-US").format(btcPrice.usd)} · ${btcPrice.change24h >= 0 ? "▲" : "▼"} ${Math.abs(btcPrice.change24h).toFixed(2)}% (24h)` : "Loading…"}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          {priceHistory.length === 0 ? <Loading /> : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={priceHistory} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={RED} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={RED} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="t" tick={{ fill: AXIS_COLOR, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis
                  tick={{ fill: AXIS_COLOR, fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v: any) => [`$${new Intl.NumberFormat("en-US").format(v)}`, "Price"]}
                />
                <Area type="monotone" dataKey="price" stroke={RED} strokeWidth={2}
                  fill="url(#priceGrad)" dot={false} activeDot={{ r: 4, fill: RED }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        {/* Satoshi converter */}
        <GlassCard className="p-6">
          <CardHeader title="Converter" sub="Live BTC price" icon={<Zap className="w-4 h-4" />} />
          <SatoshiConverter btcPrice={btcPrice} />
        </GlassCard>
      </div>

      {/* ── Currently Mining + Halving ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <GlassCard className="p-6">
          <CardHeader title="Currently Mining" sub="Next block estimate" icon={<Cpu className="w-4 h-4" />} />
          <CurrentlyMining mempoolInfo={mempoolInfo} recentBlocks={recentBlocks} />
        </GlassCard>
        <HalvingCard blockHeight={blockchainInfo?.blocks} />
      </div>

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW: BLOCKS
// ══════════════════════════════════════════════════════════════════════════════
function BlocksView({ recentBlocks, miningInfo, blockchainInfo, isLoading }: any) {
  const [, navigate] = useLocation();
  const chartData = useMemo(() =>
    [...recentBlocks].reverse().map((b: any) => ({
      height: `#${b.height}`,
      txs:  b.nTx,
      size: +(b.size / 1e6).toFixed(3),
      weight: +(b.weight / 1e6).toFixed(3),
    })), [recentBlocks]);

  return (
    <div className="space-y-5">
      {/* Mining stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Block Height",  value: blockchainInfo ? fmt(blockchainInfo.blocks) : "—" },
          { label: "Difficulty",    value: blockchainInfo ? fmtDiff(blockchainInfo.difficulty) : "—" },
          { label: "Network Hashrate", value: miningInfo ? fmtHash(miningInfo.networkhashps) : "—" },
          { label: "Pooled Txs",    value: miningInfo ? fmt(miningInfo.pooledtx) : "—" },
        ].map((s, i) => (
          <GlassCard key={s.label} className="p-6">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-3">{s.label}</div>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> :
              <div className="text-[1.7rem] font-bold text-foreground tracking-tight leading-none">{s.value}</div>}
          </GlassCard>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <GlassCard className="p-6">
          <CardHeader title="Transactions per Block" sub="Last 10 blocks" icon={<Activity className="w-4 h-4" />} />
          {isLoading ? <Loading /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="height" tick={{ fill: AXIS_COLOR, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [fmt(v), "Transactions"]} />
                <Bar dataKey="txs" fill={RED} radius={[6, 6, 0, 0]}
                  background={{ fill: "rgba(255,255,255,0.02)", radius: [6, 6, 0, 0] }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <CardHeader title="Block Size (MB)" sub="Last 10 blocks" icon={<Layers className="w-4 h-4" />} />
          {isLoading ? <Loading /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sizeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={RED} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={RED} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="height" tick={{ fill: AXIS_COLOR, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`${v} MB`, "Size"]} />
                <Area type="monotone" dataKey="size" stroke={RED} strokeWidth={2} fill="url(#sizeGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>

      {/* Block list */}
      <GlassCard className="p-6">
        <CardHeader title="Block List" sub="Last 10 blocks — click to explore" icon={<Layers className="w-4 h-4" />} />
        {isLoading ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border">
                  <th className="text-left py-2 pb-3 font-medium">Height</th>
                  <th className="text-left py-2 pb-3 font-medium hidden md:table-cell">Hash</th>
                  <th className="text-right py-2 pb-3 font-medium">Txs</th>
                  <th className="text-right py-2 pb-3 font-medium">Size</th>
                  <th className="text-right py-2 pb-3 font-medium hidden lg:table-cell">Weight</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {recentBlocks.map((block: any) => (
                  <tr key={block.hash} onClick={() => navigate(`/block/${block.hash}`)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group">
                    <td className="py-3 font-semibold text-foreground">#{fmt(block.height)}</td>
                    <td className="py-3 font-mono text-muted-foreground text-[12px] hidden md:table-cell">{block.hash.substring(0, 24)}…</td>
                    <td className="py-3 text-right text-foreground">{fmt(block.nTx)}</td>
                    <td className="py-3 text-right text-muted-foreground">{(block.size/1e6).toFixed(2)} MB</td>
                    <td className="py-3 text-right text-muted-foreground hidden lg:table-cell">{fmt(block.weight)}</td>
                    <td className="py-3 pl-3"><ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW: TRANSACTIONS
// ══════════════════════════════════════════════════════════════════════════════
function TransactionsView({ recentTxs, isLoading }: any) {
  const [, navigate] = useLocation();
  const sizeData = useMemo(() => {
    const buckets = [
      { range: "0–250 B",   min: 0,    max: 250 },
      { range: "250–500 B", min: 250,  max: 500 },
      { range: "500B–1KB",  min: 500,  max: 1000 },
      { range: "1–2 KB",    min: 1000, max: 2000 },
      { range: "2 KB+",     min: 2000, max: Infinity },
    ];
    return buckets.map(b => ({ range: b.range, count: recentTxs.filter((tx: any) => tx.size >= b.min && tx.size < b.max).length }));
  }, [recentTxs]);

  const avgSize  = useMemo(() => recentTxs.length ? Math.round(recentTxs.reduce((a: number, t: any) => a + t.size, 0) / recentTxs.length) : 0, [recentTxs]);
  const avgVsize = useMemo(() => recentTxs.length ? Math.round(recentTxs.reduce((a: number, t: any) => a + t.vsize, 0) / recentTxs.length) : 0, [recentTxs]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Transactions",  value: fmt(recentTxs.length) },
          { label: "Avg Size",      value: `${fmt(avgSize)} B` },
          { label: "Avg vSize",     value: `${fmt(avgVsize)} vB` },
          { label: "Total Size",    value: fmtBytes(recentTxs.reduce((a: number, t: any) => a + t.size, 0)) },
        ].map(s => (
          <GlassCard key={s.label} className="p-6">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-3">{s.label}</div>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> :
              <div className="text-[1.7rem] font-bold text-foreground tracking-tight leading-none">{s.value}</div>}
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-6">
        <CardHeader title="Size Distribution" sub="Transaction size buckets" icon={<Activity className="w-4 h-4" />} />
        {isLoading ? <Loading /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sizeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="range" tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: AXIS_COLOR, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [v, "Transactions"]} />
              <Bar dataKey="count" fill={RED} radius={[8, 8, 0, 0]}
                background={{ fill: "rgba(255,255,255,0.02)", radius: [8, 8, 0, 0] }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <CardHeader title="Transaction List" sub="Click any tx to inspect" icon={<Activity className="w-4 h-4" />} />
        {isLoading ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border">
                  <th className="text-left py-2 pb-3 font-medium">TXID</th>
                  <th className="text-right py-2 pb-3 font-medium">Size</th>
                  <th className="text-right py-2 pb-3 font-medium hidden md:table-cell">vSize</th>
                  <th className="text-right py-2 pb-3 font-medium hidden lg:table-cell">Weight</th>
                  <th className="text-right py-2 pb-3 font-medium">Confs</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {recentTxs.map((tx: any) => (
                  <tr key={tx.txid} onClick={() => navigate(`/tx/${tx.txid}`)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group">
                    <td className="py-3 font-mono text-[12px] text-muted-foreground">{tx.txid.substring(0, 28)}…</td>
                    <td className="py-3 text-right text-foreground">{fmt(tx.size)} B</td>
                    <td className="py-3 text-right text-muted-foreground hidden md:table-cell">{fmt(tx.vsize)} vB</td>
                    <td className="py-3 text-right text-muted-foreground hidden lg:table-cell">{fmt(tx.weight)}</td>
                    <td className="py-3 text-right">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: tx.confirmations > 0 ? "rgba(52,211,153,0.12)" : "rgba(251,191,36,0.12)", color: tx.confirmations > 0 ? "rgb(52,211,153)" : "rgb(251,191,36)" }}>
                        {tx.confirmations > 0 ? tx.confirmations : "0"}
                      </span>
                    </td>
                    <td className="py-3 pl-3"><ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW: MEMPOOL
// ══════════════════════════════════════════════════════════════════════════════
function MempoolView({ mempoolInfo, isLoading }: any) {
  const usagePct = mempoolInfo ? Math.min((mempoolInfo.usage / mempoolInfo.maxmempool) * 100, 100) : 0;
  const bytesPct  = mempoolInfo ? Math.min((mempoolInfo.bytes / mempoolInfo.maxmempool) * 100, 100) : 0;

  const pieData = mempoolInfo ? [
    { name: "Used",  value: mempoolInfo.usage,                                       color: RED },
    { name: "Free",  value: Math.max(mempoolInfo.maxmempool - mempoolInfo.usage, 0), color: "var(--color-muted)" },
  ] : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Transactions", value: mempoolInfo ? fmt(mempoolInfo.size) : "—", sub: "pending" },
          { label: "Size",         value: mempoolInfo ? fmtBytes(mempoolInfo.bytes) : "—", sub: "unconfirmed txs" },
          { label: "Memory Used",  value: mempoolInfo ? fmtBytes(mempoolInfo.usage) : "—", sub: `of ${mempoolInfo ? fmtBytes(mempoolInfo.maxmempool) : "—"} max` },
          { label: "Min Fee",      value: mempoolInfo ? `${(mempoolInfo.mempoolminfee * 1e8).toFixed(0)} sat/vB` : "—", sub: "minimum relay fee" },
        ].map(s => (
          <GlassCard key={s.label} className="p-6">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-3">{s.label}</div>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> :
              <div className="text-[1.7rem] font-bold text-foreground tracking-tight leading-none">{s.value}</div>}
            {s.sub && <div className="text-[12px] text-muted-foreground mt-1.5">{s.sub}</div>}
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Donut chart */}
        <GlassCard className="p-6">
          <CardHeader title="Memory Usage" sub="Mempool RAM allocation" icon={<Cpu className="w-4 h-4" />} />
          {isLoading ? <Loading /> : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
                    {pieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [fmtBytes(v)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="shrink-0 space-y-3 text-sm">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Used</div>
                  <div className="font-bold text-foreground text-lg">{usagePct.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Free</div>
                  <div className="font-bold text-foreground text-lg">{(100 - usagePct).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Progress bars */}
        <GlassCard className="p-6">
          <CardHeader title="Capacity" sub="Current mempool load" icon={<Zap className="w-4 h-4" />} />
          {isLoading ? <Loading /> : mempoolInfo && (
            <div className="space-y-6 mt-2">
              {[
                { label: "Memory Usage", pct: usagePct,  value: fmtBytes(mempoolInfo.usage) },
                { label: "TX Bytes",     pct: bytesPct,  value: fmtBytes(mempoolInfo.bytes) },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-[13px] mb-2">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold text-foreground">{item.value}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${item.pct}%`, background: `linear-gradient(to right, ${RED}, ${RED_LIGHT})` }} />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">{item.pct.toFixed(1)}% of max</div>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <StatTile label="Max Mempool"   value={fmtBytes(mempoolInfo.maxmempool)} />
                <StatTile label="Min Relay Fee" value={`${mempoolInfo.minrelaytxfee?.toFixed(8) ?? "—"} BTC/kB`} />
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW: NETWORK
// ══════════════════════════════════════════════════════════════════════════════
function NetworkView({ networkInfo, peerInfo, isLoading }: any) {
  const peers = (peerInfo || []) as any[];

  const peerTypeData = useMemo(() => {
    const ipv4   = peers.filter(p => p.network === "ipv4").length;
    const ipv6   = peers.filter(p => p.network === "ipv6").length;
    const onion  = peers.filter(p => p.network === "onion").length;
    const other  = peers.length - ipv4 - ipv6 - onion;
    return [
      { name: "IPv4",  value: ipv4,  color: RED },
      { name: "IPv6",  value: ipv6,  color: "#ff7a72" },
      { name: "Onion", value: onion, color: "#ff9e98" },
      { name: "Other", value: other, color: "var(--color-muted)" },
    ].filter(d => d.value > 0);
  }, [peers]);

  const inbound  = peers.filter(p => p.inbound).length;
  const outbound = peers.filter(p => !p.inbound).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Connections",  value: networkInfo ? String(networkInfo.connections) : "—" },
          { label: "Inbound",      value: String(inbound) },
          { label: "Outbound",     value: String(outbound) },
          { label: "Protocol",     value: networkInfo ? String(networkInfo.protocolversion ?? networkInfo.version) : "—" },
        ].map(s => (
          <GlassCard key={s.label} className="p-6">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-3">{s.label}</div>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> :
              <div className="text-[1.7rem] font-bold text-foreground tracking-tight leading-none">{s.value}</div>}
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Node info */}
        <GlassCard className="p-6">
          <CardHeader title="Node Info" sub="Your Bitcoin Core node" icon={<Globe className="w-4 h-4" />} />
          {isLoading ? <Loading /> : networkInfo && (
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Version"     value={String(networkInfo.version)} />
              <StatTile label="Client"      value={(networkInfo.subversion || "").replace(/\//g, "")} />
              <StatTile label="Status"      value={networkInfo.networkactive ? "Active" : "Offline"} />
              <StatTile label="Relay Txs"   value={networkInfo.relayfee ? `${networkInfo.relayfee} BTC/kB` : "—"} />
            </div>
          )}
        </GlassCard>

        {/* Peer type donut */}
        <GlassCard className="p-6">
          <CardHeader title="Peers by Network" sub="Connection type breakdown" icon={<Wifi className="w-4 h-4" />} />
          {isLoading ? <Loading /> : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={peerTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                    {peerTypeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="shrink-0 space-y-2">
                {peerTypeData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-semibold text-foreground ml-1">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Peer list */}
      <GlassCard className="p-6">
        <CardHeader title="Connected Peers" sub={`${peers.length} active connections`} icon={<Users className="w-4 h-4" />} />
        {isLoading ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border">
                  <th className="text-left py-2 pb-3 font-medium">Address</th>
                  <th className="text-left py-2 pb-3 font-medium hidden md:table-cell">Network</th>
                  <th className="text-left py-2 pb-3 font-medium hidden lg:table-cell">Client</th>
                  <th className="text-right py-2 pb-3 font-medium">Direction</th>
                  <th className="text-right py-2 pb-3 font-medium hidden xl:table-cell">Ping</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {peers.slice(0, 20).map((peer: any) => (
                  <tr key={peer.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-mono text-[12px] text-muted-foreground">{peer.addr}</td>
                    <td className="py-3 hidden md:table-cell">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "rgba(227,35,27,0.10)", color: RED }}>
                        {peer.network || "—"}
                      </span>
                    </td>
                    <td className="py-3 text-[12px] text-muted-foreground hidden lg:table-cell truncate max-w-[160px]">
                      {(peer.subver || "—").replace(/\//g, "")}
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: peer.inbound ? "rgba(52,211,153,0.10)" : "rgba(96,165,250,0.10)", color: peer.inbound ? "rgb(52,211,153)" : "rgb(96,165,250)" }}>
                        {peer.inbound ? "inbound" : "outbound"}
                      </span>
                    </td>
                    <td className="py-3 text-right text-muted-foreground text-[12px] hidden xl:table-cell">
                      {peer.pingtime != null ? `${(peer.pingtime * 1000).toFixed(0)} ms` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN HOME COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
// ─── BTC Price Hook ───────────────────────────────────────────────────────────
function useBtcPrice() {
  const [price, setPrice] = useState<{ usd: number; change24h: number } | null>(null);
  useEffect(() => {
    const fetch_ = () =>
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true")
        .then(r => r.json())
        .then(d => setPrice({ usd: d.bitcoin.usd, change24h: d.bitcoin.usd_24h_change }))
        .catch(() => {});
    fetch_();
    const id = setInterval(fetch_, 60_000);
    return () => clearInterval(id);
  }, []);
  return price;
}

// ─── Count-up animation hook ──────────────────────────────────────────────────
function useCountUp(target: number, duration = 1100): number {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (!target) return;
    const from = prev.current;
    prev.current = target;
    if (from === target) return;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setVal(Math.round(from + (target - from) * ease));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return val;
}

function AnimatedNumber({ value }: { value: number }) {
  const n = useCountUp(value);
  return <>{fmt(n)}</>;
}

// ─── Hash tooltip chip ────────────────────────────────────────────────────────
function HashChip({ hash, chars = 14 }: { hash: string; chars?: number }) {
  return (
    <span className="group relative inline-block">
      <span className="font-mono">{hash.slice(0, chars)}…{hash.slice(-6)}</span>
      <span className="pointer-events-none absolute z-50 bottom-full left-0 mb-1.5 hidden group-hover:flex
        px-2.5 py-1.5 rounded-xl text-[11px] font-mono text-foreground whitespace-nowrap select-all"
        style={{ background: "rgba(10,10,16,0.97)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
        {hash}
      </span>
    </span>
  );
}

// ─── 30-day price history hook ────────────────────────────────────────────────
function usePriceHistory() {
  const [history, setHistory] = useState<{ t: string; price: number }[]>([]);
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily")
      .then(r => r.json())
      .then(d => {
        const prices = (d.prices as [number, number][]).map(([ts, p]) => ({
          t: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          price: Math.round(p),
        }));
        setHistory(prices);
      })
      .catch(() => {});
  }, []);
  return history;
}

// ─── Satoshi Converter ────────────────────────────────────────────────────────
function SatoshiConverter({ btcPrice }: { btcPrice: { usd: number } | null }) {
  const [sats, setSats] = useState("100000");
  const [btc,  setBtc]  = useState("");
  const [usd,  setUsd]  = useState("");

  const calcFrom = (field: "sats" | "btc" | "usd", val: string) => {
    const n = parseFloat(val);
    if (isNaN(n) || !btcPrice) { setSats(""); setBtc(""); setUsd(""); return; }
    if (field === "sats") {
      setSats(val);
      setBtc((n / 1e8).toFixed(8));
      setUsd(((n / 1e8) * btcPrice.usd).toFixed(2));
    } else if (field === "btc") {
      setBtc(val);
      setSats(Math.round(n * 1e8).toString());
      setUsd((n * btcPrice.usd).toFixed(2));
    } else {
      setUsd(val);
      const b = n / btcPrice.usd;
      setBtc(b.toFixed(8));
      setSats(Math.round(b * 1e8).toString());
    }
  };

  // initialise once price loads
  useEffect(() => { if (btcPrice && sats) calcFrom("sats", sats); }, [btcPrice?.usd]);

  const fieldCls = "w-full bg-transparent text-[14px] font-mono font-bold text-foreground outline-none placeholder:text-muted-foreground/40";
  const wrapCls  = "rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors hover:bg-muted/30"
                 + " border border-border/60 focus-within:border-primary/50";

  return (
    <div className="space-y-2.5">
      <div className={wrapCls}>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-10 shrink-0">SAT</span>
        <input className={fieldCls} value={sats} placeholder="0"
          onChange={e => calcFrom("sats", e.target.value)} />
      </div>
      <div className={wrapCls}>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-10 shrink-0">BTC</span>
        <input className={fieldCls} value={btc} placeholder="0.00000000"
          onChange={e => calcFrom("btc", e.target.value)} />
      </div>
      <div className={wrapCls}>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-10 shrink-0">USD</span>
        <input className={fieldCls} value={usd} placeholder="0.00"
          onChange={e => calcFrom("usd", e.target.value)} />
      </div>
      {!btcPrice && (
        <p className="text-[11px] text-muted-foreground text-center pt-1">Fetching live price…</p>
      )}
    </div>
  );
}

// ─── Currently Mining card ────────────────────────────────────────────────────
function CurrentlyMining({ mempoolInfo, recentBlocks }: { mempoolInfo: any; recentBlocks: any[] }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const lastBlock    = recentBlocks[0];
  const lastTime     = lastBlock?.time ?? now;
  const elapsed      = Math.max(0, now - lastTime);
  const progress     = Math.min((elapsed / 600) * 100, 100);
  const remaining    = Math.max(0, 600 - elapsed);
  const remMin       = Math.floor(remaining / 60);
  const remSec       = remaining % 60;
  const elMin        = Math.floor(elapsed / 60);
  const elSec        = elapsed % 60;

  const feeMin  = mempoolInfo?.mempoolminfee ? (mempoolInfo.mempoolminfee * 1e8).toFixed(1) : "—";
  const pending = mempoolInfo ? fmt(mempoolInfo.size) : "—";
  const sizeMb  = mempoolInfo ? (mempoolInfo.bytes / 1e6).toFixed(1) : "—";

  return (
    <div className="space-y-4">
      {/* Block timer */}
      <div>
        <div className="flex justify-between text-[12px] mb-2">
          <span className="text-muted-foreground">
            Last block <span className="font-mono text-foreground">{elMin}m {String(elSec).padStart(2,"0")}s</span> ago
          </span>
          <span className="text-muted-foreground">
            {remaining > 0
              ? <>Est. <span className="font-mono text-foreground">{remMin}m {String(remSec).padStart(2,"0")}s</span> remaining</>
              : <span style={{ color: RED }}>Overdue — any moment</span>}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${progress}%`,
              background: progress < 80
                ? `linear-gradient(to right, ${RED}, ${RED_LIGHT})`
                : "linear-gradient(to right, #f59e0b, #fbbf24)",
            }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>0 min</span><span>10 min avg</span>
        </div>
      </div>

      {/* Mempool stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending Txs",   value: pending },
          { label: "Mempool Size",  value: `${sizeMb} MB` },
          { label: "Min Fee",       value: `${feeMin} sat/vB` },
        ].map(s => (
          <div key={s.label} className="rounded-2xl px-3 py-2.5 text-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{s.label}</div>
            <div className="text-[13px] font-bold font-mono text-foreground">{s.value}</div>
          </div>
        ))}
      </div>

      {lastBlock && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: RED, boxShadow: `0 0 6px ${RED}` }} />
          <span className="text-[11px] text-muted-foreground">
            Last: <Link href={`/block/${lastBlock.hash}`} className="font-mono text-primary hover:underline">
              #{fmt(lastBlock.height)}
            </Link>
            {" · "}{fmt(lastBlock.nTx)} txs · {(lastBlock.size / 1e6).toFixed(2)} MB
          </span>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [toast, setToast] = useState<{ height: number; nTx: number } | null>(null);
  const btcPrice      = useBtcPrice();
  const priceHistory  = usePriceHistory();
  const [, navigate]  = useLocation();
  const utils         = trpc.useUtils();
  const searchRef     = useRef<HTMLInputElement>(null);
  const prevHeightRef = useRef<number | null>(null);

  // Queries
  const blockchainInfoQ = trpc.blockchain.getBlockchainInfo.useQuery(undefined, { refetchInterval: 30000 });
  const recentBlocksQ   = trpc.blockchain.getRecentBlocks.useQuery({ count: 10 }, { refetchInterval: 30000 });
  const recentTxsQ      = trpc.blockchain.getRecentTransactions.useQuery({ count: 20 }, { refetchInterval: 30000 });
  const networkInfoQ    = trpc.blockchain.getNetworkInfo.useQuery(undefined, { refetchInterval: 60000 });
  const mempoolInfoQ    = trpc.blockchain.getMempoolInfo.useQuery(undefined, { refetchInterval: 30000 });
  const miningInfoQ     = trpc.blockchain.getMiningInfo.useQuery(undefined, { refetchInterval: 60000 });
  const peerInfoQ       = trpc.blockchain.getPeerInfo.useQuery(undefined, { refetchInterval: 60000 });

  const blockchainInfo = blockchainInfoQ.data?.data as BlockchainInfo | undefined;
  const recentBlocks   = (recentBlocksQ.data?.data || []) as any[];
  const recentTxs      = (recentTxsQ.data?.data || []) as any[];
  const networkInfo    = networkInfoQ.data?.data as any;
  const mempoolInfo    = mempoolInfoQ.data?.data as any;
  const miningInfo     = miningInfoQ.data?.data as any;
  const peerInfo       = peerInfoQ.data?.data as any;

  const maxTx = useMemo(() => Math.max(...recentBlocks.map(b => b.nTx || 0), 1), [recentBlocks]);
  const isLoading = blockchainInfoQ.isLoading || recentBlocksQ.isLoading;

  // New-block toast
  useEffect(() => {
    const h = blockchainInfo?.blocks;
    if (!h) return;
    if (prevHeightRef.current !== null && h > prevHeightRef.current) {
      const nTx = recentBlocks[0]?.nTx ?? 0;
      setToast({ height: h, nTx });
      const id = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(id);
    }
    prevHeightRef.current = h;
  }, [blockchainInfo?.blocks]);

  // "/" shortcut → focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT","TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setSearchLoading(true);
    try {
      if (/^[a-fA-F0-9]{64}$/.test(query)) {
        try { const r = await utils.blockchain.getBlock.fetch({ hash: query }); if (r?.success && r.data) { navigate(`/block/${query}`); return; } } catch {}
        navigate(`/tx/${query}`); return;
      }
      if (/^\d+$/.test(query)) {
        try { const r = await utils.blockchain.getBlockByHeight.fetch({ height: Number(query) }); if (r?.success && r.data?.hash) { navigate(`/block/${r.data.hash}`); return; } } catch {}
      }
      navigate(`/`);
    } finally { setSearchLoading(false); }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Sidebar ── */}
      <aside className="w-[240px] shrink-0 flex flex-col"
        style={{ background: "var(--color-sidebar, var(--sidebar))", borderRight: "1px solid var(--color-border, var(--border))" }}>
        <div className="px-5 pt-7 pb-5">
          {/* UFM institutional logo mark */}
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-[6px] flex flex-col items-center justify-center"
              style={{ background: "#CC1F1F", width: 44, height: 44, padding: "5px 6px", gap: 0 }}>
              <span style={{ color: "white", fontSize: "6px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.1 }}>CIENCIAS</span>
              <span style={{ color: "white", fontSize: "6px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.1 }}>ECONÓMICAS</span>
              <div style={{ width: "100%", height: "1px", background: "rgba(255,255,255,0.55)", margin: "3px 0 2px" }} />
              <span style={{ color: "white", fontSize: "13px", fontWeight: 900, letterSpacing: "0.04em", lineHeight: 1 }}>UFM</span>
            </div>
            <div>
              <div className="font-bold text-[14px] text-foreground tracking-tight leading-tight">BTC Explorer</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">Proyecto Bitcoin · CS076</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(item => (
            <button key={item.view} onClick={() => setActiveView(item.view)}
              className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 cursor-pointer text-left
                ${activeView === item.view
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 px-3.5"}`}
              style={activeView === item.view ? {
                background: "rgba(227,35,27,0.08)",
                borderLeft: "2.5px solid rgba(227,35,27,0.85)",
                paddingLeft: "calc(0.875rem - 2.5px)",
                paddingRight: "0.875rem",
              } : {}}>
              {item.icon}
              <span>{item.label}</span>
              {activeView === item.view && (
                <div className="live-dot ml-auto w-1.5 h-1.5 rounded-full bg-primary" style={{ boxShadow: "0 0 6px rgba(227,35,27,0.8)" }} />
              )}
            </button>
          ))}
        </nav>

        <div className="px-5 py-5 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }} />
              <span className="text-[12px] text-muted-foreground">Live · Mainnet</span>
            </div>
            {blockchainInfo && (
              <AnimatePresence mode="wait">
                <motion.span
                  key={blockchainInfo.blocks}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="text-[11px] font-mono font-semibold"
                  style={{ color: RED }}
                >
                  #{fmt(blockchainInfo.blocks)}
                </motion.span>
              </AnimatePresence>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground/60 italic pl-4">"Don't Trust, Verify."</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-4 px-7 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--color-border, var(--border))", backdropFilter: "blur(12px)" }}>
          <form onSubmit={handleSearch} className="flex gap-2.5 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input ref={searchRef} type="text" placeholder="Block, transaction, or height..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-8 h-10 rounded-xl bg-muted/50 border-transparent focus:border-primary/30 text-sm" />
              {!searchQuery && (
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50
                  border border-border/50 rounded px-1 py-0.5 font-sans hidden lg:block">/</kbd>
              )}
            </div>
            <Button type="submit" disabled={searchLoading || !searchQuery.trim()} className="h-10 px-5 rounded-xl font-medium text-sm"
              style={{ background: "linear-gradient(135deg, #e3231b 0%, #ff5a4e 100%)", boxShadow: "0 2px 12px rgba(227,35,27,0.35)" }}>
              {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
            </Button>
          </form>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-xs text-muted-foreground hidden lg:block">
              {blockchainInfo ? `Block #${fmt(blockchainInfo.blocks)}` : ""}
            </div>
            {btcPrice && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">BTC</span>
                <span className="text-[13px] font-bold text-foreground font-mono">
                  ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(btcPrice.usd)}
                </span>
                <span className={`text-[11px] font-semibold ${btcPrice.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {btcPrice.change24h >= 0 ? "▲" : "▼"} {Math.abs(btcPrice.change24h).toFixed(2)}%
                </span>
              </div>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-7 py-7">
          <AnimatePresence mode="wait">
            <motion.div key={activeView} {...PAGE}>
              {activeView === "dashboard"    && <DashboardView blockchainInfo={blockchainInfo} recentBlocks={recentBlocks} recentTxs={recentTxs} networkInfo={networkInfo} mempoolInfo={mempoolInfo} maxTx={maxTx} isLoading={isLoading} btcPrice={btcPrice} priceHistory={priceHistory} />}
              {activeView === "blocks"       && <BlocksView recentBlocks={recentBlocks} miningInfo={miningInfo} blockchainInfo={blockchainInfo} isLoading={blockchainInfoQ.isLoading || recentBlocksQ.isLoading || miningInfoQ.isLoading} />}
              {activeView === "transactions" && <TransactionsView recentTxs={recentTxs} isLoading={recentTxsQ.isLoading} />}
              {activeView === "mempool"      && <MempoolView mempoolInfo={mempoolInfo} isLoading={mempoolInfoQ.isLoading} />}
              {activeView === "network"      && <NetworkView networkInfo={networkInfo} peerInfo={peerInfo} isLoading={networkInfoQ.isLoading || peerInfoQ.isLoading} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── New block toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: 20,  scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer"
            style={{ background: "rgba(10,10,16,0.97)", border: "1px solid rgba(227,35,27,0.4)", boxShadow: "0 8px 32px rgba(227,35,27,0.2), 0 0 0 1px rgba(227,35,27,0.1)" }}
            onClick={() => setToast(null)}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(227,35,27,0.15)" }}>
              <Layers className="w-4 h-4" style={{ color: RED }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">New block mined!</div>
              <div className="text-[11px] text-white/60">
                #{fmt(toast.height)} · {fmt(toast.nTx)} transactions
              </div>
            </div>
            <div className="w-1.5 h-1.5 rounded-full ml-1 shrink-0"
              style={{ background: RED, boxShadow: `0 0 8px ${RED}` }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
