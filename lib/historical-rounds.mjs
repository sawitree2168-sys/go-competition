/** Resolve wall-list numbers inside their own division and require reciprocal results. */
export function historicalRoundGames(source) {
 const games=[],issues=[],done=new Set();
 const scope=p=>`${p.division}|${p.placing}`;
 const byNumber=new Map();
 for(const p of source.players){const key=scope(p);if(byNumber.has(key))throw new Error(`Duplicate wall-list position ${key}`);byNumber.set(key,p);}
 const id=p=>`history:${source.event}:${p.division}:${p.playerRef}`;
 const base=(p,i)=>({division:p.division,round:i+1,blackId:id(p),blackName:p.name.replace(/^(ด\.ช\.|ด\.ญ\.|นาย\s|นางสาว\s|นาง\s)/,'').trim(),whiteId:null,whiteName:null,winner:null,result:null,state:'verified',bye:false,colourKnown:false,sourceUrl:source.sourceUrl});
 for(const p of source.players)for(let i=0;i<p.rounds.length;i++){
  const code=String(p.rounds[i]||'').trim();if(!code)continue;
  if(code==='×'||/^\d+×$/.test(code)){games.push({...base(p,i),notPlayed:true,result:'not_played'});continue;}
  if(/^(?:BYE|บาย|0\+|\+)$/i.test(code)){games.push({...base(p,i),bye:true,result:'bye'});continue;}
  const token=code.match(/^(\d+)([+\-=])$/);
  if(!token){issues.push({division:p.division,player:p.name,round:i+1,code,reason:'unrecognized code'});continue;}
  const opponent=byNumber.get(`${p.division}|${Number(token[1])}`);
  if(!opponent||opponent===p){issues.push({division:p.division,player:p.name,round:i+1,code,reason:'missing opponent'});continue;}
  const reciprocal=String(opponent.rounds[i]||'').trim();
  const expected=`${p.placing}${token[2]==='+'?'-':token[2]==='-'?'+':'='}`;
  if(reciprocal!==expected){issues.push({division:p.division,player:p.name,round:i+1,code,reason:'non-reciprocal result',reciprocal,expected});continue;}
  const key=`${p.division}|${i}|${[p.placing,opponent.placing].sort((a,b)=>a-b).join(':')}`;
  if(done.has(key))continue;done.add(key);
  games.push({...base(p,i),whiteId:id(opponent),whiteName:opponent.name.replace(/^(ด\.ช\.|ด\.ญ\.|นาย\s|นางสาว\s|นาง\s)/,'').trim(),winner:token[2]==='+'?id(p):token[2]==='-'?id(opponent):null,result:token[2]==='='?'draw':'recorded_win'});
 }
 return {games,issues};
}
