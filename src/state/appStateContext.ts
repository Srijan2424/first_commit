import { createContext } from "react";
import type { Home } from "../../shared/domain";
export type AppStateValue = {
  home: Home;
  loading: boolean;
  signedIn: boolean;
  error: string;
  refresh: () => Promise<Home>;
  logout: () => Promise<void>;
};
export const AppStateContext = createContext<AppStateValue | null>(null);
