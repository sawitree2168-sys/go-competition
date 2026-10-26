/** No fabricated athlete records. Caller must supply a secured server search function. */
export async function searchAthleteByName(name, fetchMatches) {
  const search = String(name ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
  if (search.length < 2) return { status: 'invalid', items: [], message: 'กรุณาระบุชื่ออย่างน้อย 2 ตัวอักษร' };
  try {
    const records = await fetchMatches(search);
    if (!Array.isArray(records)) throw new Error('Bad athlete response');
    const items = records.filter((x) => x && typeof x.athleteId === 'string' && x.athleteId.trim() && typeof x.displayName === 'string' && x.displayName.trim()).slice(0, 20);
    return items.length ? { status: 'found', items } : { status: 'not_found', items: [] };
  } catch {
    return { status: 'error', items: [], message: 'ไม่สามารถตรวจสอบรายชื่อได้ กรุณาลองใหม่ ไม่ควรสมัครใหม่จนกว่าจะค้นหาสำเร็จ' };
  }
}