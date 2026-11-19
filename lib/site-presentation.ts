import defaults from '@/data/site-presentation.json';
export type Presentation = typeof defaults;
export const defaultPresentation: Presentation = defaults;
export function safeMedia(value: string) { return /^\/(?!\/)/.test(value) || /^https:\/\//i.test(value) ? value : ''; }
export function normalizePresentation(input: unknown): Presentation {
 const x = input as Presentation;
 if (!x || !x.banner || !Array.isArray(x.sponsors)) return defaults;
 return {banner:{title:String(x.banner.title??'').slice(0,120),subtitle:String(x.banner.subtitle??'').slice(0,240),desktop:safeMedia(String(x.banner.desktop??'')),mobile:safeMedia(String(x.banner.mobile??''))},sponsors:x.sponsors.slice(0,50).map(s=>({id:String(s.id),name:String(s.name).slice(0,120),logo:safeMedia(String(s.logo)),href:safeMedia(String(s.href??'')),enabled:s.enabled===true}))};
}
