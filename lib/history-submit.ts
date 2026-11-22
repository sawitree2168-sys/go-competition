export function historySubmitHref(event: string, division: string) {
  return `/results/submit?${new URLSearchParams({ event, division })}`;
}
