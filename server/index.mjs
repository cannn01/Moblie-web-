import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
loadEnv({path:fileURLToPath(new URL('../.env',import.meta.url)),quiet:true});
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { Server } from 'socket.io';
import { pathToFileURL } from 'node:url';
import { createStore } from './store.mjs';
import { createAuth } from './auth.mjs';
import { Arena } from './engine.mjs';
import { SKINS } from './catalog.mjs';
export function createGameServer(options={}){
 const directory=options.directory??process.env.DATA_DIR??'./data';const store=createStore(directory);
 const auth=createAuth({directory,projectId:options.projectId??process.env.FIREBASE_PROJECT_ID,secret:process.env.GUEST_SECRET,allowGuest:process.env.ALLOW_GUEST!=='false',requireVerified:process.env.REQUIRE_VERIFIED_EMAIL!=='false'});
 const origins=(process.env.ALLOWED_ORIGINS??'http://localhost:5173,http://localhost:8080,http://localhost,https://localhost,capacitor://localhost').split(',').map(s=>s.trim());
 const origin=(value,cb)=>cb(null,!value||origins.includes(value));
 const app=express();app.disable('x-powered-by');app.use(cors({origin}));app.use(express.json({limit:'12kb'}));
 const http=createServer(app),io=new Server(http,{cors:{origin},allowRequest:(req,cb)=>cb(null,!req.headers.origin||origins.includes(req.headers.origin)),maxHttpBufferSize:12000,transports:['websocket','polling']});
 const rooms=new Map(),sessions=new Map(),limits=new Map();
 const rate=(key,max,period=60000)=>{const now=Date.now();let item=limits.get(key);if(!item||now>item.until){item={count:0,until:now+period};limits.set(key,item);}return ++item.count<=max;};
 app.use('/api',(req,res,next)=>rate(req.ip,180)?next():res.status(429).json({error:'Bạn thao tác quá nhanh. Thử lại sau một phút.'}));
 app.get('/api/health',(_,res)=>res.json({ok:true,firebase:auth.enabled,rooms:rooms.size}));
 app.post('/api/guest',(req,res)=>{try{if(!rate('guest:'+req.ip,20))return res.status(429).json({error:'Quá nhiều phiên khách.'});res.json({token:auth.guest(req.body.name)});}catch(e){res.status(403).json({error:e.message});}});
 const authorize=async(req,res,next)=>{try{req.identity=await auth.verify(req.headers.authorization?.replace(/^Bearer /,''));store.user(req.identity);next();}catch(e){res.status(401).json({error:e.message});}};
 app.get('/api/catalog',(_,res)=>res.json(SKINS));
 app.get('/api/leaderboard',(_,res)=>res.json(store.leaders()));
 app.get('/api/profile',authorize,(req,res)=>res.json({...store.profile(req.identity.uid),history:store.history(req.identity.uid)}));
 app.patch('/api/profile',authorize,(req,res)=>{try{if(sessions.has(req.identity.uid))return res.status(409).json({error:'Hãy về menu trước khi đổi tên hoặc skin.'});res.json(store.edit(req.identity.uid,req.body));}catch(e){res.status(400).json({error:e.message});}});
 app.get('/api/rooms',authorize,(_,res)=>res.json([...rooms.values()].filter(r=>r.arena.isPublic).map(r=>({code:r.arena.code,humans:r.arena.humanCount,bots:10-r.arena.humanCount}))));
 io.use(async(socket,next)=>{try{socket.data.identity=await auth.verify(socket.handshake.auth?.token);store.user(socket.data.identity);next();}catch(e){next(new Error(e.message));}});
 function makeRoom(isPublic){
  if(rooms.size>=64)throw new Error('Máy chủ đã đủ phòng. Vui lòng thử lại.');
  let code;do{code=randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));
  const arena=new Arena(code,{isPublic,onDeath:(snake,info)=>{
   if(snake.bot)return;store.finish(snake.id,snake.peak,snake.kills);const session=sessions.get(snake.id);session?.socket?.emit('died',{...info,score:snake.peak,kills:snake.kills,profile:store.profile(snake.id)});
  }});const room={arena,lastFood:-1};rooms.set(code,room);return room;
 }
 function detach(uid){
  const session=sessions.get(uid);if(!session)return;
  const room=rooms.get(session.code),snake=room?.arena.snakes.get(uid);
  if(snake?.alive)store.finish(uid,snake.peak,snake.kills);
  room?.arena.remove(uid);session.socket?.leave(session.code);sessions.delete(uid);
  if(room&&!room.arena.humanCount)rooms.delete(session.code);
 }
 io.on('connection',socket=>{
  const identity=socket.data.identity,uid=identity.uid;
  socket.on('join',(request={},ack=()=>{})=>{
   try{
    if(!rate('join:'+uid,12))throw new Error('Bạn đổi phòng quá nhanh.');
    const existing=sessions.get(uid);
    if(existing&&existing.socket&&existing.socket.id!==socket.id)throw new Error('Tài khoản này đang chơi trên thiết bị khác. Hãy thoát phòng ở thiết bị đó.');
    if(existing&&existing.until>Date.now()&&rooms.has(existing.code)){
     const room=rooms.get(existing.code);existing.socket=socket;existing.until=0;socket.join(existing.code);ack({ok:true,code:existing.code,id:uid,resumed:true});socket.emit('state',room.arena.snapshot());socket.emit('food',room.arena.foodSnapshot());
     const snake=room.arena.snakes.get(uid);if(snake&&!snake.alive)socket.emit('died',{reason:'collision',score:snake.peak,kills:snake.kills,profile:store.profile(uid)});return;
    }
    if(existing)detach(uid);
    const mode=request.mode;let room;
    if(mode==='join'){
     const code=String(request.code??'').trim().toUpperCase();room=rooms.get(code);if(!room)throw new Error('Không tìm thấy phòng. Kiểm tra lại mã hoặc tạo phòng mới.');
    }else if(mode==='create')room=makeRoom(false);
    else room=[...rooms.values()].find(r=>r.arena.isPublic&&r.arena.humanCount<10)??makeRoom(true);
    const profile=store.profile(uid);room.arena.addHuman(uid,{name:profile.name,skin:profile.skin});
    sessions.set(uid,{socket,code:room.arena.code,until:0});socket.join(room.arena.code);ack({ok:true,code:room.arena.code,id:uid});socket.emit('state',room.arena.snapshot());socket.emit('food',room.arena.foodSnapshot());
   }catch(e){ack({ok:false,error:e.message});}
  });
  socket.on('sync',()=>{if(!rate('sync:'+uid,10,10000))return;const session=sessions.get(uid),room=rooms.get(session?.code);if(session?.socket?.id===socket.id&&room){socket.emit('state',room.arena.snapshot());socket.emit('food',room.arena.foodSnapshot());const s=room.arena.snakes.get(uid);if(s&&!s.alive)socket.emit('died',{reason:'collision',score:s.peak,kills:s.kills,profile:store.profile(uid)});}});
  socket.on('input',data=>{if(!rate('input:'+uid,60,1000))return;const session=sessions.get(uid);if(session?.socket?.id===socket.id)rooms.get(session.code)?.arena.input(uid,data);});
  socket.on('respawn',(_,ack=()=>{})=>{try{if(!rate('respawn:'+uid,8,10000))throw new Error('Thử lại sau một chút.');const session=sessions.get(uid),room=rooms.get(session?.code),s=room?.arena.snakes.get(uid);if(!room||!s||s.alive)throw new Error('Chưa thể chơi lại.');room.arena.spawn(uid,{name:s.name,skin:s.skin});ack({ok:true});}catch(e){ack({ok:false,error:e.message});}});
  socket.on('ping-check',(_,ack=()=>{})=>{if(rate('ping:'+uid,3,1000))ack();});
  socket.on('leave',(_,ack=()=>{})=>{if(sessions.get(uid)?.socket?.id===socket.id)detach(uid);ack({ok:true});});
  socket.on('disconnect',()=>{const session=sessions.get(uid);if(session?.socket?.id!==socket.id)return;session.socket=null;session.until=Date.now()+15000;const s=rooms.get(session.code)?.arena.snakes.get(uid);if(s){s.boost=false;s.targetAngle=s.angle;}});
 });
 let ticks=0;const timer=setInterval(()=>{
  for(const [uid,s]of sessions)if(!s.socket&&s.until<Date.now())detach(uid);
  for(const room of rooms.values()){
   room.arena.step(1/30);
   if(ticks%2===0){io.to(room.arena.code).volatile.emit('state',room.arena.snapshot());if(room.lastFood!==room.arena.revision){io.to(room.arena.code).emit('food',room.arena.foodSnapshot());room.lastFood=room.arena.revision;}}
   if(ticks%150===0)for(const s of room.arena.snakes.values())if(!s.bot&&s.alive)store.progress(s.id,s.peak);
  }
  if(ticks%1800===0)for(const [key,value]of limits)if(value.until<Date.now())limits.delete(key);
  ticks++;
 },1000/30);
 const close=async()=>{clearInterval(timer);for(const uid of [...sessions.keys()])detach(uid);await new Promise(resolve=>io.close(resolve));store.db.close();};
 return {app,http,io,rooms,sessions,store,close};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const server=createGameServer(),port=Number(process.env.PORT??3001);server.http.listen(port,'0.0.0.0',()=>console.log(`Snake backend ready on :${port}`));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{await server.close();process.exit(0);});
}
