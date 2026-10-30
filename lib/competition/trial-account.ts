// Public fictional fixture. This is a UI demonstration, never an authentication token.
export const trialAccount={name:'นักกีฬา ทดลอง',password:'12345678',goId:'GO-TEST-001'};
export function checkTrialLogin(name:string,password:string){
 return name.normalize('NFC').trim().replace(/\s+/g,' ')===trialAccount.name&&password===trialAccount.password;
}
