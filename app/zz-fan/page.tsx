import GoFan from "../go-fan/GoFan";
import data from "./data.json";
import type { FanData } from "@/lib/go-fan-data";
import "@/app/competition/competition.css";
import "@fontsource/prompt/700.css";
import "../go-fan/go-fan.css";
export default function P(){return <GoFan initial={data as unknown as FanData}/>;}
