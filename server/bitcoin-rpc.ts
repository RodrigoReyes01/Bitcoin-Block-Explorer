import { ENV } from "./_core/env";

interface RPCRequest {
  jsonrpc: string;
  id: string;
  method: string;
  params: unknown[];
}

interface RPCResponse<T> {
  jsonrpc: string;
  id: string;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

export class BitcoinRPCClient {
  private baseUrl: string;
  private auth: string;

  constructor() {
    const host = ENV.bitcoinRpcHost || "127.0.0.1";
    const port = ENV.bitcoinRpcPort || "8332";
    const user = ENV.bitcoinRpcUser || "";
    const password = ENV.bitcoinRpcPassword || "";

    this.baseUrl = `http://${host}:${port}/`;
    this.auth = Buffer.from(`${user}:${password}`).toString("base64");
  }

  private async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const request: RPCRequest = {
      jsonrpc: "1.0",
      id: `${method}-${Date.now()}`,
      method,
      params,
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${this.auth}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: RPCResponse<T> = await response.json();

      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message}`);
      }

      return data.result as T;
    } catch (error) {
      console.error(`[Bitcoin RPC] Error calling ${method}:`, error);
      throw error;
    }
  }

  // Blockchain Info
  async getBlockchainInfo() {
    return this.call<{
      chain: string;
      blocks: number;
      headers: number;
      bestblockhash: string;
      difficulty: number;
      mediantime: number;
      verificationprogress: number;
      initialblockdownload: boolean;
      chainwork: string;
      size_on_disk: number;
      pruned: boolean;
    }>("getblockchaininfo");
  }

  // Block methods
  async getBlockCount(): Promise<number> {
    return this.call<number>("getblockcount");
  }

  async getBlockHash(height: number): Promise<string> {
    return this.call<string>("getblockhash", [height]);
  }

  async getBlock(
    hash: string,
    verbosity: number = 2
  ): Promise<{
    hash: string;
    confirmations: number;
    height: number;
    version: number;
    versionHex: string;
    merkleroot: string;
    time: number;
    mediantime: number;
    nonce: number;
    bits: string;
    difficulty: number;
    chainwork: string;
    nTx: number;
    previousblockhash?: string;
    nextblockhash?: string;
    strippedsize: number;
    size: number;
    weight: number;
    tx?: Array<{
      txid: string;
      hash: string;
      version: number;
      size: number;
      vsize: number;
      weight: number;
      locktime: number;
      vin: Array<{
        txid: string;
        vout: number;
        scriptSig: {
          asm: string;
          hex: string;
        };
        sequence: number;
      }>;
      vout: Array<{
        value: number;
        n: number;
        scriptPubKey: {
          asm: string;
          hex: string;
          reqSigs: number;
          type: string;
          addresses: string[];
        };
      }>;
    }>;
  }> {
    return this.call("getblock", [hash, verbosity]);
  }

  // Transaction methods
  async getTransaction(txid: string, verbose: boolean = true) {
    return this.call<{
      txid: string;
      hash: string;
      version: number;
      size: number;
      vsize: number;
      weight: number;
      locktime: number;
      vin: Array<{
        txid: string;
        vout: number;
        scriptSig: {
          asm: string;
          hex: string;
        };
        sequence: number;
        txinwitness?: string[];
      }>;
      vout: Array<{
        value: number;
        n: number;
        scriptPubKey: {
          asm: string;
          hex: string;
          reqSigs?: number;
          type: string;
          addresses?: string[];
        };
      }>;
      hex?: string;
      blockhash?: string;
      confirmations?: number;
      time?: number;
      blocktime?: number;
    }>("getrawtransaction", [txid, verbose]);
  }

  async getTransactionConfirmations(
    txid: string
  ): Promise<{ confirmations: number; blockhash: string } | null> {
    try {
      const tx = await this.call<{
        confirmations?: number;
        blockhash?: string;
      }>("getrawtransaction", [txid, true]);
      return {
        confirmations: tx.confirmations || 0,
        blockhash: tx.blockhash || "",
      };
    } catch {
      return null;
    }
  }

  // Address methods
  async getAddressInfo(address: string) {
    try {
      return await this.call<{
        address: string;
        scriptPubKey: string;
        ismine: boolean;
        iswatchonly: boolean;
        isscript: boolean;
        pubkey?: string;
        iscompressed?: boolean;
        account?: string;
        timestamp?: number;
        hdkeypath?: string;
        hdseedid?: string;
        labels: Array<{
          name: string;
          purpose: string;
        }>;
      }>("getaddressinfo", [address]);
    } catch {
      return null;
    }
  }

  // Network methods
  async getNetworkInfo() {
    return this.call<{
      version: number;
      subversion: string;
      protocolversion: number;
      localservices: string;
      localservicesnames: string[];
      timeoffset: number;
      networkactive: boolean;
      connections: number;
      connections_in: number;
      connections_out: number;
      networks: Array<{
        name: string;
        limited: boolean;
        reachable: boolean;
        proxy: string;
        proxy_randomize_credentials: boolean;
      }>;
      relayfee: number;
      incrementalfee: number;
      localaddresses: Array<{
        address: string;
        port: number;
        score: number;
      }>;
      warnings: string;
    }>("getnetworkinfo");
  }

  async getPeerInfo() {
    return this.call<
      Array<{
        id: number;
        addr: string;
        addrbind: string;
        addrlocal: string;
        services: string;
        servicesnames: string[];
        relaytxes: boolean;
        lastsend: number;
        lastrecv: number;
        bytessent: number;
        bytesrecv: number;
        conntime: number;
        timeoffset: number;
        pingtime: number;
        minping: number;
        version: number;
        subver: string;
        inbound: boolean;
        addnode: boolean;
        startingheight: number;
        besthash: string;
        bestheight: number;
        synced_headers: number;
        synced_blocks: number;
        inflight: number[];
        whitelisted: boolean;
        permissions: string[];
        minfeefilter: number;
        bytessent_per_msg: Record<string, number>;
        bytesrecv_per_msg: Record<string, number>;
      }>
    >("getpeerinfo");
  }

  // Mining info
  async getMiningInfo() {
    return this.call<{
      blocks: number;
      currentblocksize: number;
      currentblocktx: number;
      difficulty: number;
      errors: string;
      generate: boolean;
      genproclimit: number;
      hashespersec: number;
      longpollinterval: number;
      networkhasps: number;
      pooledtx: number;
      testnet: boolean;
      chain: string;
    }>("getmininginfo");
  }

  // Mempool methods
  async getMempoolInfo() {
    return this.call<{
      size: number;
      bytes: number;
      usage: number;
      maxmempool: number;
      mempoolminfee: number;
      minrelaytxfee: number;
      incrementalrelayfee: number;
      unbroadcastcount: number;
      fullrbf: boolean;
    }>("getmempoolinfo");
  }

  async getMempoolStats() {
    try {
      return await this.call<{
        loaded: boolean;
        size: number;
        bytes: number;
        usage: number;
        total_fee: number;
        total_fee_rate: number;
        min_fee_rate: number;
        max_fee_rate: number;
      }>("getmempoolstats");
    } catch {
      return null;
    }
  }
}

// Singleton instance
let rpcClient: BitcoinRPCClient | null = null;

export function getBitcoinRPC(): BitcoinRPCClient {
  if (!rpcClient) {
    rpcClient = new BitcoinRPCClient();
  }
  return rpcClient;
}
