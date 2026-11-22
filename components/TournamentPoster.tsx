/* eslint-disable @next/next/no-img-element -- original posters can be external and use native proportions */
import { stockPosterUrl, type PosterChoice } from "@/lib/tournament-posters";
import styles from "./TournamentPoster.module.css";

export default function TournamentPoster({ choice, title, year, thumbnail = false, compactOnMobile = false }: { choice: PosterChoice; title: string; year?: number | null; thumbnail?: boolean; compactOnMobile?: boolean }) {
  const compact = compactOnMobile ? styles.compact : "";
  if (choice.mode === "original") {
    return <div className={`${styles.poster} ${styles.original} ${thumbnail ? styles.thumbnail : ""} ${compact}`}><img src={choice.url} alt="" loading="lazy" decoding="async" /></div>;
  }
  return (
    <div className={`${styles.poster} ${choice.mode === "stock" ? styles.stock : styles.pending} ${thumbnail ? styles.thumbnail : ""} ${compact}`}>
      {choice.mode === "stock" && (
        <picture>
          <source media={compactOnMobile ? "(max-width: 767px)" : "(max-width: 639px)"} srcSet={stockPosterUrl(choice.style, "mobile")} />
          <img src={stockPosterUrl(choice.style, "desktop")} alt="" width={1600} height={900} loading="lazy" decoding="async" />
        </picture>
      )}
      {!thumbnail && <div className={styles.title} aria-hidden="true">
        {year && <span>ปี {year}</span>}
        <strong>{title}</strong>
      </div>}
    </div>
  );
}
