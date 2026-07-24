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
import { getStoredToken, setStoredToken, clearStoredToken, getCurrentUser, type User } from "@/services/auth";

export type MusicSource = "netease" | "bilibili";
export interface AccountProfile {
  displayName: string;
  avatarUrl: string;
  backendUrl: string;
  musicSources: MusicSource[];
  onboardingCompleted: boolean;
}
interface AccountContextValue {
  profile: AccountProfile | null;
  serverUser: User | null;
  hydrated: boolean;
  saveProfile: (profile: AccountProfile) => Promise<void>;
  updateProfile: (patch: Partial<AccountProfile>) => Promise<void>;
  saveSourceCredential: (source: MusicSource, credential: string) => Promise<void>;
  getSourceCredential: (source: MusicSource) => Promise<string | null>;
  hasSource: (source: MusicSource) => boolean;
  refreshServerUser: () => Promise<void>;
  logout: () => Promise<void>;
}
const STORAGE_KEY = "hyacine.account-profile";
const CACHED_USER_KEY = "hyacine.cached-server-user";
const credentialKey = (source: MusicSource): string => `hyacine.music-source.${source}`;
const AccountContext = createContext<AccountContextValue | null>(null);
function readProfile(value: Partial<AccountProfile>): AccountProfile | null {
  if (value.onboardingCompleted === true) {
    return {
      displayName: value.displayName?.trim() ?? "",
      avatarUrl: value.avatarUrl?.trim() ?? "",
      backendUrl: value.backendUrl ?? "",
      musicSources: value.musicSources ?? [],
      onboardingCompleted: true,
    };
  }
  if (!value.backendUrl?.trim()) return null;
  return {
    displayName: value.displayName?.trim() ?? "",
    avatarUrl: value.avatarUrl?.trim() ?? "",
    backendUrl: value.backendUrl,
    musicSources: value.musicSources ?? [],
    onboardingCompleted: false,
  };
}
function profilesEqual(a: AccountProfile | null, b: AccountProfile | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.displayName === b.displayName &&
    a.avatarUrl === b.avatarUrl &&
    a.backendUrl === b.backendUrl &&
    arraysEqual(a.musicSources, b.musicSources) &&
    a.onboardingCompleted === b.onboardingCompleted
  );
}
function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
export function AccountProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [serverUser, setServerUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const profileRef = useRef<AccountProfile | null>(null);
  useEffect(() => {
    void (async () => {
      const [raw, cachedUser] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEY),
        SecureStore.getItemAsync(CACHED_USER_KEY),
      ]);
      if (raw) {
        try {
          const parsed = readProfile(JSON.parse(raw) as Partial<AccountProfile>);
          profileRef.current = parsed;
          setProfile(parsed);
        } catch {
          // ignore corrupt profile payload
        }
      }
      if (cachedUser) {
        try {
          setServerUser(JSON.parse(cachedUser) as User);
        } catch {
          // ignore corrupt cached user
        }
      }
      setHydrated(true);
    })();
  }, []);

  const refreshServerUser = useCallback(async () => {
    if (!profile?.backendUrl) return;
    const token = await getStoredToken();
    if (!token) {
      setServerUser(null);
      return;
    }
    try {
      const user = await getCurrentUser(profile.backendUrl, token);
      setServerUser(user);
      await SecureStore.setItemAsync(CACHED_USER_KEY, JSON.stringify(user));
    } catch {
      const cached = await SecureStore.getItemAsync(CACHED_USER_KEY);
      if (cached) {
        try {
          setServerUser(JSON.parse(cached) as User);
        } catch {
          setServerUser(null);
        }
      } else {
        setServerUser(null);
      }
    }
  }, [profile?.backendUrl]);

  useEffect(() => {
    if (hydrated && profile?.backendUrl) {
      void refreshServerUser();
    }
  }, [hydrated, profile?.backendUrl, refreshServerUser]);

  const logout = useCallback(async () => {
    await clearStoredToken();
    await SecureStore.deleteItemAsync(CACHED_USER_KEY);
    setServerUser(null);
  }, []);
  const saveProfile = useCallback(async (next: AccountProfile) => {
    const normalized: AccountProfile = {
      displayName: next.displayName.trim(),
      avatarUrl: next.avatarUrl.trim(),
      backendUrl: normalizeBackendUrl(next.backendUrl),
      musicSources: next.musicSources ?? [],
      onboardingCompleted: next.onboardingCompleted,
    };
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(normalized));
    profileRef.current = normalized;
    setProfile(normalized);
  }, []);
  const updateProfile = useCallback(async (patch: Partial<AccountProfile>) => {
    setProfile((current) => {
      if (!current) {
        const backendUrl = normalizeBackendUrl(patch.backendUrl ?? "");
        const next: AccountProfile = {
          displayName: (patch.displayName ?? "").trim(),
          avatarUrl: (patch.avatarUrl ?? "").trim(),
          backendUrl,
          musicSources: patch.musicSources ?? [],
          onboardingCompleted: patch.onboardingCompleted ?? false,
        };
        profileRef.current = next;
        void SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
        return next;
      }
      const normalized: AccountProfile = {
        displayName: (patch.displayName ?? current.displayName).trim(),
        avatarUrl: (patch.avatarUrl ?? current.avatarUrl).trim(),
        backendUrl: normalizeBackendUrl(patch.backendUrl ?? current.backendUrl),
        musicSources: patch.musicSources === undefined ? current.musicSources : patch.musicSources,
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
      const sources = current.musicSources.includes(source)
        ? current.musicSources
        : [...current.musicSources, source];
      if (arraysEqual(current.musicSources, sources)) return current;
      const next: AccountProfile = { ...current, musicSources: sources };
      profileRef.current = next;
      void SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const getSourceCredential = useCallback(
    (source: MusicSource) => SecureStore.getItemAsync(credentialKey(source)),
    [],
  );
  const hasSource = useCallback(
    (source: MusicSource) => profile?.musicSources.includes(source) ?? false,
    [profile],
  );
  // Stable context: only update when profile reference actually changes.
  const valueRef = useRef<AccountContextValue | null>(null);
  if (!valueRef.current || valueRef.current.profile !== profile || valueRef.current.hydrated !== hydrated || valueRef.current.serverUser !== serverUser) {
    valueRef.current = {
      profile,
      serverUser,
      hydrated,
      saveProfile,
      updateProfile,
      saveSourceCredential,
      getSourceCredential,
      hasSource,
      refreshServerUser,
      logout,
    };
  }
  return <AccountContext.Provider value={valueRef.current}>{children}</AccountContext.Provider>;
}
export function useAccount(): AccountContextValue {
  const context = useContext(AccountContext);
  if (!context) throw new Error("useAccount must be used inside AccountProvider");
  return context;
}