import type { Presentation } from '@/lib/site-presentation';
export function PresentationBanner({config}: {config:Presentation['banner']}) {
 return <section className="presentation-banner"><picture><source media="(max-width:640px)" srcSet={config.mobile||config.desktop}/><img src={config.desktop} alt=""/></picture><div><p className="presentation-eyebrow">GO TOURNAMENT</p><h1>{config.title}</h1><p>{config.subtitle}</p></div></section>;
}
export function Sponsors({items}: {items:Presentation['sponsors']}) {
 const visible=items.filter(s=>s.enabled&&s.logo);if(!visible.length)return null;
 return <section className="site-sponsors" aria-labelledby="sponsors-title"><h2 id="sponsors-title">ผู้สนับสนุนและเครือข่ายหมากล้อม</h2><div className="site-sponsor-grid">{visible.map(s=><div className="site-sponsor" key={s.id}>{s.href ? <a href={s.href} target="_blank" rel="noopener noreferrer"><img src={s.logo} alt={s.name} loading="lazy"/><span>{s.name}</span></a> : <><img src={s.logo} alt={s.name} loading="lazy"/><span>{s.name}</span></>}</div>)}</div></section>;
}
