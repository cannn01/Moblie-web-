import { useEffect,useRef,useState,type PointerEvent } from 'react';
import type { Socket } from 'socket.io-client';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { mountGame,type Control } from './game';
import type { Settings,Snapshot,Death,Profile } from './types';
import { music } from './audio';
type Props={socket:Socket;id:string;code:string;settings:Settings;leave:()=>void;onProfile:(p:Profile)=>void};
export default function GameView({socket,id,code,settings,leave,onProfile}:Props){
 const canvas=useRef<HTMLDivElement>(null),control=useRef<Control>({angle:null,boost:false});
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[death,setDeath]=useState<Death|null>(null),[fps,setFPS]=useState(0),[ping,setPing]=useState(0),[online,setOnline]=useState(socket.connected),[error,setError]=useState(''),[stick,setStick]=useState({x:0,y:0}),[boosting,setBoosting]=useState(false),[copied,setCopied]=useState(false);
 const stickPointer=useRef<number|null>(null),boostPointer=useRef<number|null>(null),leaveRef=useRef(leave);leaveRef.current=leave;
 useEffect(()=>{
  if(!canvas.current)return;
  music.setMode('game');const stop=mountGame(canvas.current,socket,id,settings,control.current,setFPS);
  let lastHUD=0;
  const state=(s:Snapshot)=>{if(performance.now()-lastHUD>150){setSnapshot(s);lastHUD=performance.now();}};
  const died=(d:Death)=>{control.current.boost=false;control.current.angle=null;setBoosting(false);setDeath(d);onProfile(d.profile);};
  const connected=()=>{setOnline(true);socket.emit('sync');},disconnected=()=>{setOnline(false);control.current.boost=false;control.current.angle=null;setBoosting(false);};
  socket.on('state',state);socket.on('died',died);socket.on('connect',connected);socket.on('disconnect',disconnected);socket.emit('sync');
  const timer=setInterval(()=>{if(!socket.connected)return;const start=performance.now();socket.timeout(4000).emit('ping-check',{},(err:Error|null)=>{if(!err)setPing(Math.round(performance.now()-start));});},2000);
  const hide=()=>{if(document.hidden){control.current.boost=false;control.current.angle=null;music.pause();}};
  document.addEventListener('visibilitychange',hide);window.addEventListener('blur',hide);
  const nativeHandles:Promise<{remove:()=>Promise<void>}>[]=[];
  if(Capacitor.isNativePlatform()){
   void ScreenOrientation.lock({orientation:'landscape'}).catch(()=>{});
   nativeHandles.push(NativeApp.addListener('appStateChange',({isActive})=>{if(!isActive){control.current.boost=false;control.current.angle=null;music.pause();}else{void music.sync();socket.emit('sync');}}));
   nativeHandles.push(NativeApp.addListener('backButton',()=>leaveRef.current()));
  }
  return ()=>{stop();clearInterval(timer);document.removeEventListener('visibilitychange',hide);window.removeEventListener('blur',hide);socket.off('state',state);socket.off('died',died);socket.off('connect',connected);socket.off('disconnect',disconnected);for(const handle of nativeHandles)void handle.then(h=>h.remove());if(Capacitor.isNativePlatform())void ScreenOrientation.unlock().catch(()=>{});music.setMode('menu');};
 },[socket,id,settings,onProfile]);
 const me=snapshot?.snakes.find(s=>s.id===id),leaders=[...(snapshot?.snakes??[])].filter(s=>s.alive).sort((a,b)=>b.score-a.score).slice(0,10);
 function moveStick(event:PointerEvent<HTMLDivElement>){
  if(stickPointer.current!==event.pointerId)return;
  const box=event.currentTarget.getBoundingClientRect();const dx=event.clientX-(box.left+box.width/2),dy=event.clientY-(box.top+box.height/2),distance=Math.hypot(dx,dy),ratio=distance>40?40/distance:1;
  setStick({x:dx*ratio,y:dy*ratio});if(distance>5)control.current.angle=Math.atan2(dy,dx);
 }
 function releaseStick(event:PointerEvent<HTMLDivElement>){if(stickPointer.current!==event.pointerId)return;stickPointer.current=null;setStick({x:0,y:0});/* Giữ hướng cuối khi nhả joystick. */}
 function stopBoost(event:PointerEvent<HTMLButtonElement>){if(boostPointer.current!==event.pointerId)return;boostPointer.current=null;control.current.boost=false;setBoosting(false);}
 async function copyCode(){try{await navigator.clipboard.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),1500);}catch{setError('Mã phòng: '+code);}}
 function respawn(){socket.timeout(6000).emit('respawn',{},(err:Error|null,result:{ok:boolean;error?:string})=>{if(err||!result?.ok)setError(result?.error??'Không nhận được phản hồi server.');else{setDeath(null);control.current.angle=null;setError('');}});}
 return <div className="game-shell">
  <div ref={canvas} className="game-canvas"/>
  <div className="game-top"><button className="glass exit" onClick={leave}>← Menu</button><div className="glass room-chip"><span>PHÒNG</span><button onClick={copyCode}>{copied?'Đã sao chép':code} ⧉</button><small>{snapshot?.humans??1} người · {snapshot?.bots??9} AI</small></div></div>
  <div className="glass game-score"><span>ĐIỂM CỦA BẠN</span><strong>{me?.score??0}</strong><small>Kỷ lục trận {me?.peak??0} · Hạ {me?.kills??0}</small>{me?.shield&&<small className="shield">✦ Đang được bảo vệ</small>}</div>
  <aside className="glass game-ranking"><h3>♛ BẢNG XẾP HẠNG</h3>{leaders.map((s,i)=><div key={s.id} className={s.id===id?'my-row':''}><span>{i+1}. {s.name}</span><b>{s.score}</b></div>)}</aside>
  <div className="glass game-metrics"><span className={online?'online':'offline'}>● {online?'Online':'Đang kết nối lại…'}</span><span>{ping} ms</span><span>{fps} FPS</span><span className="desktop-hint">{settings.control==='mouse'?'Chuột để lái':'WASD / phím mũi tên'} · Giữ Space / chuột trái để tăng tốc</span></div>
  {settings.touch==='joystick'&&<div className="joystick touch-control" onPointerDown={e=>{if(stickPointer.current!==null)return;stickPointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);moveStick(e);}} onPointerMove={moveStick} onPointerUp={releaseStick} onPointerCancel={releaseStick} onLostPointerCapture={releaseStick} aria-label="Joystick điều khiển"><div style={{transform:`translate(${stick.x}px,${stick.y}px)`}}/></div>}
  <button className={'boost touch-control '+(boosting?'active':'')} onPointerDown={e=>{boostPointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);control.current.boost=true;setBoosting(true);}} onPointerUp={stopBoost} onPointerCancel={stopBoost} onLostPointerCapture={stopBoost}>ϟ<span>TĂNG TỐC</span></button>
  {!online&&<div className="reconnect-banner">Đang nối lại phòng. Rắn vẫn di chuyển trên server; giữ chỗ 15 giây.</div>}
  {error&&<button className="toast" onClick={()=>setError('')}>{error}</button>}
  {death&&<div className="overlay"><section className="panel death-panel"><span className="eyebrow">MỘT VÒNG CHƠI MỚI?</span><h2>Hẹn gặp ở đấu trường!</h2><p>{death.reason==='boundary'?'Bạn đã chạm biên bản đồ.':death.killer?'Bạn đâm vào rắn '+death.killer+'.':'Bạn đã va chạm với rắn khác.'}</p><div className="death-stats"><div><strong>{death.score}</strong><span>ĐIỂM CAO NHẤT TRẬN</span></div><div><strong>{death.kills}</strong><span>RẮN ĐÃ HẠ</span></div></div><p>Kỷ lục tài khoản: <b>{death.profile.best}</b></p><button className="primary" onClick={respawn} disabled={!online}>▶ Chơi lại cùng phòng</button><button className="secondary" onClick={leave}>Về menu</button></section></div>}
  <div className="rotate-hint"><span>↻</span><h2>Xoay ngang để chơi</h2><p>Không gian rộng hơn, điều khiển dễ hơn.</p><button className="secondary" onClick={leave}>Về menu</button></div>
 </div>;
}
