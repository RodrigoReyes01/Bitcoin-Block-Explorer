import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Copy, Check } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export default function BlockDetail() {
  const [, params] = useRoute("/block/:hash");
  const [copied, setCopied] = useState(false);

  if (!params?.hash) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Block not found</h1>
          <Link href="/">
            <a className="text-orange-500 hover:text-orange-600">Back to home</a>
          </Link>
        </div>
      </div>
    );
  }

  const blockQuery = trpc.blockchain.getBlock.useQuery({ hash: params.hash });
  const block = blockQuery.data?.data;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "—";
    return new Intl.NumberFormat().format(num);
  };

  if (blockQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!block) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Block not found</h1>
          <Link href="/">
            <a className="text-orange-500 hover:text-orange-600">Back to home</a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Cabecera */}
      <header className="border-b bg-white dark:bg-slate-900 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/">
              <a className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600">
                <ArrowLeft className="w-4 h-4" />
                Back
              </a>
            </Link>
            <ThemeToggle />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Block #{block.height}
          </h1>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="container mx-auto px-4 py-8">
        {/* Hash del bloque */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Block Hash</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
              <code className="flex-1 font-mono text-sm text-slate-900 dark:text-white break-all">
                {block.hash}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(block.hash)}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cuadrícula de detalles del bloque */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Información general */}
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Height:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatNumber(block.height)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Version:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {block.version}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Timestamp:</span>
                <span className="font-mono text-sm text-slate-900 dark:text-white">
                  {formatDate(block.time)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Confirmations:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatNumber(block.confirmations)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Información de minería */}
          <Card>
            <CardHeader>
              <CardTitle>Mining Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Difficulty:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {String(block.difficulty)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Nonce:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatNumber(block.nonce)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Bits:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {block.bits}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Weight:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatNumber(block.weight)} WU
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tamaño del bloque y transacciones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Información de tamaño */}
          <Card>
            <CardHeader>
              <CardTitle>Block Size</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Total Size:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatNumber(block.size)} bytes
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Stripped Size:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {block.strippedsize ? formatNumber(Number(block.strippedsize)) : "—"} bytes
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Transactions:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatNumber(block.nTx)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Información de Merkle y cadena */}
          <Card>
            <CardHeader>
              <CardTitle>Chain Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-slate-600 dark:text-slate-400 block mb-2">Merkle Root:</span>
                <code className="bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs font-mono text-slate-900 dark:text-white break-all">
                  {block.merkleroot}
                </code>
              </div>
              {block.previousblockhash && (
                <div>
                  <span className="text-slate-600 dark:text-slate-400 block mb-2">Previous Block:</span>
                  <Link href={`/block/${block.previousblockhash}`}>
                    <a className="text-orange-500 hover:text-orange-600 font-mono text-xs truncate block">
                      {block.previousblockhash}
                    </a>
                  </Link>
                </div>
              )}
              {block.nextblockhash && (
                <div>
                  <span className="text-slate-600 dark:text-slate-400 block mb-2">Next Block:</span>
                  <Link href={`/block/${block.nextblockhash}`}>
                    <a className="text-orange-500 hover:text-orange-600 font-mono text-xs truncate block">
                      {block.nextblockhash}
                    </a>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trabajo de cadena */}
        <Card>
          <CardHeader>
            <CardTitle>Chainwork</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="bg-slate-100 dark:bg-slate-800 p-4 rounded text-xs font-mono text-slate-900 dark:text-white break-all block">
              {block.chainwork}
            </code>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
