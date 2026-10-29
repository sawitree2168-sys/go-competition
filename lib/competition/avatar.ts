// Stable across pages, sorting and refreshes; never inferred from gender or rank.
export function defaultAvatar(id:string){let hash=2166136261;for(const c of id)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;const i=hash%10;return `/avatars/go-v2/${i<5?'black':'white'}-${String(i%5+1).padStart(2,'0')}.webp`}
