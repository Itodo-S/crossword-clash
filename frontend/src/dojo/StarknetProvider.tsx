import { sepolia, mainnet, type Chain } from "@starknet-react/chains";
import {
  Connector,
  StarknetConfig,
  jsonRpcProvider,
  starkscan,
} from "@starknet-react/core";
import ControllerConnector from "@cartridge/connector/controller";
import { toSessionPolicies } from "@cartridge/controller";
import { constants } from "starknet";
import MANIFEST from "./manifest.json";

const WORLD_ADDRESS = MANIFEST.contracts[0].address;
const { VITE_PUBLIC_DEPLOY_TYPE } = import.meta.env;

// Session policies — which contract methods the session key can call
const policies = {
  contracts: {
    [WORLD_ADDRESS]: {
      methods: [
        { name: "Register Player", entrypoint: "register_player" },
        { name: "Apply Referral", entrypoint: "apply_referral" },
        { name: "Start Game", entrypoint: "start_game" },
        { name: "Join Game", entrypoint: "join_game" },
        { name: "Score Points", entrypoint: "score_points" },
        { name: "Place Tile", entrypoint: "place_tile" },
        { name: "Complete Word", entrypoint: "complete_word" },
        { name: "End Turn", entrypoint: "end_turn" },
        { name: "Skip Turn", entrypoint: "skip_turn" },
        { name: "Swap Tiles", entrypoint: "swap_tiles" },
        { name: "End Game", entrypoint: "end_game" },
        { name: "Forfeit Game", entrypoint: "forfeit_game" },
        { name: "Claim Daily Reward", entrypoint: "claim_daily_reward" },
      ],
    },
  },
};

const getRpcUrl = () => {
  switch (VITE_PUBLIC_DEPLOY_TYPE) {
    case "localhost":
      return "http://localhost:5050";
    case "mainnet":
      return "https://api.cartridge.gg/x/starknet/mainnet";
    case "sepolia":
      return "https://api.cartridge.gg/x/starknet/sepolia";
    default:
      return "https://api.cartridge.gg/x/starknet/sepolia";
  }
};

const getDefaultChainId = () => {
  switch (VITE_PUBLIC_DEPLOY_TYPE) {
    case "localhost":
      return "0x4b4154414e41"; // KATANA
    case "mainnet":
      return constants.StarknetChainId.SN_MAIN;
    case "sepolia":
      return constants.StarknetChainId.SN_SEPOLIA;
    default:
      return constants.StarknetChainId.SN_SEPOLIA;
  }
};

const sessions = toSessionPolicies(policies);

const connector = new ControllerConnector({
  policies: sessions,
  chains: [{ rpcUrl: getRpcUrl() }],
  defaultChainId: getDefaultChainId(),
}) as never as Connector;

const provider = jsonRpcProvider({
  rpc: (chain: Chain) => {
    switch (chain) {
      case mainnet:
        return { nodeUrl: "https://api.cartridge.gg/x/starknet/mainnet" };
      case sepolia:
      default:
        return { nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia" };
    }
  },
});

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  return (
    <StarknetConfig
      autoConnect
      chains={[sepolia, mainnet]}
      provider={provider}
      connectors={[connector]}
      explorer={starkscan}
    >
      {children}
    </StarknetConfig>
  );
}
