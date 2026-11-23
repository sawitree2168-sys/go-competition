import {spawn,spawnSync} from 'node:child_process';
spawnSync(process.execPath,['scripts/build-offline-desk.mjs'],{stdio:'inherit'});
const args=process.argv.slice(2).filter(a=>a!=='--strictPort').map(a=>a==='--host'?'--hostname':a);
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev',...args],{stdio:'inherit'});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
