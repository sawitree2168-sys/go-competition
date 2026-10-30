// @ts-nocheck -- deployed to the Deno Edge runtime, not the Next.js runtime.
import { createClient } from 'npm:@supabase/supabase-js@2.105.1';
const base=Deno.env.get('SUPABASE_URL')!;
const admin=createClient(base,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const respond=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const normalize=(s:string)=>s.normalize('NFC').replace(/[\s\u200b-\u200d\ufeff]/g,'');
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return respond({message:'Method not allowed'},405);
 try{
 if(Number(req.headers.get('content-length')||0)>4096)return respond({message:'ข้อมูลยาวเกินไป'},413);
 const raw=await req.text();if(raw.length>4096)return respond({message:'ข้อมูลยาวเกินไป'},413);
 const b=JSON.parse(raw);const name=typeof b.name==='string'?b.name.trim():'';
 if(name.length<3||name.length>200||!name.includes(' '))return respond({message:'กรุณากรอกชื่อและนามสกุล'},400);
 const action=b.action||'search';if(!['search','login','register','issue','set-password'].includes(action))return respond({message:'คำขอไม่ถูกต้อง'},400);
 let staff=null;
 if(action==='issue'){
 const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
 const {data:{user},error}=await admin.auth.getUser(token);if(error||!user)return respond({message:'กรุณาเข้าสู่ระบบแอดมิน'},401);
 const {data:s}=await admin.from('gt_staff_members').select('role,active').eq('user_id',user.id).single();
 if(!s?.active||!['owner','admin'].includes(s.role))return respond({message:'เฉพาะแอดมินที่มีสิทธิ์'},403);
 if(b.confirmed!==true||typeof b.note!=='string'||b.note.trim().length<12)return respond({message:'กรุณายืนยันตัวตนและบันทึกเหตุผลอย่างน้อย 12 ตัวอักษร'},400);
 staff=user;
 }
 const {data:allowed,error:limitError}=await admin.rpc('gt_athlete_login_limit_v1',{p_key:await hash(action+':'+normalize(name))});
 if(limitError)throw limitError;if(!allowed)return respond({message:'ลองหลายครั้งเกินไป กรุณารอ 15 นาที'},429);
 const {data:rows,error}=await admin.rpc('gt_athlete_login_lookup_v1',{p_name:name});if(error)throw error;
 if(action==='search')return respond({athletes:rows.map(r=>({go_id:r.go_id,full_name:r.full_name,dan_number:r.dan_number,has_password:!!r.user_id}))});
 const matches=rows.filter(r=>(!b.go_id||r.go_id===b.go_id)&&(!b.dan_number||r.dan_number===String(b.dan_number).replace(/,/g,'').trim()));
 if(matches.length!==1)return respond({message:'กรุณาเลือก ID ให้ถูกต้อง หรือติดต่อแอดมินตรวจทะเบียน'},409);
 const athlete=matches[0];
 if(athlete.dan_number&&String(b.dan_number||'').replace(/,/g,'').trim()!==athlete.dan_number)return respond({message:'กรุณายืนยันเลขทะเบียนดั้ง'},400);
 if(action==='issue'){
 let uid=athlete.user_id,created=false;
 if(!uid){const {data,error}=await admin.auth.admin.createUser({email:crypto.randomUUID()+'@athlete.go-tournament.invalid',email_confirm:true,password:crypto.randomUUID()+crypto.randomUUID()});if(error)throw error;uid=data.user.id;created=true;}
 const code=Array.from(crypto.getRandomValues(new Uint8Array(12))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const {error}=await admin.rpc('gt_athlete_access_issue_v1',{p_go_id:athlete.go_id,p_user:uid,p_admin:staff.id,p_hash:await hash(code),p_note:b.note.trim().slice(0,500)});
 if(error){if(created)await admin.auth.admin.deleteUser(uid);return respond({message:'ออกรหัสไม่ได้ อาจเป็นบัญชีดูแลนักกีฬาหลายคนหรือทะเบียนต้องตรวจเพิ่มเติม'},409);}
 return respond({code,go_id:athlete.go_id,expires_in_hours:24,message:'แจ้งรหัสนี้แก่นักกีฬา ใช้ตั้งรหัสผ่านได้ครั้งเดียวภายใน 24 ชั่วโมง'});
 }
 if(typeof b.password!=='string'||b.password.length<1||b.password.length>128)return respond({message:'กรุณากรอกรหัสผ่าน'},400);
 if(action==='register'){
 if(athlete.user_id)return respond({message:'บัญชีนี้ตั้งรหัสแล้ว กรุณาเข้าสู่ระบบด้วยรหัสเดิม หรือเลือกลืมรหัสผ่าน'},409);
 if(b.confirmed!==true||b.password.length<8||b.password!==b.confirm_password)return respond({message:'ตั้งรหัสอย่างน้อย 8 ตัวอักษร ยืนยันรหัสให้ตรงกัน และยืนยันข้อมูลของคุณ'},400);
 const {data:created,error:createError}=await admin.auth.admin.createUser({email:crypto.randomUUID()+'@athlete.go-tournament.invalid',email_confirm:true,password:b.password});
 if(createError||!created.user)return respond({message:'สร้างบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง'},503);
 const newUid=created.user.id;
 const {data:enrolled,error:enrollError}=await admin.rpc('gt_athlete_self_register_v1',{p_go_id:athlete.go_id,p_name:name,p_dan:String(b.dan_number||'').replace(/,/g,'').trim(),p_user:newUid});
 // A transport error can hide a committed transaction. Do not delete a possibly linked user.
 if(enrollError)return respond({message:'ตรวจการบันทึกไม่ได้ กรุณาลองเข้าสู่ระบบด้วยรหัสที่เพิ่งตั้งก่อนสมัครซ้ำ'},503);
 if(enrolled!==true){await admin.auth.admin.deleteUser(newUid);return respond({message:'ข้อมูลนี้มีบัญชีแล้วหรืออยู่ระหว่างตรวจสอบ กรุณาค้นชื่อใหม่และใช้รหัสเดิม'},409);}
 const login=createClient(base,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await login.auth.signInWithPassword({email:created.user.email,password:b.password});
 if(error||!data.session)return respond({message:'สร้างบัญชีแล้ว กรุณาเข้าสู่ระบบด้วยรหัสที่เพิ่งตั้ง'},503);
 return respond({session:{access_token:data.session.access_token,refresh_token:data.session.refresh_token},go_id:athlete.go_id,registered:true});
 }

 let uid=athlete.user_id;if(!uid)return respond({message:'กรุณาติดต่อแอดมินเพื่อยืนยันตัวตนและตั้งรหัสครั้งแรก'},409);
 if(action==='set-password'){
 if(b.password.length<8||typeof b.code!=='string'||!/^[a-f0-9]{24}$/.test(b.code))return respond({message:'รหัสผ่านอย่างน้อย 8 ตัวอักษร และรหัสชั่วคราวที่ได้รับจากแอดมิน'},400);
 const {data:consumed,error}=await admin.rpc('gt_athlete_access_consume_v1',{p_go_id:athlete.go_id,p_hash:await hash(b.code)});
 if(error)throw error;if(consumed!==uid)return respond({message:'รหัสชั่วคราวไม่ถูกต้อง ใช้แล้ว หรือหมดอายุ'},401);
 const {error:updateError}=await admin.auth.admin.updateUserById(uid,{password:b.password});if(updateError)return respond({message:'ตั้งรหัสไม่สำเร็จ กรุณาขอรหัสชั่วคราวใหม่จากแอดมิน'},503);
 }
 const {data:{user},error:userError}=await admin.auth.admin.getUserById(uid);if(userError||!user?.email)throw Error('Account unavailable');
 const login=createClient(base,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error:loginError}=await login.auth.signInWithPassword({email:user.email,password:b.password});
 if(loginError||!data.session)return respond({message:'ชื่อ เลขทะเบียนดั้ง หรือรหัสผ่านไม่ถูกต้อง'},401);
 return respond({session:{access_token:data.session.access_token,refresh_token:data.session.refresh_token},go_id:athlete.go_id});
 }catch{return respond({message:'เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่'},503);}
});
