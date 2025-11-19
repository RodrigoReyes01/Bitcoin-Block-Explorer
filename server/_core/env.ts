export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  bitcoinRpcHost: process.env.BITCOIN_RPC_HOST ?? "127.0.0.1",
  bitcoinRpcPort: process.env.BITCOIN_RPC_PORT ?? "8332",
  bitcoinRpcUser: process.env.BITCOIN_RPC_USER ?? "",
  bitcoinRpcPassword: process.env.BITCOIN_RPC_PASSWORD ?? "",
};
