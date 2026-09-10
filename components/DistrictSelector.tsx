"use client";

import { DISTRICTS } from "@/lib/districtData";

export default function DistrictSelector({
  districtId,
  onChange,
}: {
  districtId: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      value={districtId}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium outline-none focus:border-forest-600"
    >
      {DISTRICTS.map((d) => (
        <option key={d.id} value={d.id}>
          {d.district}, {d.state} — {d.crop}
        </option>
      ))}
    </select>
  );
}
