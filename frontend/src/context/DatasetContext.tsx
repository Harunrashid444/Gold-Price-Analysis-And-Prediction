import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DatasetKey } from "../api/types";

interface DatasetContextValue {
  dataset: DatasetKey;
  setDataset: (next: DatasetKey) => void;
}

const DatasetContext = createContext<DatasetContextValue | null>(null);

const STORAGE_KEY = "gpa.dataset";

function readInitial(): DatasetKey {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "global" || stored === "india") return stored;
  } catch {
    /* ignore unavailable storage */
  }
  return "global";
}

/** The Global/India selection is shared by every analysis page. */
export function DatasetProvider({ children }: { children: ReactNode }) {
  const [dataset, setDatasetState] = useState<DatasetKey>(readInitial);

  const setDataset = useCallback((next: DatasetKey) => {
    setDatasetState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore unavailable storage */
    }
  }, []);

  const value = useMemo(() => ({ dataset, setDataset }), [dataset, setDataset]);

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDataset() {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error("useDataset must be used inside <DatasetProvider>");
  return ctx;
}
