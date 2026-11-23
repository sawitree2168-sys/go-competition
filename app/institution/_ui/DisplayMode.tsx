"use client";
import { useEffect, useState } from "react";

export type DisplayMode = "cards" | "table";

export function useInstitutionDisplayMode(section: string): [DisplayMode, (value:DisplayMode)=>void] {
  const [mode,setMode] = useState<DisplayMode>("cards");
  useEffect(()=>{
    try {
      const saved = window.localStorage.getItem("gt-institution-display-"+section);
      if (window.matchMedia("(max-width: 767px)").matches) setMode("cards");
      else if(saved === "cards" || saved === "table") setMode(saved);
      else setMode(window.matchMedia("(min-width: 768px)").matches ? "table" : "cards");
    } catch {
      setMode(window.matchMedia("(min-width: 768px)").matches ? "table" : "cards");
    }
  },[section]);
  const change = (value:DisplayMode) => {
    const actual = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "cards" : value;
    setMode(actual);
    try { window.localStorage.setItem("gt-institution-display-"+section,actual); } catch {}
  };
  return [mode,change];
}

export function DisplayModeToggle({mode,onChange}:{mode:DisplayMode;onChange:(value:DisplayMode)=>void}) {
  return <div role="group" aria-label="รูปแบบการแสดงข้อมูล" className="inline-flex shrink-0 gap-1 rounded-xl border-2 border-[#b8d0ed] bg-white p-1 shadow-sm">
    <button type="button" aria-pressed={mode==="table"} onClick={()=>onChange("table")} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition ${mode==="table"?"bg-[#0b60c3] text-white":"text-[#235080] hover:bg-[#e8f2ff]"}`}>
      <span aria-hidden="true">☰</span> ตาราง
    </button>
    <button type="button" aria-pressed={mode==="cards"} onClick={()=>onChange("cards")} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition ${mode==="cards"?"bg-[#0b60c3] text-white":"text-[#235080] hover:bg-[#e8f2ff]"}`}>
      <span aria-hidden="true">▦</span> การ์ด
    </button>
  </div>;
}
