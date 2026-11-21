/** Tipos compartidos de la capa Intel. */

export interface IntelModelInfo {
  provider: string;
  model: string;
}

export interface IntelUsage {
  month: string;
  requests: number;
  tokensIn: number;
  tokensOut: number;
  tokens: number;
}

export interface IntelConfig {
  enabled: boolean;
  configured: boolean;
  models: IntelModelInfo[];
  monthlyTokenLimit: number;
  usage: IntelUsage;
}
