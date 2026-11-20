"use client";
import FullscreenReport from "./FullscreenReport";

export type RoundResultRow = { id: string; board: number | null; black: string; white: string; result: string };
export default function RoundResultsReport({ title, filename, rows }: {title: string; filename: string; rows: RoundResultRow[]}) {
  return <FullscreenReport title={title} filename={filename} inline={false}>
    <table className="w-full min-w-[960px] border-collapse text-left text-base">
      <thead className="bg-[#0c3d87] text-white"><tr>
        <th className="border border-[#c5d6ed] px-4 py-3">โต๊ะ</th>
        <th className="border border-[#c5d6ed] px-4 py-3">ผู้เล่นหมากดำ</th>
        <th className="border border-[#c5d6ed] px-4 py-3">ผู้เล่นหมากขาว</th>
        <th className="border border-[#c5d6ed] px-4 py-3">ผลการแข่งขัน</th>
      </tr></thead>
      <tbody>{rows.map((row,i) => <tr key={row.id} className={i%2?"bg-[#edf4ff]":"bg-white"}>
        <td className="border border-[#c5d6ed] px-4 py-3 font-bold">{row.board ?? "—"}</td>
        <td className="border border-[#c5d6ed] px-4 py-3"><span className="mr-2 inline-block h-4 w-4 rounded-full bg-black align-middle" />{row.black}</td>
        <td className="border border-[#c5d6ed] px-4 py-3"><span className="mr-2 inline-block h-4 w-4 rounded-full border border-[#abb4c1] bg-white align-middle" />{row.white}</td>
        <td className="border border-[#c5d6ed] px-4 py-3 font-bold">{row.result}</td>
      </tr>)}</tbody>
    </table>
  </FullscreenReport>;
}
