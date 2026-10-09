import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as joinPath } from 'node:path';
import { io as connect } from 'socket.io-client';
import { createGameServer } from '../index.mjs';
import { createStore } from '../store.mjs';
const event=(socket,name,timeout=3000)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Timeout '+name)),timeout);socket.once(name,value=>{clearTimeout(timer);resolve(value);});});
const ack=(socket,eventName,value={})=>new Promise((resolve,reject)=>socket.timeout(4000).emit(eventName,value,(err,result)=>err?reject(err):resolve(result)));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('real socket clients share one room; cap, reconnect, death, persistence, authentication',async()=>{
 const directory=mkdtempSync(joinPath(tmpdir(),'snake-test-'));const server=createGameServer({directory,projectId:''});await new Promise(r=>server.http.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.http.address().port;const clients=[];
 try{
  assert.equal((await(await fetch(url+'/api/health')).json()).ok,true);
  const createGuest=async name=>(await(await fetch(url+'/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})})).json()).token;
  const client=async(token,origin='http://localhost:8080')=>{const c=connect(url,{auth:{token},transports:['websocket'],extraHeaders:{Origin:origin},reconnection:false});clients.push(c);await event(c,'connect');return c;};
  const token=await createGuest('Web player'),web=await client(token),joined=await ack(web,'join',{mode:'create'});assert.ok(joined.ok);const roomCode=joined.code;
  const app=await client(await createGuest('Android player'),'http://localhost');const r=await ack(app,'join',{mode:'join',code:roomCode});assert.ok(r.ok);assert.equal(r.code,roomCode);
  const ws=event(web,'state'),as=event(app,'state');web.emit('sync');app.emit('sync');const [w,a]=await Promise.all([ws,as]);assert.equal(w.code,a.code);assert.equal(w.humans,2);assert.equal(w.bots,8);assert.equal(w.snakes.length,10);assert.ok(w.snakes.some(s=>s.name==='Android player'));
  const body=await(await fetch(url+'/api/profile',{headers:{Authorization:'Bearer '+token}})).json();assert.equal(body.best,0);
  // Khách không thể giả UID hoặc tự gửi điểm cao.
  assert.equal((await fetch(url+'/api/profile',{headers:{Authorization:'Bearer guest.fake.fake'}})).status,401);
  assert.equal((await fetch(url+'/api/profile',{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({name:'Hacked',skin:'gold',best:999999})})).status,409);
  assert.equal((await fetch(url+'/api/score',{method:'POST'})).status,404);
  const duplicate=await client(token);const dup=await ack(duplicate,'join',{mode:'join',code:roomCode});assert.equal(dup.ok,false);duplicate.disconnect();
  const testArena=server.rooms.get(roomCode).arena;testArena.step=()=>{};const snake=testArena.snakes.get(joined.id);snake.peak=350;snake.score=350;snake.mass=374;snake.kills=2;
  web.disconnect();await wait(80);const resume=await client(token);const resumed=await ack(resume,'join',{mode:'join',code:roomCode});assert.ok(resumed.ok);assert.ok(resumed.resumed);assert.equal(server.rooms.get(roomCode).arena.snakes.get(joined.id),snake);
  const death=event(resume,'died');server.rooms.get(roomCode).arena.kill(snake,null,'boundary');const d=await death;assert.equal(d.score,350);assert.equal(d.profile.best,350);assert.ok(d.profile.unlocked.includes('ocean'));assert.equal(d.profile.games,1);
  assert.ok((await ack(resume,'respawn')).ok);assert.equal(server.rooms.get(roomCode).arena.snakes.get(joined.id).peak,0);
  for(let i=3;i<=10;i++){const c=await client(await createGuest('P'+i));assert.ok((await ack(c,'join',{mode:'join',code:roomCode})).ok);}
  assert.equal(server.rooms.get(roomCode).arena.humanCount,10);assert.equal(server.rooms.get(roomCode).arena.snakes.size,10);
  const extra=await client(await createGuest('P11'));const full=await ack(extra,'join',{mode:'join',code:roomCode});assert.equal(full.ok,false);assert.match(full.error,/10/);
  await ack(resume,'leave');const saved=await(await fetch(url+'/api/profile',{headers:{Authorization:'Bearer '+token}})).json();assert.equal(saved.best,350);assert.equal(saved.kills,2);
  const edit=await fetch(url+'/api/profile',{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({name:'Updated',skin:'ocean',best:999999})});assert.equal(edit.status,200);assert.equal((await edit.json()).best,350);
 }finally{for(const c of clients)c.disconnect();await server.close();}
 const reopened=createStore(directory);try{const row=reopened.db.prepare('SELECT best,skin FROM users WHERE name=?').get('Updated');assert.equal(row.best,350);assert.equal(row.skin,'ocean');}finally{reopened.db.close();rmSync(directory,{recursive:true,force:true});}
});
