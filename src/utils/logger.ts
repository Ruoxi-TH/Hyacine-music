import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  ts: string;
  level: LogLevel;
  scope: string;
  message: string;
  detail?: string;
}

const TAG = "Hyacine";
const MAX_ENTRIES = 500;
const LOG_FILE = "hyacine-app.log";
const SENSITIVE_KEY =
  /cookie|token|authorization|music_u|csrf|password|secret|credential|MUSIC_U/i;

const entries: LogEntry[] = [];
let writeChain: Promise<void> = Promise.resolve();
let hydrated = false;
let globalHandlersInstalled = false;

function nowIso(): string {
  const d = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function logFileUri(): string | null {
  if (!FileSystem.documentDirectory) return null;
  return `${FileSystem.documentDirectory}${LOG_FILE}`;
}

function redactString(input: string): string {
  let text = input;
  text = text.replace(
    /(cookie|authorization|token|MUSIC_U|csrf_token)\s*[:=]\s*["']?[^"',;\s]+/gi,
    "$1=[REDACTED]",
  );
  text = text.replace(/MUSIC_U=[^;\s]+/gi, "MUSIC_U=[REDACTED]");
  text = text.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]");
  if (text.length > 1200) {
    return `${text.slice(0, 1200)}…(+${text.length - 1200})`;
  }
  return text;
}

function sanitizeValue(value: unknown, keyHint = ""): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (SENSITIVE_KEY.test(keyHint)) {
      return `[REDACTED len=${value.length}]`;
    }
    return redactString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack ? redactString(value.stack.split("\n").slice(0, 6).join("\n")) : undefined,
    };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item, index) => sanitizeValue(item, `${keyHint}[${index}]`));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key)) {
        const len = typeof item === "string" ? item.length : undefined;
        out[key] = len == null ? "[REDACTED]" : `[REDACTED len=${len}]`;
      } else {
        out[key] = sanitizeValue(item, key);
      }
    }
    return out;
  }
  return String(value);
}

function formatDetail(detail?: unknown): string | undefined {
  if (detail === undefined) return undefined;
  try {
    const sanitized = sanitizeValue(detail);
    if (typeof sanitized === "string") return sanitized;
    return JSON.stringify(sanitized);
  } catch {
    return "[unserializable]";
  }
}

function formatLine(entry: LogEntry): string {
  if (entry.scope === "persist") {
    // Historical file lines already contain full formatting.
    return entry.message.startsWith(entry.ts) ? entry.message : `${entry.ts} ${entry.message}`;
  }
  const base = `${entry.ts} [${entry.level.toUpperCase()}][${entry.scope}] ${entry.message}`;
  return entry.detail ? `${base} | ${entry.detail}` : base;
}

async function ensureHydrated(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const uri = logFileUri();
  if (!uri) return;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return;
    const raw = await FileSystem.readAsStringAsync(uri);
    const lines = raw.split("\n").filter(Boolean).slice(-MAX_ENTRIES);
    for (const line of lines) {
      entries.push({
        ts: line.slice(0, 23) || nowIso(),
        level: "info",
        scope: "persist",
        message: line,
      });
    }
    if (entries.length > MAX_ENTRIES) {
      entries.splice(0, entries.length - MAX_ENTRIES);
    }
  } catch {
    // ignore hydrate failures
  }
}

function enqueueWrite(line: string): void {
  const uri = logFileUri();
  if (!uri) return;
  writeChain = writeChain
    .then(async () => {
      await ensureHydrated();
      const existing = await FileSystem.getInfoAsync(uri);
      if (existing.exists) {
        const current = await FileSystem.readAsStringAsync(uri);
        const merged = `${current}${current.endsWith("\n") || !current ? "" : "\n"}${line}\n`;
        const trimmed = merged.split("\n").filter(Boolean).slice(-MAX_ENTRIES).join("\n") + "\n";
        await FileSystem.writeAsStringAsync(uri, trimmed, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } else {
        await FileSystem.writeAsStringAsync(uri, `${line}\n`, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }
    })
    .catch(() => undefined);
}

function push(level: LogLevel, scope: string, message: string, detail?: unknown): void {
  const entry: LogEntry = {
    ts: nowIso(),
    level,
    scope,
    message: redactString(message),
    detail: formatDetail(detail),
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }

  const line = formatLine(entry);
  if (level === "error") console.error(`[${TAG}] ${line}`);
  else if (level === "warn") console.warn(`[${TAG}] ${line}`);
  else console.log(`[${TAG}] ${line}`);

  enqueueWrite(line);
}

export function installGlobalErrorHandlers(): void {
  if (globalHandlersInstalled) return;
  globalHandlersInstalled = true;

  const ErrorUtilsRef = (
    globalThis as {
      ErrorUtils?: {
        getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
        setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
      };
    }
  ).ErrorUtils;

  if (ErrorUtilsRef?.getGlobalHandler && ErrorUtilsRef?.setGlobalHandler) {
    const previous = ErrorUtilsRef.getGlobalHandler();
    ErrorUtilsRef.setGlobalHandler((error, isFatal) => {
      push("error", "global", isFatal ? "fatal JS error" : "uncaught JS error", {
        isFatal: Boolean(isFatal),
        error,
      });
      previous?.(error, isFatal);
    });
  }

  const g = globalThis as {
    onunhandledrejection?: ((event: { reason?: unknown }) => void) | null;
  };
  const previousRejection = g.onunhandledrejection;
  g.onunhandledrejection = (event) => {
    push("error", "global", "unhandled promise rejection", event?.reason);
    if (typeof previousRejection === "function") previousRejection(event);
  };
}

export const appLog = {
  info(scope: string, message: string, detail?: unknown): void {
    push("info", scope, message, detail);
  },
  warn(scope: string, message: string, detail?: unknown): void {
    push("warn", scope, message, detail);
  },
  error(scope: string, message: string, detail?: unknown): void {
    push("error", scope, message, detail);
  },
};

export async function getLogText(): Promise<string> {
  await ensureHydrated();
  if (entries.length === 0) return "(empty log)";
  return entries.map(formatLine).join("\n");
}

export async function getRecentLogs(limit = 200): Promise<LogEntry[]> {
  await ensureHydrated();
  return entries.slice(-Math.max(1, limit));
}

export async function clearLogs(): Promise<void> {
  entries.splice(0, entries.length);
  const uri = logFileUri();
  if (!uri) return;
  try {
    await FileSystem.writeAsStringAsync(uri, "", {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    // ignore clear failures
  }
}

export function summarizeUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    if (/^https?:\/\//i.test(url)) {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    }
    return redactString(url.split("?")[0] ?? url);
  } catch {
    return redactString(url.split("?")[0] ?? url);
  }
}

export function cookieMeta(cookie?: string | null): { present: boolean; length: number } {
  const value = cookie?.trim() ?? "";
  return { present: value.length > 0, length: value.length };
}

export function bootMeta(): Record<string, unknown> {
  return {
    platform: Platform.OS,
    version: Platform.Version,
  };
}

export function getLogFileUri(): string | null {
  return logFileUri();
}