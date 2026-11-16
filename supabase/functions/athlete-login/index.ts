// @ts-nocheck -- deployed to the Supabase Edge (Deno) runtime, not the Next.js build.
// Athlete accounts without e-mail (deployed as Edge Function "athlete-login", verify_jwt = false).
//
// Athletes come from the site owner's sheet (gt_private.history_identity_registry_v1, GO IDs) and the dan
// directory (dan numbers). An athlete:
//   - signs up with their full name (dan players also confirm their dan number) and sets a password;
//   - signs in with GO ID, dan number or full name + password.
// The site owner (admin) can issue a one-time code so an athlete can set a new password.
// Accounts use a random @athlete.go-tournament.invalid address that is never shown or mailed.
// v4 (16 Nov 2026): "identifier" = GO ID / dan number / name; the dan check applies to sign-up only.
import { createClient } from 'npm:@supabase/supabase-js@2.105.1';

const base = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(base, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...cors } });
const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((x) => x.toString(16).padStart(2, '0')).join('');
const normalize = (s: string) => s.normalize('NFC').replace(/[\s\u200b-\u200d\ufeff]/g, '');
const cleanDan = (v: unknown) => String(v ?? '').replace(/[,\s]/g, '').replace(/^0+(?=\d)/, '');
const anonLogin = () => createClient(base, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return respond({ message: 'Method not allowed' }, 405);
  try {
    if (Number(req.headers.get('content-length') || 0) > 4096) return respond({ message: 'ข้อมูลยาวเกินไป' }, 413);
    const raw = await req.text(); if (raw.length > 4096) return respond({ message: 'ข้อมูลยาวเกินไป' }, 413);
    const b = JSON.parse(raw);
    const action = b.action || 'search';
    if (!['search', 'login', 'register', 'issue', 'set-password'].includes(action)) return respond({ message: 'คำขอไม่ถูกต้อง' }, 400);

    // What the athlete typed: GO ID, dan number or full name.
    let name = typeof b.name === 'string' ? b.name.trim() : '';
    if (typeof b.identifier === 'string' && b.identifier.trim()) {
      const { data: who, error: idError } = await admin.rpc('gt_athlete_identify_v1', { p_identifier: b.identifier.slice(0, 200) });
      if (idError) throw idError;
      if (who?.error) return respond({ message: who.kind === 'dan' ? 'ไม่พบเลขทะเบียนดั้งนี้' : 'ไม่พบรหัส GO นี้' }, 404);
      name = who.full_name || '';
      if (who.kind === 'go_id') b.go_id = who.go_id;
      if (who.kind === 'dan') b.dan_number = who.dan_number;
    }
    if (name.length < 3 || name.length > 200 || !name.includes(' ')) return respond({ message: 'กรุณากรอกชื่อและนามสกุล รหัส GO หรือเลขดั้ง' }, 400);

    let staff = null;
    if (action === 'issue') {
      const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
      const { data: { user }, error } = await admin.auth.getUser(token); if (error || !user) return respond({ message: 'กรุณาเข้าสู่ระบบแอดมิน' }, 401);
      const { data: s } = await admin.from('gt_staff_members').select('role,active').eq('user_id', user.id).single();
      if (!s?.active || !['owner', 'admin'].includes(s.role)) return respond({ message: 'เฉพาะแอดมินที่มีสิทธิ์' }, 403);
      if (b.confirmed !== true || typeof b.note !== 'string' || b.note.trim().length < 12) return respond({ message: 'กรุณายืนยันตัวตนและบันทึกเหตุผลอย่างน้อย 12 ตัวอักษร' }, 400);
      staff = user;
    }

    const { data: allowed, error: limitError } = await admin.rpc('gt_athlete_login_limit_v1', { p_key: await hash(action + ':' + normalize(name)) });
    if (limitError) throw limitError; if (!allowed) return respond({ message: 'ลองหลายครั้งเกินไป กรุณารอ 15 นาที' }, 429);
    const { data: rows, error } = await admin.rpc('gt_athlete_login_lookup_v1', { p_name: name }); if (error) throw error;
    if (action === 'search') return respond({ athletes: rows.map((r) => ({ go_id: r.go_id, full_name: r.full_name, rank: r.source_rank, dan: !!r.dan_number, has_password: !!r.user_id })) });

    const matches = rows.filter((r) => !b.go_id || r.go_id === b.go_id);
    if (!matches.length) return respond({ message: 'ไม่พบชื่อนี้ในทะเบียน ตรวจการสะกดชื่อ-นามสกุล หรือใช้รหัส GO' }, 404);
    if (matches.length !== 1) return respond({ message: 'มีชื่อนี้มากกว่า 1 คน กรุณาใช้รหัส GO' }, 409);
    const athlete = matches[0];

    if (action === 'issue') {
      let uid = athlete.user_id, created = false;
      if (!uid) { const { data, error } = await admin.auth.admin.createUser({ email: crypto.randomUUID() + '@athlete.go-tournament.invalid', email_confirm: true, password: crypto.randomUUID() + crypto.randomUUID() }); if (error) throw error; uid = data.user.id; created = true; }
      const code = Array.from(crypto.getRandomValues(new Uint8Array(12))).map((x) => x.toString(16).padStart(2, '0')).join('');
      const { error } = await admin.rpc('gt_athlete_access_issue_v1', { p_go_id: athlete.go_id, p_user: uid, p_admin: staff.id, p_hash: await hash(code), p_note: b.note.trim().slice(0, 500) });
      if (error) { if (created) await admin.auth.admin.deleteUser(uid); return respond({ message: 'ออกรหัสไม่ได้ อาจเป็นบัญชีดูแลนักกีฬาหลายคนหรือทะเบียนต้องตรวจเพิ่มเติม' }, 409); }
      return respond({ code, go_id: athlete.go_id, full_name: athlete.full_name, expires_in_hours: 24, message: 'แจ้งรหัสนี้แก่นักกีฬา ใช้ตั้งรหัสผ่านได้ครั้งเดียวภายใน 24 ชั่วโมง' });
    }

    if (typeof b.password !== 'string' || b.password.length < 1 || b.password.length > 128) return respond({ message: 'กรุณากรอกรหัสผ่าน' }, 400);

    if (action === 'register') {
      // Dan players confirm their dan number when creating the account.
      if (athlete.dan_number && cleanDan(b.dan_number) !== athlete.dan_number) return respond({ message: 'นักกีฬาระดับดั้ง: กรุณากรอกเลขทะเบียนดั้งให้ถูกต้อง', need_dan: true }, 400);
      if (athlete.user_id) return respond({ message: 'นักกีฬาคนนี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบ ถ้าไม่ได้สมัครเอง กรุณาติดต่อผู้ดูแลระบบ' }, 409);
      if (b.confirmed !== true || b.password.length < 8 || b.password !== b.confirm_password) return respond({ message: 'ตั้งรหัสอย่างน้อย 8 ตัวอักษร ยืนยันรหัสให้ตรงกัน และยืนยันข้อมูลของคุณ' }, 400);
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: crypto.randomUUID() + '@athlete.go-tournament.invalid', email_confirm: true, password: b.password,
        user_metadata: { display_name: athlete.full_name, member_role: 'athlete' },
      });
      if (createError || !created.user) return respond({ message: 'สร้างบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง' }, 503);
      const newUid = created.user.id;
      const { data: enrolled, error: enrollError } = await admin.rpc('gt_athlete_self_register_v2', { p_go_id: athlete.go_id, p_name: name, p_dan: cleanDan(b.dan_number), p_user: newUid });
      // A transport error can hide a committed transaction. Do not delete a possibly linked user.
      if (enrollError) return respond({ message: 'ตรวจการบันทึกไม่ได้ กรุณาลองเข้าสู่ระบบด้วยรหัสที่เพิ่งตั้งก่อนสมัครซ้ำ' }, 503);
      if (enrolled !== true) { await admin.auth.admin.deleteUser(newUid); return respond({ message: 'นักกีฬาคนนี้มีบัญชีแล้วหรืออยู่ระหว่างตรวจสอบ' }, 409); }
      const { data, error } = await anonLogin().auth.signInWithPassword({ email: created.user.email, password: b.password });
      if (error || !data.session) return respond({ message: 'สร้างบัญชีแล้ว กรุณาเข้าสู่ระบบด้วยรหัสที่เพิ่งตั้ง' }, 503);
      return respond({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token }, go_id: athlete.go_id, full_name: athlete.full_name, registered: true });
    }

    const uid = athlete.user_id; if (!uid) return respond({ message: 'นักกีฬาคนนี้ยังไม่ได้สมัคร กรุณากด “สมัครสมาชิก” และตั้งรหัสผ่านก่อน', not_registered: true }, 409);
    if (action === 'set-password') {
      if (b.password.length < 8 || typeof b.code !== 'string' || !/^[a-f0-9]{24}$/.test(b.code)) return respond({ message: 'รหัสผ่านอย่างน้อย 8 ตัวอักษร และรหัสชั่วคราวที่ได้รับจากแอดมิน' }, 400);
      const { data: consumed, error } = await admin.rpc('gt_athlete_access_consume_v1', { p_go_id: athlete.go_id, p_hash: await hash(b.code) });
      if (error) throw error; if (consumed !== uid) return respond({ message: 'รหัสชั่วคราวไม่ถูกต้อง ใช้แล้ว หรือหมดอายุ' }, 401);
      const { error: updateError } = await admin.auth.admin.updateUserById(uid, { password: b.password }); if (updateError) return respond({ message: 'ตั้งรหัสไม่สำเร็จ กรุณาขอรหัสชั่วคราวใหม่จากแอดมิน' }, 503);
    }
    const { data: { user }, error: userError } = await admin.auth.admin.getUserById(uid); if (userError || !user?.email) throw Error('Account unavailable');
    const { data, error: loginError } = await anonLogin().auth.signInWithPassword({ email: user.email, password: b.password });
    if (loginError || !data.session) return respond({ message: 'รหัส GO / เลขดั้ง / ชื่อ หรือรหัสผ่านไม่ถูกต้อง' }, 401);
    return respond({ session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token }, go_id: athlete.go_id, full_name: athlete.full_name });
  } catch { return respond({ message: 'เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่' }, 503); }
});
