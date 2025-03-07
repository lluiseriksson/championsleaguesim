
// Types for neural network models in database
export interface NeuralModelData {
  id?: number;
  team: string;
  role: string;
  version: number;
  weights: any;
  training_sessions?: number;
  performance_score?: number;
  last_updated?: string;
  is_shared_model?: boolean;   // Flag for shared models
  player_count?: number;       // Number of players using this model
}

// Shared network interfaces
export interface SharedNetworkParams {
  useSharedNetwork: boolean;
  playerIdentity: number;      // Normalized player ID (0-1)
  playerRole: number;          // Role encoding
  playerPosition: number;      // Position encoding (0 for GK, 0.33 for DEF, 0.66 for MID, 1 for FWD)
  teamIdentity: number;        // 0 for red, 1 for blue
}
