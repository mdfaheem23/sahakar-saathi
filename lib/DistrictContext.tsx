"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DISTRICTS } from "./districtData";

const DISTRICT_KEY = "pacs.district.v1";

const DistrictCtx = createContext<{
  districtId: string;
  setDistrictId: (id: string) => void;
}>({ districtId: DISTRICTS[0].id, setDistrictId: () => {} });

export function DistrictProvider({ children }: { children: React.ReactNode }) {
  const [districtId, setDistrictIdState] = useState<string>(DISTRICTS[0].id);

  useEffect(() => {
    const saved = window.localStorage.getItem(DISTRICT_KEY);
    if (saved && DISTRICTS.some((d) => d.id === saved)) {
      queueMicrotask(() => setDistrictIdState(saved));
    }
  }, []);

  const setDistrictId = (id: string) => {
    setDistrictIdState(id);
    window.localStorage.setItem(DISTRICT_KEY, id);
  };

  return (
    <DistrictCtx.Provider value={{ districtId, setDistrictId }}>{children}</DistrictCtx.Provider>
  );
}

export function useDistrict() {
  return useContext(DistrictCtx);
}
