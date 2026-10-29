import type {Tournament} from "./public-data";
export type Registration={id:string;tournament_id:string;division_id:string;athlete_id:string;registration_status:string;payment_status:string;fee_snapshot_thb:number|null;created_at:string;tournament:Tournament|null;division:{id:string;name:string}|null;athlete?:{id:string;go_id:string;full_name:string}|null};
export const registrationLabel=(s:string)=>s==="confirmed"?"ยืนยันแล้ว":s==="cancelled"?"ยกเลิกแล้ว":"รอตรวจสอบ";
export const paymentLabel=(s:string)=>s==="verified"?"ตรวจสอบแล้ว":s==="rejected"?"หลักฐานไม่ผ่าน":s==="waived"?"ยกเว้นค่าสมัคร":"รอตรวจสอบ";
