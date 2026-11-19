import {divisionKey} from './division-display';
export function wallDivisionKey(name:string):string {
 const aliases:Record<string,string>={Open:'ทั่วไป (Open)',U10:'อายุไม่เกิน 10 ปี (U10)',U16:'อายุไม่เกิน 16 ปี (U16)',WOMEN:'ทั่วไปหญิง'};
 const key=divisionKey(aliases[name]??name),group=name.match(/(?:kyu|คิว)\s*([ab])\s*$/i)?.[1]?.toLowerCase();
 return group?`${key}:${group}`:key;
}
