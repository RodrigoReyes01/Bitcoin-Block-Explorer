import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, TrendingUp, Users, Zap } from "lucide-react";
import { Link } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";

interface BlockchainInfo {
  chain: string;
  blocks: number;
  difficulty: number;
  mediantime: number;
  verificationprogress: number;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const utils = trpc.useUtils();

  // Obtener información de la blockchain
  const blockchainInfoQuery = trpc.blockchain.getBlockchainInfo.useQuery(undefined, {
    refetchInterval: 30000, // Actualizar cada 30 segundos
  });

  // Obtener bloques recientes
  const recentBlocksQuery = trpc.blockchain.getRecentBlocks.useQuery(
    { count: 10 },
    { refetchInterval: 30000 }
  );

  // Obtener transacciones recientes
  const recentTxsQuery = trpc.blockchain.getRecentTransactions.useQuery(
    { count: 10 },
    { refetchInterval: 30000 }
  );

  // Obtener información de red
  const networkInfoQuery = trpc.blockchain.getNetworkInfo.useQuery(undefined, {
    refetchInterval: 60000,
  });

  // Obtener información del mempool
  const mempoolInfoQuery = trpc.blockchain.getMempoolInfo.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearchLoading(true);

    try {
      // Caso 1: 64 caracteres hex → puede ser bloque o txid
      if (/^[a-fA-F0-9]{64}$/.test(query)) {
        try {
          // Intentar como bloque
          const blockResult = await utils.blockchain.getBlock.fetch({ hash: query });
          if (blockResult?.success && blockResult.data) {
            window.location.href = `/block/${query}`;
            return;
          }
        } catch {
          // ignoramos, probamos como txid
        }

        // Si no es bloque válido, asumimos que es txid
        window.location.href = `/tx/${query}`;
        return;
      }

      // Caso 2: solo dígitos → altura de bloque
      if (/^\d+$/.test(query)) {
        const height = Number(query);
        try {
          const res = await utils.blockchain.getBlockByHeight.fetch({ height });
          if (res?.success && res.data?.hash) {
            window.location.href = `/block/${res.data.hash}`;
            return;
          }
        } catch {
          // si falla, seguimos al fallback
        }
      }

      // Fallback: volver al inicio
      window.location.href = `/`;
    } finally {
      setSearchLoading(false);
    }
  };

  const blockchainInfo = blockchainInfoQuery.data?.data as BlockchainInfo | undefined;
  const recentBlocks = recentBlocksQuery.data?.data || [];
  const recentTxs = recentTxsQuery.data?.data || [];
  const networkInfo = networkInfoQuery.data?.data;
  const mempoolInfo = mempoolInfoQuery.data?.data;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatDifficulty = (diff: number) => {
    if (diff >= 1e12) return (diff / 1e12).toFixed(2) + "T";
    if (diff >= 1e9) return (diff / 1e9).toFixed(2) + "B";
    if (diff >= 1e6) return (diff / 1e6).toFixed(2) + "M";
    return diff.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Encabezado */}
      <header className="border-b bg-white dark:bg-slate-900 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">₿</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Bitcoin Block Explorer
              </h1>
            </div>
            <ThemeToggle />
          </div>

          {/* Barra de búsqueda */}
          <form onSubmit={handleSearch} className="w-full">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search block, transaction or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <Button
                type="submit"
                disabled={searchLoading || !searchQuery.trim()}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </form>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="container mx-auto px-4 py-8">
        {/* Cuadrícula de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Altura de bloque */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Block Height
              </CardTitle>
            </CardHeader>
            <CardContent>
              {blockchainInfoQuery.isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {blockchainInfo ? formatNumber(blockchainInfo.blocks) : "—"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dificultad */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Difficulty
              </CardTitle>
            </CardHeader>
            <CardContent>
              {blockchainInfoQuery.isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {blockchainInfo ? formatDifficulty(blockchainInfo.difficulty) : "—"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conexiones de Red */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Connections
              </CardTitle>
            </CardHeader>
            <CardContent>
              {networkInfoQuery.isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {networkInfo ? networkInfo.connections : "—"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tamaño de mempool */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Mempool Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mempoolInfoQuery.isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {mempoolInfo ? formatNumber(mempoolInfo.size) : "—"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bloques y Transacciones Recientes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bloques Recientes */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Blocks</CardTitle>
              <CardDescription>Last 10 blocks on the network</CardDescription>
            </CardHeader>
            <CardContent>
              {recentBlocksQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : recentBlocks.length > 0 ? (
                <div className="space-y-3">
                  {recentBlocks.map((block) => (
                    <Link key={block.hash} href={`/block/${block.hash}`}>
                      <a className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm font-semibold text-slate-900 dark:text-white truncate">
                            #{block.height}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {block.hash.substring(0, 16)}...
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {block.nTx} tx
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {block.size} B
                          </div>
                        </div>
                      </a>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No blocks available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transacciones Recientes */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Last 10 transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentTxsQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : recentTxs.length > 0 ? (
                <div className="space-y-3">
                  {recentTxs.map((tx) => (
                    <Link key={tx.txid} href={`/tx/${tx.txid}`}>
                      <a className="flex items_center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {tx.txid.substring(0, 16)}...
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {tx.confirmations} confirmations
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {tx.size} B
                          </div>
                        </div>
                      </a>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No transactions available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Información de la Red */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Detalles de la Red */}
          <Card>
            <CardHeader>
              <CardTitle>Network Information</CardTitle>
            </CardHeader>
            <CardContent>
              {networkInfoQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : networkInfo ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Version:</span>
                    <span className="font-mono text-slate-900 dark:text-white">{networkInfo.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Subversion:</span>
                    <span className="font-mono text-slate-900 dark:text-white text-sm truncate">
                      {networkInfo.subversion}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Connections:</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      {networkInfo.connections}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Active:</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      {networkInfo.networkactive ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No information available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalles del Mempool */}
          <Card>
            <CardHeader>
              <CardTitle>Mempool Information</CardTitle>
            </CardHeader>
            <CardContent>
              {mempoolInfoQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : mempoolInfo ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Transactions:</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      {formatNumber(mempoolInfo.size)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Bytes:</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      {formatNumber(mempoolInfo.bytes)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Memory Usage:</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      {(mempoolInfo.usage / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Minimum Fee:</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      {mempoolInfo.mempoolminfee.toFixed(8)} BTC/B
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No information available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
