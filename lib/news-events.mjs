/** Keep editions separate by their exact event title and date, never by poster. */
export function groupNewsEvents(stories) {
  const groups = new Map();
  const output = [];
  for (const story of stories) {
    if (story.kind !== 'results') { output.push(story); continue; }
    const key = JSON.stringify([story.event, story.date]);
    let group = groups.get(key);
    if (!group) {
      group = { ...story, id: `event:${key}`, title: 'สรุปผลการแข่งขัน', division: null,
        href: `/news/${encodeURIComponent(`event:${key}`)}`, divisions: [], people: [], complete: true };
      groups.set(key, group); output.push(group);
    }
    group.divisions.push(story);
    group.people.push(...story.people);
    group.complete = group.complete && story.complete;
    group.body = `รวมผล ${group.divisions.length} รุ่น • ${group.divisions.map(d => d.division).join(' / ')}`;
  }
  return output;
}
