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
  tools?: string[];
  monthlyTokenLimit: number;
  usage: IntelUsage;
}

export interface IntelNotificationLink {
  label: string;
  url: string;
}

export interface IntelNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  data: {
    links?: IntelNotificationLink[];
    metrics?: Record<string, unknown>;
  } | null;
  readAt: string | null;
  createdAt: string;
}
