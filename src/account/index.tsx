import * as SecureStore from "expo-secure-store";
import { normalizeBackendUrl } from "@/utils/apiBase";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

export type MusicSource = "netease" | "bilibili";

export interface AccountProfile {
  displayName: string;
  avatarUrl: string;
  backendUrl: string;
  musicSource: MusicSource | null;
  onboardingCompleted: boolean;
}

interface AccountContextValue {
  profile: AccountProfile | null;
  hydrated: boolean;
  saveProfile: (profile: AccountProfile) => Promise<void>;
  updateProfile: (patch: Partial<AccountProfile>) => Promise<void>;
  saveSourceCredential: (source: MusicSource, credential: string) => Promise<void>;
  getSourceCredential: (source: MusicSource) => Promise<string | null>;
}

const STORAGE_KEY = "hyacine.account-profile";
const credentialKey = (source: MusicSource): string => `hyacine.music-source.${source}`;
const AccountContext = createContext<AccountContextValue | null>(null);

function readProfile(value: Partial<AccountProfile>): AccountProfile | null {
  if (!value.displayName?.trim() || !value.backendUrl?.trim()) return null;
  return {
    displayName: value.displayName,
    avatarUrl: value.avatarUrl?.trim() ?? "",
    backendUrl: value.backendUrl,
    musicSource: value.musicSource ?? null,
    onboardingCompleted: value.onboardingCompleted === true,
  };
}

function profilesEqual(a: AccountProfile | null, b: AccountProfile | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.displayName === b.displayName &&
    a.avatarUrl === b.avatarUrl &&
    a.backendUrl === b.backendUrl &&
    a.musicSource === b.musicSource &&
    a.onboardingCompleted === b.onboardingCompleted
  );
}

export function AccountProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const profileRef = useRef<AccountProfile | null>(null);

  useEffect(() => {
    void SecureStore.getItemAsync(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = readProfile(JSON.parse(raw) as Partial<AccountProfile>);
          profileRef.current = parsed;
          setProfile(parsed);
        } catch {
          // ignore corrupt profile payload
        }
      }
      setHydrated(true);
    });
  }, []);

  const saveProfile = useCallback(async (next: AccountProfile) => {
    const normalized: AccountProfile = {
      displayName: next.displayName.trim(),
      avatarUrl: next.avatarUrl.trim(),
      backendUrl: normalizeBackendUrl(next.backendUrl),
      musicSource: next.musicSource,
      onboardingCompleted: next.onboardingCompleted,
    };
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(normalized));
    profileRef.current = normalized;
    setProfile(normalized);
  }, []);

  const updateProfile = useCallback(async (patch: Partial<AccountProfile>) => {
    setProfile((current) => {
      if (!current) return current;
      const normalized: AccountProfile = {
        displayName: (patch.displayName ?? current.displayName).trim(),
        avatarUrl: (patch.avatarUrl ?? current.avatarUrl).trim(),
        backendUrl: normalizeBackendUrl(patch.backendUrl ?? current.backendUrl),
        musicSource: patch.musicSource === undefined ? current.musicSource : patch.musicSource,
        onboardingCompleted: patch.onboardingCompleted ?? current.onboardingCompleted,
      };
      if (profilesEqual(current, normalized)) return current;
      profileRef.current = normalized;
      void SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    });
  }, []);

  const saveSourceCredential = useCallback(async (source: MusicSource, credential: string) => {
    await SecureStore.setItemAsync(credentialKey(source), credential);
    setProfile((current) => {
      if (!current) return current;
      if (current.musicSource === source) return current;
      const next: AccountProfile = { ...current, musicSource: source };
      profileRef.current = next;
      void SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getSourceCredential = useCallback(
    (source: MusicSource) => SecureStore.getItemAsync(credentialKey(source)),
    [],
  );

  // Stable context: only update when profile reference actually changes.
  const valueRef = useRef<AccountContextValue | null>(null);
  if (!valueRef.current || valueRef.current.profile !== profile || valueRef.current.hydrated !== hydrated) {
    valueRef.current = {
      profile,
      hydrated,
      saveProfile,
      updateProfile,
      saveSourceCredential,
      getSourceCredential,
    };
  }

  return <AccountContext.Provider value={valueRef.current}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const context = useContext(AccountContext);
  if (!context) throw new Error("useAccount must be used inside AccountProvider");
  return context;
}