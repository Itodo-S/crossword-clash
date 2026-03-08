import { RpcProvider } from 'starknet';
import manifest from '../dojo/manifest.json';

const NODE_URL = import.meta.env.VITE_PUBLIC_NODE_URL || '';
const ACTIONS_ADDRESS = (manifest as any).contracts[0].address as string;

const provider = new RpcProvider({ nodeUrl: NODE_URL });

export interface PlayerData {
  address: string;
  username: string;
  referralCode: string;
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  highestScore: number;
  wordsCompleted: number;
  tilesPlaced: number;
  turnsPlayed: number;
  referralCount: number;
  onlineWins: number;
  currentLevel: number;
}

function feltToString(felt: string): string {
  try {
    let hex = felt.startsWith('0x') ? felt.slice(2) : felt;
    if (hex === '0' || hex === '') return '';
    if (hex.length % 2 !== 0) hex = '0' + hex;
    let result = '';
    for (let i = 0; i < hex.length; i += 2) {
      const charCode = parseInt(hex.substring(i, i + 2), 16);
      if (charCode === 0) continue;
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    return '';
  }
}

function truncateAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}..${addr.slice(-4)}`;
}

export async function getPlayerCount(): Promise<number> {
  const result = await provider.callContract({
    contractAddress: ACTIONS_ADDRESS,
    entrypoint: 'get_player_count',
    calldata: [],
  });
  return Number(result[0]);
}

export async function getPlayerAddress(index: number): Promise<string> {
  const result = await provider.callContract({
    contractAddress: ACTIONS_ADDRESS,
    entrypoint: 'get_player_address',
    calldata: [index.toString()],
  });
  return result[0];
}

export async function getPlayer(address: string): Promise<PlayerData> {
  const result = await provider.callContract({
    contractAddress: ACTIONS_ADDRESS,
    entrypoint: 'get_player',
    calldata: [address],
  });
  // Returns: (username, referral_code, total_score, games_played, games_won,
  //           highest_score, words_completed, tiles_placed, turns_played,
  //           referral_count, online_wins, current_level)
  return {
    address,
    username: feltToString(result[0]) || truncateAddress(address),
    referralCode: feltToString(result[1]),
    totalScore: Number(BigInt(result[2])),
    gamesPlayed: Number(result[3]),
    gamesWon: Number(result[4]),
    highestScore: Number(result[5]),
    wordsCompleted: Number(result[6]),
    tilesPlaced: Number(result[7]),
    turnsPlayed: Number(result[8]),
    referralCount: Number(result[9]),
    onlineWins: Number(result[10]),
    currentLevel: Number(result[11]),
  };
}

export async function getAllPlayers(): Promise<PlayerData[]> {
  const count = await getPlayerCount();
  if (count === 0) return [];

  const addresses = await Promise.all(
    Array.from({ length: count }, (_, i) => getPlayerAddress(i)),
  );

  const players = await Promise.all(
    addresses.filter((a) => a !== '0x0').map((addr) => getPlayer(addr)),
  );

  return players;
}

export async function isPlayerRegistered(address: string): Promise<boolean> {
  const cacheKey = `crossword_registered_${address}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached === 'true') {
    getPlayer(address).then((p) => {
      if (p.referralCode === '') localStorage.removeItem(cacheKey);
    }).catch(() => {});
    return true;
  }
  try {
    const player = await getPlayer(address);
    const registered = player.referralCode !== '';
    if (registered) localStorage.setItem(cacheKey, 'true');
    return registered;
  } catch {
    return false;
  }
}

const COOLDOWN_SECONDS = 72000; // 20 hours

export interface DailyStreakData {
  lastClaimTime: number;
  streakCount: number;
  totalClaims: number;
  totalBonus: number;
  canClaim: boolean;
  secondsUntilClaim: number;
}

export async function getDailyStreak(player: string): Promise<DailyStreakData> {
  try {
    const result = await provider.callContract({
      contractAddress: ACTIONS_ADDRESS,
      entrypoint: 'get_daily_streak',
      calldata: [player],
    });
    // Returns: (last_claim_time: u64, streak_count: u32, total_claims: u32, total_bonus: u32)
    const lastClaimTime = Number(BigInt(result[0]));
    const streakCount = Number(result[1]);
    const totalClaims = Number(result[2]);
    const totalBonus = Number(BigInt(result[3]));

    const now = Math.floor(Date.now() / 1000);
    const elapsed = lastClaimTime === 0 ? COOLDOWN_SECONDS : now - lastClaimTime;
    const canClaim = elapsed >= COOLDOWN_SECONDS;
    const secondsUntilClaim = canClaim ? 0 : COOLDOWN_SECONDS - elapsed;

    return { lastClaimTime, streakCount, totalClaims, totalBonus, canClaim, secondsUntilClaim };
  } catch {
    return {
      lastClaimTime: 0, streakCount: 0, totalClaims: 0,
      totalBonus: 0, canClaim: true, secondsUntilClaim: 0,
    };
  }
}

export interface GameResultData {
  difficulty: number;
  playerScore: number;
  opponentScore: number;
  won: boolean;
  wordsCompleted: number;
  tilesPlaced: number;
  turnsTaken: number;
  mode: number;
  forfeited: boolean;
  timestamp: number;
}

export async function getGameResult(player: string, gameId: number): Promise<GameResultData> {
  const result = await provider.callContract({
    contractAddress: ACTIONS_ADDRESS,
    entrypoint: 'get_game_result',
    calldata: [player, gameId.toString()],
  });
  // Returns: (difficulty, player_score, opponent_score, won, words_completed,
  //           tiles_placed, turns_taken, mode, forfeited, timestamp)
  return {
    difficulty: Number(result[0]),
    playerScore: Number(result[1]),
    opponentScore: Number(result[2]),
    won: result[3] !== '0x0' && result[3] !== '0',
    wordsCompleted: Number(result[4]),
    tilesPlaced: Number(result[5]),
    turnsTaken: Number(result[6]),
    mode: Number(result[7]),
    forfeited: result[8] !== '0x0' && result[8] !== '0',
    timestamp: Number(BigInt(result[9])),
  };
}

export interface ActiveSessionData {
  gameId: number;
  difficulty: number;
  mode: number;
  playerScore: number;
  opponentScore: number;
  wordsCompleted: number;
  tilesPlaced: number;
  turnsTaken: number;
  tilesSwapped: number;
  active: boolean;
}

export async function getActiveSession(player: string): Promise<ActiveSessionData> {
  const result = await provider.callContract({
    contractAddress: ACTIONS_ADDRESS,
    entrypoint: 'get_active_session',
    calldata: [player],
  });
  // Returns: (game_id, difficulty, mode, player_score, opponent_score,
  //           words_completed, tiles_placed, turns_taken, tiles_swapped, active)
  return {
    gameId: Number(result[0]),
    difficulty: Number(result[1]),
    mode: Number(result[2]),
    playerScore: Number(result[3]),
    opponentScore: Number(result[4]),
    wordsCompleted: Number(result[5]),
    tilesPlaced: Number(result[6]),
    turnsTaken: Number(result[7]),
    tilesSwapped: Number(result[8]),
    active: result[9] !== '0x0' && result[9] !== '0',
  };
}

/** All 12 achievement IDs (u8) */
export const ALL_ACHIEVEMENT_IDS = [
  { id: 1, name: 'first_clash', label: 'First Clash' },
  { id: 2, name: 'word_smith', label: 'Word Smith' },
  { id: 3, name: 'veteran', label: 'Veteran' },
  { id: 4, name: 'perfect_round', label: 'Perfect Round' },
  { id: 5, name: 'dominator', label: 'Dominator' },
  { id: 6, name: 'word_master', label: 'Word Master' },
  { id: 7, name: 'high_scorer', label: 'High Scorer' },
  { id: 8, name: 'social_player', label: 'Social Player' },
  { id: 9, name: 'influencer', label: 'Influencer' },
  { id: 10, name: 'streak_keeper', label: 'Streak Keeper' },
  { id: 11, name: 'online_champion', label: 'Online Champion' },
  { id: 12, name: 'hard_mode_hero', label: 'Hard Mode Hero' },
];

export interface AchievementData {
  id: number;
  name: string;
  label: string;
  unlocked: boolean;
}

export async function getAchievement(
  player: string,
  achievementId: number,
): Promise<boolean> {
  try {
    const result = await provider.callContract({
      contractAddress: ACTIONS_ADDRESS,
      entrypoint: 'get_achievement',
      calldata: [player, achievementId.toString()],
    });
    return result[0] !== '0x0' && result[0] !== '0';
  } catch {
    return false;
  }
}

export async function getAllAchievements(
  player: string,
): Promise<AchievementData[]> {
  const results = await Promise.all(
    ALL_ACHIEVEMENT_IDS.map((a) => getAchievement(player, a.id)),
  );
  return ALL_ACHIEVEMENT_IDS.map((a, i) => ({ ...a, unlocked: results[i] }));
}
