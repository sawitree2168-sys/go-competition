import sources from '@/data/historical-round-sources.json';
import tu from '@/data/thammasat-2026-games-source.json';
import {historicalRoundGames} from './historical-rounds.mjs';
import {wallDivisionKey} from './wall-division';
import {organizerHistoryWallHref} from './history-wall-href';
import type {WallGame} from './news-wall';

const clean=(name:string)=>name.replace(/^(ด\.ช\.|ด\.ญ\.|นาย\s|นางสาว\s|นาง\s)/,'').trim();
export function historicalWall(event:string,date:string|null):WallGame[] {
 const source=sources.find(s=>s.event===event&&s.date===date);if(!source)return [];
 if(event===tu.event&&date===tu.date)return tu.games.map(g=>({division:wallDivisionKey(g.division),round:g.round,blackId:`history:${event}:${g.blackId}`,whiteId:g.whiteId?`history:${event}:${g.whiteId}`:null,blackName:clean(g.blackName),whiteName:g.whiteName?clean(g.whiteName):null,winner:g.code.startsWith('BLACK')?`history:${event}:${g.blackId}`:g.code.startsWith('WHITE')?`history:${event}:${g.whiteId}`:null,result:g.code==='DOUBLE_FORFEIT'?'double_forfeit':g.code==='BYE'?'bye':g.code,state:'verified',bye:g.code==='BYE',colourKnown:g.code!=='BYE'}));
 const publicSource = organizerHistoryWallHref(event,date) ? {...source,sourceUrl:undefined} : source;
 const result=historicalRoundGames(publicSource);
 return result.games.map((g:WallGame)=>({...g,division:wallDivisionKey(g.division)}));
}
