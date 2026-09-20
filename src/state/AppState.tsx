import { demoMode, demoRequest, clearDemoSession } from "../services/demo";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentUser, signOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { AppStateContext } from "./appStateContext";
import { api, cloudConfigured, errorMessage } from "../services/api";
import type { Home } from "../../shared/domain";
const empty: Home = {
  profile: null,
  requests: [],
  medicines: [],
  prescriptions: [],
};
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [home, setHome] = useState<Home>(empty);
  const [loading, setLoading] = useState(cloudConfigured);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const run = ++generation.current;
    if (!cloudConfigured) {
      return empty;
    }
    try {
      if(demoMode) await demoRequest("auth/session"); else await getCurrentUser();
    } catch {
      if (run === generation.current) {
        setSignedIn(false);
        setHome(empty);
        setLoading(false);
      }
      return empty;
    }
    if (run !== generation.current) return empty;
    setSignedIn(true);
    try {
      const next = await api.home();
      if (run === generation.current) {
        setHome(next);
        setError("");
      }
      return next;
    } catch (e) {
      if (run === generation.current) setError(errorMessage(e));
      throw e;
    } finally {
      if (run === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh().catch(() => {});
    return Hub.listen("auth", () => {
      void refresh().catch(() => {});
    });
  }, [refresh]);
  const logout = async () => {
    if(demoMode){await demoRequest("auth/logout",{});clearDemoSession()} else await signOut();
    generation.current++;
    setHome(empty);
    setSignedIn(false);
    setError("");
  };
  return (
    <AppStateContext.Provider
      value={{ home, loading, signedIn, error, refresh, logout }}
    >
      {children}
    </AppStateContext.Provider>
  );
}
