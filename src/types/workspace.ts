export type SectionId =
  | 'links'
  | 'notes'
  | 'tasks'
  | 'passwords'
  | 'oauth'
  | 'base64'
  | 'settings';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface WorkLink {
  id: string;
  title: string;
  url: string;
  category: string;
  description: string;
  pinned: boolean;
  createdAt: string;
}

export interface WorkNote {
  id: string;
  title: string;
  content: string;
  folder: string;
  pinned: boolean;
  updatedAt: string;
}

export interface WorkTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  category: string;
  createdAt: string;
}

export interface TotpAccount {
  id: string;
  issuer: string;
  label: string;
  secret: string;
  digits: number;
  period: number;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  createdAt: string;
}

export interface AppSettings {
  theme: ThemeMode;
  defaultSection: SectionId;
  compactDensity: boolean;
  clipboardAutoClearSec: number;
  confirmBeforeDelete: boolean;
}

export interface WorkspaceData {
  links: WorkLink[];
  notes: WorkNote[];
  tasks: WorkTask[];
  totpAccounts: TotpAccount[];
  settings: AppSettings;
}

export interface PasswordResult {
  password: string;
  entropyBits: number;
  strengthLabel: string;
}

export interface TotpCodeResult {
  code: string;
  nextCode: string;
  remainingSeconds: number;
  period: number;
}

export interface ParsedOtpAuthUri {
  issuer: string;
  label: string;
  secret: string;
  digits: number;
  period: number;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
}

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
  nonce: string;
}

export interface AppRuntimeInfo {
  os: string;
  arch: string;
  appVersion: string;
  storagePath: string;
  isTauri: boolean;
}
