import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getBitcoinRPC } from "../bitcoin-rpc";

const rpc = getBitcoinRPC();

export const blockchainRouter = router({
  // Blockchain Info (directly from RPC)
  getBlockchainInfo: publicProcedure.query(async () => {
    try {
      const info = await rpc.getBlockchainInfo();

      return {
        success: true,
        data: info,
      };
    } catch (error) {
      console.error("[Blockchain] Error getting blockchain info:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  // Get block by hash (RPC only)
  getBlock: publicProcedure
    .input(z.object({ hash: z.string() }))
    .query(async ({ input }) => {
      try {
        const block = await rpc.getBlock(input.hash, 2);

        return {
          success: true,
          data: block,
        };
      } catch (error) {
        console.error("[Blockchain] Error getting block:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // Get block by height (RPC only)
  getBlockByHeight: publicProcedure
    .input(z.object({ height: z.number() }))
    .query(async ({ input }) => {
      try {
        const hash = await rpc.getBlockHash(input.height);
        const block = await rpc.getBlock(hash, 2);

        return {
          success: true,
          data: block,
        };
      } catch (error) {
        console.error("[Blockchain] Error getting block by height:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // Get recent blocks (from latest heights)
  getRecentBlocks: publicProcedure
    .input(z.object({ count: z.number().default(10) }))
    .query(async ({ input }) => {
      try {
        const latestHeight = await rpc.getBlockCount();
        const maxBlocks = Math.max(1, Math.min(input.count, 50));

        const blocks = [];
        for (let i = 0; i < maxBlocks; i++) {
          const height = latestHeight - i;
          if (height < 0) break;

          const hash = await rpc.getBlockHash(height);
          const block = await rpc.getBlock(hash, 1);
          blocks.push(block);
        }

        return {
          success: true,
          data: blocks,
        };
      } catch (error) {
        console.error("[Blockchain] Error getting recent blocks:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // Get transaction (RPC only, with derived inputs/outputs)
  getTransaction: publicProcedure
    .input(z.object({ txid: z.string() }))
    .query(async ({ input }) => {
      try {
        const rpcTx = await rpc.getTransaction(input.txid, true);

        const inputs = rpcTx.vin.map((vin, index) => {
          const isCoinbase = "coinbase" in vin;

          return {
            txid: rpcTx.txid,
            // Para coinbase no hay vout, usamos el índice como fallback
            vout: vin.vout ?? index,
            // En coinbase no hay transacción previa
            prevTxid: isCoinbase ? null : (vin.txid ?? null),
            prevVout: isCoinbase ? null : (vin.vout ?? null),
            scriptSigAsm: !isCoinbase && vin.scriptSig ? vin.scriptSig.asm : null,
            scriptSigHex: !isCoinbase && vin.scriptSig ? vin.scriptSig.hex : null,
            sequence: vin.sequence ?? 0,
            createdAt: new Date(),
          };
        });

        const outputs = rpcTx.vout.map(vout => ({
          txid: rpcTx.txid,
          vout: vout.n,
          // convert BTC to satoshis for display helpers
          value: Math.round(vout.value * 1e8),
          scriptPubKeyAsm: vout.scriptPubKey.asm,
          scriptPubKeyHex: vout.scriptPubKey.hex,
          scriptPubKeyType: vout.scriptPubKey.type,
          addresses: (vout.scriptPubKey.addresses || []).join(","),
          createdAt: new Date(),
        }));

        const tx = {
          txid: rpcTx.txid,
          hash: rpcTx.hash,
          version: rpcTx.version,
          size: rpcTx.size,
          vsize: rpcTx.vsize,
          weight: rpcTx.weight,
          locktime: rpcTx.locktime,
          blockHash: rpcTx.blockhash,
          blockHeight: undefined as number | undefined,
          confirmations: rpcTx.confirmations || 0,
          time: rpcTx.time ?? null,
          blocktime: rpcTx.blocktime ?? null,
          fee: null as number | null,
          feeRate: null as unknown as number | null,
          hex: rpcTx.hex ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
          inputs,
          outputs,
        };

        return {
          success: true,
          data: tx,
        };
      } catch (error) {
        console.error("[Blockchain] Error getting transaction:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // Get recent transactions (from latest blocks)
  getRecentTransactions: publicProcedure
    .input(z.object({ count: z.number().default(20) }))
    .query(async ({ input }) => {
      try {
        const latestHeight = await rpc.getBlockCount();
        const targetCount = Math.max(1, Math.min(input.count, 100));
        const recentTxs: Array<{
          txid: string;
          hash: string;
          version: number;
          size: number;
          vsize: number;
          weight: number;
          locktime: number;
          blockHash?: string;
          blockHeight?: number;
          confirmations: number;
          time?: number;
          blocktime?: number;
        }> = [];

        for (let h = latestHeight; h >= 0 && recentTxs.length < targetCount; h--) {
          const hash = await rpc.getBlockHash(h);
          const block = await rpc.getBlock(hash, 2);

          const confirmations = block.confirmations;
          for (const tx of block.tx ?? []) {
            recentTxs.push({
              txid: tx.txid,
              hash: tx.hash,
              version: tx.version,
              size: tx.size,
              vsize: tx.vsize,
              weight: tx.weight,
              locktime: tx.locktime,
              blockHash: block.hash,
              blockHeight: block.height,
              confirmations,
              time: block.time,
              blocktime: block.time,
            });
            if (recentTxs.length >= targetCount) break;
          }
        }

        return {
          success: true,
          data: recentTxs,
        };
      } catch (error) {
        console.error("[Blockchain] Error getting recent transactions:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // Search (blocks, transactions, addresses) via RPC
  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      try {
        const query = input.query.trim();

        // Block hash
        if (/^[a-fA-F0-9]{64}$/.test(query)) {
          try {
            const block = await rpc.getBlock(query, 2);
            return { success: true, type: "block" as const, data: block };
          } catch {
            // not a block, fall through to tx
          }

          try {
            const txResult = await rpc.getTransaction(query, true);
            return { success: true, type: "transaction" as const, data: txResult };
          } catch {
            // fall through
          }
        }

        // Block height
        if (/^\d+$/.test(query)) {
          const height = parseInt(query, 10);
          try {
            const hash = await rpc.getBlockHash(height);
            const block = await rpc.getBlock(hash, 2);
            return { success: true, type: "block" as const, data: block };
          } catch {
            // ignore
          }
        }

        // Address
        if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(query)) {
          const info = await rpc.getAddressInfo(query);
          if (info) {
            return { success: true, type: "address" as const, data: info };
          }
        }

        return {
          success: false,
          error: "No results found",
        };
      } catch (error) {
        console.error("[Blockchain] Error searching:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // Get network info
  getNetworkInfo: publicProcedure.query(async () => {
    try {
      const info = await rpc.getNetworkInfo();
      return {
        success: true,
        data: info,
      };
    } catch (error) {
      console.error("[Blockchain] Error getting network info:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  // Get peer info
  getPeerInfo: publicProcedure.query(async () => {
    try {
      const peers = await rpc.getPeerInfo();
      return {
        success: true,
        data: peers,
      };
    } catch (error) {
      console.error("[Blockchain] Error getting peer info:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  // Get mining info
  getMiningInfo: publicProcedure.query(async () => {
    try {
      const info = await rpc.getMiningInfo();
      return {
        success: true,
        data: info,
      };
    } catch (error) {
      console.error("[Blockchain] Error getting mining info:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  // Get mempool info
  getMempoolInfo: publicProcedure.query(async () => {
    try {
      const info = await rpc.getMempoolInfo();
      return {
        success: true,
        data: info,
      };
    } catch (error) {
      console.error("[Blockchain] Error getting mempool info:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),
});
