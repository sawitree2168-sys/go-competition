import {uuid,publicRows} from "../../../../../lib/competition/public-data";
import {response} from "../../../../../lib/competition/auth";
export const dynamic="force-dynamic";
export async function GET(_r:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;if(!uuid.test(id))return response({message:"รหัสงานไม่ถูกต้อง"},400);try{const cfg=await publicRows("gt_event_payment_settings_v2",{select:"bank_name,account_name,account_number,qr_url,registration_enabled",tournament_id:"eq."+id,limit:"1"});return response({status:"ok",payment:cfg[0]||null})}catch{return response({message:"อ่านช่องทางรับเงินไม่ได้"},503)}}
