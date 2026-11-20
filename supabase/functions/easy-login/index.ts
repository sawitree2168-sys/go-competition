// @ts-nocheck -- deployed to the Supabase Edge (Deno) runtime, not the Next.js build.
// "easy-login" (verify_jwt = false) — one sign-in box for every role (20 Nov 2026).
//
// identifier = name / institution name / team name / GO ID / dan number / username;  password = own or role default.
// Default passwords live only in the database (gt_private.easy_defaults_v1 / easy_reserved_v1), never in this repo.
//
// actions
//   login    { identifier, password }                       → { session, kind, using_default } | { need_create, kind, name, academies? }
//   create   { identifier, password, kind, academy_id? }     → { session, kind, using_default }   (teacher / freelance / referee self-create)
//   forgot   { identifier, phone, birth_date, new_password } → { session }                        (parent proves phone + birth date)
//   profile  (signed in) { new_password?, phone?, birth_date?, keep_default? } → { ok }
//   reset    (signed in) { target_user }                     → { ok, password_kind }              (teacher / institution / owner resets someone)
import { createClient } from 'npm:@supabase/supabase-js@2.105.1';

const base = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(base, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = () => createClient(base, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...cors } });
const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((x) => x.toString(16).padStart(2, '0')).join('');
const rpc = async (fn: string, args: Record<string, unknown>) => { const { data, error } = await admin.rpc(fn, args); if (error) throw error; return data; };
const ROLE = { owner: 'แอดมินระบบ', pairing: 'แอดมินจับคู่', organizer: 'ผู้จัดงาน', institution: 'เจ้าของสถาบัน', teacher: 'ครูในสถาบัน', freelance: 'ครูอิสระ', athlete: 'นักกีฬา', referee: 'กรรมการ' };

async function signIn(uid: string, password: string) {
  const { data: { user } } = await admin.auth.admin.getUserById(uid);
  if (!user?.email) return null;
  const { data, error } = await anon().auth.signInWithPassword({ email: user.email, password });
  if (error || !data.session) return null;
  return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
}

async function sessionReply(uid: string, session, password: string) {
  const acc = await rpc('gt_easy_account_v1', { p_user: uid });
  let usingDefault = false;
  if (acc) {
    const def = await rpc('gt_easy_default_password_v1', { p_kind: acc.kind, p_key: acc.login_key });
    usingDefault = !!def && def === password;
    if (usingDefault !== acc.using_default) await rpc('gt_easy_mark_v1', { p_user: uid, p_using_default: usingDefault, p_phone: null, p_birth: null });
  }
  return respond({ session, kind: acc?.kind ?? null, role_label: acc ? ROLE[acc.kind] : null, name: acc?.name ?? null, using_default: usingDefault, has_recovery: !!acc?.has_recovery });
}

async function newUser(password: string, name: string, kind: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email: crypto.randomUUID() + '@easy.go-tournament.invalid', email_confirm: true, password,
    user_metadata: { display_name: name, member_role: kind },
  });
  if (error || !data.user) throw Error('CREATE_USER: ' + (error?.message ?? ''));
  return data.user.id;
}

/** Create an account of `kind`, link it, sign it in. */
async function createAccount(kind: string, name: string, key: string | null, password: string, academy: string | null, organizer: string | null) {
  const uid = await newUser(password, name, kind);
  const res = await rpc('gt_easy_register_v1', { p_user: uid, p_kind: kind, p_name: name, p_key: key, p_academy: academy, p_organizer: organizer }).catch(async (e) => { await admin.auth.admin.deleteUser(uid); throw e; });
  if (res !== 'OK') { await admin.auth.admin.deleteUser(uid); return res; }
  return uid;
}

/** Athlete candidates for what was typed (GO ID / dan number / full name). */
async function athletes(identifier: string) {
  const who = await rpc('gt_athlete_identify_v1', { p_identifier: identifier.slice(0, 200) });
  if (who?.error) return [];
  const name = String(who?.full_name ?? '').trim();
  if (name.length < 3 || !name.includes(' ')) return [];
  const rows = await rpc('gt_athlete_login_lookup_v1', { p_name: name });
  return (rows ?? []).filter((r) => who.kind !== 'go_id' || r.go_id === who.go_id).filter((r) => who.kind !== 'dan' || r.dan_number === who.dan_number);
}

/** Open the account of a registry athlete (no account yet) with the athlete default password. */
async function createAthlete(a, password: string) {
  const uid = await newUser(password, a.full_name, 'athlete');
  const ok = await rpc('gt_athlete_self_register_v2', { p_go_id: a.go_id, p_name: a.full_name, p_dan: a.dan_number ?? '', p_user: uid }).catch(() => false);
  if (ok !== true) { await admin.auth.admin.deleteUser(uid); return null; }
  await rpc('gt_easy_register_v1', { p_user: uid, p_kind: 'athlete', p_name: a.full_name, p_key: null, p_academy: null, p_organizer: null });
  return uid;
}

async function caller(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const { data: { user } } = await admin.auth.getUser(token);
  return user ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return respond({ message: 'Method not allowed' }, 405);
  try {
    const raw = await req.text(); if (raw.length > 4096) return respond({ message: 'ข้อมูลยาวเกินไป' }, 413);
    const b = JSON.parse(raw);
    const action = String(b.action ?? '');
    const password = typeof b.password === 'string' ? b.password : '';
    const identifier = typeof b.identifier === 'string' ? b.identifier.replace(/\s+/g, ' ').trim().slice(0, 160) : '';

    // ---------- signed-in actions ----------
    if (action === 'profile' || action === 'reset') {
      const me = await caller(req); if (!me) return respond({ message: 'กรุณาเข้าสู่ระบบก่อน' }, 401);
      if (action === 'profile') {
        const np = typeof b.new_password === 'string' ? b.new_password : '';
        if (np) {
          if (np.length < 6 || np.length > 72) return respond({ message: 'รหัสผ่านใหม่ 6–72 ตัวอักษร' }, 400);
          const { error } = await admin.auth.admin.updateUserById(me.id, { password: np });
          if (error) return respond({ message: 'เปลี่ยนรหัสไม่สำเร็จ ลองรหัสที่ยาวขึ้นหรือเดายากขึ้น' }, 400);
          await rpc('gt_easy_audit_v1', { p_action: 'change_password', p_target: me.id, p_actor: me.id, p_note: null });
        }
        const phone = typeof b.phone === 'string' ? b.phone.replace(/\D/g, '') : '';
        if (phone && (phone.length < 9 || phone.length > 12)) return respond({ message: 'เบอร์โทรไม่ถูกต้อง' }, 400);
        const birth = typeof b.birth_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.birth_date) ? b.birth_date : null;
        await rpc('gt_easy_mark_v1', { p_user: me.id, p_using_default: np ? false : null, p_phone: phone || null, p_birth: birth });
        return respond({ ok: true });
      }
      const target = String(b.target_user ?? '');
      const kind = await rpc('gt_easy_can_reset_v1', { p_actor: me.id, p_target: target });
      if (!kind) return respond({ message: 'คุณไม่มีสิทธิ์รีเซ็ตรหัสของบัญชีนี้' }, 403);
      const acc = await rpc('gt_easy_account_v1', { p_user: target });
      const def = await rpc('gt_easy_default_password_v1', { p_kind: kind, p_key: acc?.login_key ?? null });
      if (!def) return respond({ message: 'ยังไม่ได้ตั้งรหัสเริ่มต้นของตำแหน่งนี้' }, 409);
      const { error } = await admin.auth.admin.updateUserById(target, { password: def });
      if (error) return respond({ message: 'รีเซ็ตไม่สำเร็จ กรุณาลองใหม่' }, 503);
      await rpc('gt_easy_mark_v1', { p_user: target, p_using_default: true, p_phone: null, p_birth: null });
      await rpc('gt_easy_audit_v1', { p_action: 'reset_default', p_target: target, p_actor: me.id, p_note: null });
      return respond({ ok: true, kind, role_label: ROLE[kind] });
    }

    // ---------- public actions ----------
    if (!['login', 'create', 'forgot'].includes(action)) return respond({ message: 'คำขอไม่ถูกต้อง' }, 400);
    if (identifier.length < 2) return respond({ message: 'กรุณากรอกชื่อ / ชื่อสถาบัน / ชื่อทีม / รหัส GO' }, 400);
    const allowed = await rpc('gt_athlete_login_limit_v1', { p_key: await sha('easy:' + action + ':' + identifier.toLowerCase().replace(/\s/g, '')) });
    if (!allowed) return respond({ message: 'ลองหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' }, 429);

    const r = await rpc('gt_easy_resolve_v1', { p_identifier: identifier });
    const ath = await athletes(identifier);
    const candidates = [...new Set([...(r.users ?? []), ...ath.map((a) => a.user_id).filter(Boolean), ...(r.academy?.managers ?? [])])].slice(0, 6);

    if (action === 'forgot') {
      const np = typeof b.new_password === 'string' ? b.new_password : '';
      if (np.length < 6 || np.length > 72) return respond({ message: 'ตั้งรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร' }, 400);
      const birth = typeof b.birth_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.birth_date) ? b.birth_date : null;
      if (!birth || typeof b.phone !== 'string') return respond({ message: 'กรุณากรอกเบอร์โทรและวันเกิด' }, 400);
      if (!candidates.length) {
        if (ath.length) return respond({ message: 'นักกีฬาคนนี้ยังไม่เคยเข้าระบบ ใช้รหัสเริ่มต้นของนักกีฬาเข้าได้เลย (ถามครูหรือดูประกาศ)' }, 409);
        return respond({ message: 'ไม่พบชื่อนี้ในระบบ ตรวจการสะกด หรือใช้รหัส GO' }, 404);
      }
      for (const uid of candidates) {
        if (await rpc('gt_easy_recovery_match_v1', { p_user: uid, p_phone: b.phone, p_birth: birth })) {
          const { error } = await admin.auth.admin.updateUserById(uid, { password: np });
          if (error) return respond({ message: 'ตั้งรหัสไม่สำเร็จ ลองรหัสที่ยาวขึ้น' }, 400);
          await rpc('gt_easy_mark_v1', { p_user: uid, p_using_default: false, p_phone: null, p_birth: null });
          await rpc('gt_easy_audit_v1', { p_action: 'forgot_self', p_target: uid, p_actor: null, p_note: null });
          const session = await signIn(uid, np);
          return session ? sessionReply(uid, session, np) : respond({ message: 'ตั้งรหัสใหม่แล้ว กรุณาเข้าสู่ระบบ' });
        }
      }
      return respond({ message: 'เบอร์โทรหรือวันเกิดไม่ตรงกับที่เคยให้ไว้ · นักเรียนให้ครูกด “รีเซ็ตรหัส” ให้ได้ · ครูให้เจ้าของสถาบันรีเซ็ตให้' }, 401);
    }

    if (!password || password.length > 128) return respond({ message: 'กรุณากรอกรหัสผ่าน' }, 400);

    if (action === 'login') {
      for (const uid of candidates) {
        const session = await signIn(uid, password);
        if (session) return sessionReply(uid, session, password);
      }
    }

    // No existing account accepted the password → is it a role default that may create one?
    const d = await rpc('gt_easy_default_kinds_v1', { p_password: password, p_key: r.key });
    const kinds: string[] = d.kinds ?? [];
    const display = identifier;

    if (action === 'login') {
      if (r.reserved && d.reserved && !(r.users ?? []).length) {
        const uid = await createAccount(r.reserved.kind, r.reserved.name, r.key, password, null, null);
        if (typeof uid !== 'string' || uid.length !== 36) return respond({ message: 'เปิดบัญชีไม่สำเร็จ' }, 409);
        return sessionReply(uid, await signIn(uid, password), password);
      }
      if (kinds.includes('athlete') && ath.length) {
        const free = ath.filter((a) => !a.user_id);
        if (!free.length) return respond({ message: 'นักกีฬาคนนี้เปลี่ยนรหัสผ่านแล้ว · ถ้าลืม กด “ลืมรหัสผ่าน” ใช้เบอร์โทร + วันเกิด หรือให้ครูรีเซ็ตให้' }, 401);
        if (free.length > 1 || ath.length > 1) return respond({ message: 'มีชื่อนี้มากกว่า 1 คน กรุณาเข้าด้วยรหัส GO (ดูได้ที่หน้านักกีฬา)' }, 409);
        const uid = await createAthlete(free[0], password);
        if (!uid) return respond({ message: 'เปิดบัญชีนักกีฬาไม่สำเร็จ กรุณาลองใหม่ หรือแจ้งครู' }, 409);
        return sessionReply(uid, await signIn(uid, password), password);
      }
      // An athlete who is also a referee: the referee default works too while the account still uses its default
      // (one person = one account; the athlete account is opened if needed).
      if (kinds.includes('referee') && ath.length === 1) {
        const a = ath[0];
        const athDefault = await rpc('gt_easy_default_password_v1', { p_kind: 'athlete', p_key: null });
        let uid = a.user_id;
        if (!uid) uid = await createAthlete(a, athDefault);
        else { const acc = await rpc('gt_easy_account_v1', { p_user: uid }); if (!acc?.using_default) uid = null; }
        const session = uid ? await signIn(uid, athDefault) : null;
        if (session) return sessionReply(uid, session, athDefault);
        if (a.user_id) return respond({ message: 'บัญชีนี้เปลี่ยนรหัสผ่านแล้ว ใช้รหัสที่ตั้งเอง · ถ้าลืม กด “ลืมรหัสผ่าน”' }, 401);
      }
      if (kinds.includes('institution') && r.academy) {
        const uid = await createAccount('institution', r.academy.name, r.key, password, r.academy.id, null);
        if (uid === 'HAS_MANAGER' || uid === 'TAKEN') return respond({ message: 'สถาบันนี้เปิดบัญชีแล้วและเปลี่ยนรหัสผ่านแล้ว · ถ้าลืม ติดต่อแอดมินระบบ' }, 401);
        return sessionReply(uid, await signIn(uid, password), password);
      }
      if (kinds.includes('organizer') && r.organizer) {
        const uid = await createAccount('organizer', r.organizer.name, r.key, password, null, r.organizer.id);
        if (uid === 'TAKEN') return respond({ message: 'ทีมนี้เปิดบัญชีแล้วและเปลี่ยนรหัสผ่านแล้ว · ถ้าลืม ติดต่อแอดมินระบบ' }, 401);
        return sessionReply(uid, await signIn(uid, password), password);
      }
      const used = (r.users ?? []).length > 0 || r.academy || r.organizer || r.reserved;
      if (!used) {
        if (kinds.includes('teacher')) return respond({ need_create: true, kind: 'teacher', role_label: ROLE.teacher, name: display, academies: await rpc('gt_easy_academies_v1', {}) });
        if (kinds.includes('freelance') && !ath.length) return respond({ need_create: true, kind: 'freelance', role_label: ROLE.freelance, name: display });
        if (kinds.includes('referee')) return respond({ need_create: true, kind: 'referee', role_label: ROLE.referee, name: display });
      }
      if (!candidates.length && !kinds.length && !ath.length && !r.academy && !r.organizer)
        return respond({ message: 'ไม่พบชื่อนี้ในระบบ · ตรวจการสะกด หรือใช้รหัส GO / เลขดั้ง · ครูหรือกรรมการที่ยังไม่มีบัญชี ใช้รหัสเริ่มต้นของตำแหน่งเพื่อเปิดบัญชี' }, 404);
      return respond({ message: 'รหัสผ่านไม่ถูกต้อง · ถ้าเคยเปลี่ยนรหัสแล้วจำไม่ได้ กด “ลืมรหัสผ่าน”' }, 401);
    }

    // action === 'create' (confirmed by the person on screen)
    const kind = String(b.kind ?? '');
    if (!['teacher', 'freelance', 'referee'].includes(kind) || !kinds.includes(kind)) return respond({ message: 'รหัสเริ่มต้นไม่ตรงกับตำแหน่งที่เลือก' }, 400);
    if (display.length < 2 || display.length > 80) return respond({ message: 'ชื่อ 2–80 ตัวอักษร' }, 400);
    if (kind === 'teacher' && !/^[0-9a-f-]{36}$/.test(String(b.academy_id ?? ''))) return respond({ message: 'กรุณาเลือกสถาบันที่สอน' }, 400);
    if ((r.users ?? []).length || r.academy || r.organizer || r.reserved) return respond({ message: 'ชื่อนี้มีในระบบแล้ว · ถ้าเป็นคนละคน เพิ่มชื่อเล่นหรือนามสกุลต่อท้าย' }, 409);
    if (kind === 'freelance' && ath.length) return respond({ message: 'ชื่อนี้ตรงกับนักกีฬาในทะเบียน · ครูอิสระกรุณาเพิ่มคำว่า “ครู” นำหน้าชื่อ' }, 409);
    const uid = await createAccount(kind, display, r.key, password, kind === 'teacher' ? String(b.academy_id ?? '') || null : null, null);
    if (uid === 'TAKEN') return respond({ message: 'ชื่อนี้มีในระบบแล้ว' }, 409);
    return sessionReply(uid, await signIn(uid, password), password);
  } catch (e) {
    console.error(e);
    return respond({ message: 'เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่' }, 503);
  }
});
