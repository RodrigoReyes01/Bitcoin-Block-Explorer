import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Copy, Check } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export default function TransactionDetail() {
  const [, params] = useRoute("/tx/:txid");
  const [copied, setCopied] = useState(false);

  if (!params?.txid) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Transaction not found
          </h1>
          <Link href="/">
            <a className="text-orange-500 hover:text-orange-600">
              Back to home
            </a>
          </Link>
        </div>
      </div>
    );
  }

  const txQuery = trpc.blockchain.getTransaction.useQuery({ txid: params.txid });
  const tx = txQuery.data?.data;

  const handleCopy = (text: string | undefined) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return "—";
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "—";
    return new Intl.NumberFormat().format(num);
  };

  const formatSatoshis = (satoshis: number | null | undefined) => {
    if (satoshis === null || satoshis === undefined) return "—";
    return (satoshis / 100000000).toFixed(8) + " BTC";
  };

  if (txQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Transaction not found</h1>
          <Link href="/">
            <a className="text-orange-500 hover:text-orange-600">Back to home</a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Encabezado */}
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
            Transaction
          </h1>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="container mx-auto px-4 py-8">
        {/* ID de transacción */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Transaction ID</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
              <code className="flex-1 font-mono text-sm text-slate-900 dark:text-white break-all">
                {tx.txid}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(tx.txid)}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Detalles de la transacción */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Información general */}
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Version:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {tx.version}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Size:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatNumber(tx.size)} bytes
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">V-Size:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatNumber(tx.vsize)} vB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Weight:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatNumber(tx.weight)} WU
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Información de confirmación */}
          <Card>
            <CardHeader>
              <CardTitle>Confirmations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Confirmations:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatNumber(tx.confirmations)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Locktime:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatNumber(tx.locktime)}
                </span>
              </div>
              {tx.time && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Timestamp:</span>
                  <span className="font-mono text-sm text-slate-900 dark:text-white">
                    {formatDate(tx.time)}
                  </span>
                </div>
              )}
              {tx.blockHash && (
                <div>
                  <span className="text-slate-600 dark:text-slate-400 block mb-2">Block:</span>
                  <Link href={`/block/${tx.blockHash}`}>
                    <a className="text-orange-500 hover:text-orange-600 font-mono text-xs truncate block">
                      {tx.blockHash}
                    </a>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Entradas */}
        {tx.inputs && tx.inputs.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
              <CardDescription>{tx.inputs.length} input(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tx.inputs.map((input, idx) => (
                  <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold text-slate-900 dark:text-white">Input #{idx}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Sequence: {input.sequence}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-slate-600 dark:text-slate-400">Previous Tx:</span>
                        <Link href={`/tx/${input.prevTxid}`}>
                          <a className="text-orange-500 hover:text-orange-600 font-mono text-xs truncate block">
                            {input.prevTxid}
                          </a>
                        </Link>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Output Index:</span>
                        <span className="font-mono text-slate-900 dark:text-white">{input.prevVout}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Salidas */}
        {tx.outputs && tx.outputs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Outputs</CardTitle>
              <CardDescription>{tx.outputs.length} output(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tx.outputs.map((output, idx) => (
                  <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold text-slate-900 dark:text-white">Output #{output.vout}</span>
                      <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                        {formatSatoshis(output.value)}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Type:</span>
                        <span className="font-mono text-slate-900 dark:text-white">{output.scriptPubKeyType}</span>
                      </div>
                      {output.scriptPubKeyType && (
                        <div>
                          <span className="text-slate-600 dark:text-slate-400 block mb-1">Script Pub Key:</span>
                          <code className="bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs font-mono text-slate-900 dark:text-white break-all block">
                            {output.scriptPubKeyHex}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
