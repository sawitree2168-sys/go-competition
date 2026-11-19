export function wallResult(game, playerId) {
 if(game.notPlayed)return 'not_played';
 if(game.bye)return 'bye';
 if(game.state!=='verified')return 'pending';
 if(game.result==='draw')return 'draw';
 if(game.result==='double_forfeit'||game.result==='double_loss')return 'loss';
 if(!game.winner)return 'pending';
 return game.winner===playerId?'win':'loss';
}
