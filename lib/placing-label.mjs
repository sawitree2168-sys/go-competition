/** A placing must remain readable without an emoji or colour. */
export function placingLabel(placing){
 if(!Number.isInteger(placing)||placing<1)return 'ยังไม่ระบุ';
 return placing===1?'ชนะเลิศ':`ที่ ${placing}`;
}
