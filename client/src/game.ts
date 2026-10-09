import Phaser from 'phaser';
import type { Socket } from 'socket.io-client';
import { SKINS,type Settings,type Snapshot,type Food,type Snake } from './types';
export type Control={angle:number|null;boost:boolean};
type RenderSnake={segments:Phaser.GameObjects.Image[];eyes:Phaser.GameObjects.Graphics;label:Phaser.GameObjects.Text;halo:Phaser.GameObjects.Arc;angle:number};
export function mountGame(parent:HTMLElement,socket:Socket,id:string,settings:Settings,control:Control,onFPS:(fps:number)=>void){
 let latest:Snapshot|null=null,food:Food[]=[],foodChanged=true,received=0;
 const state=(s:Snapshot)=>{latest=s;received=performance.now();};const foods=(f:Food[])=>{food=f;foodChanged=true;};socket.on('state',state);socket.on('food',foods);
 class ArenaScene extends Phaser.Scene{
  renderSnakes=new Map<string,RenderSnake>();foodSprites=new Map<number,Phaser.GameObjects.Image>();
  pointerAngle:number|null=null;lastSend=0;lastFPS=0;keys!:Record<string,Phaser.Input.Keyboard.Key>;map!:Phaser.GameObjects.TileSprite;edge!:Phaser.GameObjects.Graphics;
  constructor(){super('Arena');}
  create(){
   this.cameras.main.setBackgroundColor('#80b9cb');this.cameras.main.setBounds(0,0,2400,2400);
   // Texture cache: vẽ mỗi màu một lần; gameplay chỉ di chuyển sprite.
   const palettes=new Set(SKINS.flatMap(s=>s.colors));for(const color of palettes){
    const key='orb'+color;if(this.textures.exists(key))continue;
    const tex=this.textures.createCanvas(key,64,64)!;const c=tex.context;
    const gradient=c.createRadialGradient(23,18,2,32,32,27);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.24,color);gradient.addColorStop(.8,color);gradient.addColorStop(1,'#294b67');
    c.fillStyle=gradient;c.beginPath();c.arc(32,32,27,0,Math.PI*2);c.fill();c.fillStyle='#ffffff30';c.beginPath();c.ellipse(24,20,12,6,-.6,0,Math.PI*2);c.fill();tex.refresh();
   }
   const tile=this.textures.createCanvas('hex',192,166)!;const c=tile.context;c.fillStyle='#80b9cb';c.fillRect(0,0,192,166);
   for(const [cx,cy]of [[48,42],[144,42],[0,125],[96,125],[192,125]]){
    c.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i;const x=cx+Math.cos(a)*45,y=cy+Math.sin(a)*45;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fillStyle='#b2e4e322';c.fill();c.strokeStyle='#d5ffff24';c.lineWidth=1.5;c.stroke();
   }tile.refresh();this.map=this.add.tileSprite(1200,1200,2400,2400,'hex').setDepth(-10);
   this.edge=this.add.graphics().setDepth(-9);this.edge.lineStyle(12,0x38768c,1);this.edge.strokeRect(0,0,2400,2400);
   const keyboard=this.input.keyboard;
   if(keyboard){this.keys=keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE')as Record<string,Phaser.Input.Keyboard.Key>;keyboard.addCapture(['UP','DOWN','LEFT','RIGHT','SPACE']);}
   this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{
    if(!latest)return;
    if(p.wasTouch&&settings.touch!=='follow')return;
    if(!p.wasTouch&&settings.control!=='mouse')return;
    const me=this.renderSnakes.get(id)?.segments[0];if(!me)return;const point=this.cameras.main.getWorldPoint(p.x,p.y);this.pointerAngle=Math.atan2(point.y-me.y,point.x-me.x);
   });
   this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(!p.wasTouch&&p.leftButtonDown())control.boost=true;});
   this.input.on('pointerup',()=>{control.boost=false;});
   this.game.events.on('blur',()=>{control.boost=false;control.angle=null;});
  }
  buildSnake(s:Snake){
   const result:RenderSnake={segments:[],eyes:this.add.graphics().setDepth(100),label:this.add.text(s.x,s.y-34,s.name,{fontFamily:'Arial',fontSize:'17px',color:'#ffffff',stroke:'#31586e',strokeThickness:4}).setOrigin(.5).setDepth(102),halo:this.add.circle(s.x,s.y,21,0xffffff,.12).setStrokeStyle(2,0xffffff,.7).setDepth(101),angle:s.angle};
   this.renderSnakes.set(s.id,result);return result;
  }
  update(time:number,delta:number){
   if(!latest)return;
   const snap=latest,me=snap.snakes.find(s=>s.id===id),camera=this.cameras.main;
   const mobile=window.matchMedia('(pointer:coarse)').matches;
   const zoom=Math.max(.45,Math.min(1.1,Math.min(this.scale.width/1100,this.scale.height/650)));
   camera.setZoom(zoom);
   if(foodChanged){
    const ids=new Set(food.map(f=>f[0]));for(const [key,sprite]of this.foodSprites)if(!ids.has(key)){sprite.destroy();this.foodSprites.delete(key);}
    const colors=SKINS.find(s=>s.id==='rainbow')!.colors;
    for(const f of food)if(!this.foodSprites.has(f[0]))this.foodSprites.set(f[0],this.add.image(f[1],f[2],'orb'+colors[f[3]%colors.length]).setDisplaySize(f[4]>1?17:12,f[4]>1?17:12).setDepth(-1));
    foodChanged=false;
   }
   const ids=new Set(snap.snakes.filter(s=>s.alive).map(s=>s.id));
   for(const [key,r]of this.renderSnakes)if(!ids.has(key)){for(const sprite of r.segments)sprite.destroy();r.eyes.destroy();r.label.destroy();r.halo.destroy();this.renderSnakes.delete(key);}
   for(const s of snap.snakes){
    if(!s.alive)continue;const r=this.renderSnakes.get(s.id)??this.buildSnake(s);const palette=SKINS.find(k=>k.id===s.skin)??SKINS[0];
    // Nội suy đường thân theo các bản cập nhật server, dự đoán đầu tối đa 100 ms.
    const ahead=Math.min(.1,Math.max(0,(performance.now()-received)/1000));
    const targetHead={x:s.x+Math.cos(s.angle)*s.speed*ahead,y:s.y+Math.sin(s.angle)*s.speed*ahead};
    const points=s.body.length?s.body:[[s.x,s.y]];
    while(r.segments.length<points.length){const i=r.segments.length;r.segments.push(this.add.image(points[i][0],points[i][1],'orb'+palette.colors[i%palette.colors.length]).setDisplaySize(29,29));}
    while(r.segments.length>points.length)r.segments.pop()!.destroy();
    const alpha=1-Math.exp(-delta/45);
    for(let i=points.length-1;i>=0;i--){const sprite=r.segments[i];const x=i?points[i][0]:targetHead.x,y=i?points[i][1]:targetHead.y;sprite.x=Phaser.Math.Linear(sprite.x,x,alpha);sprite.y=Phaser.Math.Linear(sprite.y,y,alpha);sprite.setDepth(20-i*.01);sprite.setAlpha(s.shield?.72:1);sprite.setVisible(settings.quality==='high'||i%2===0||i===0);sprite.setDisplaySize(settings.quality==='low'&&i?33:29,settings.quality==='low'&&i?33:29);}
    const head=r.segments[0];const visualAngle=s.id===id?(control.angle??this.pointerAngle??s.angle):s.angle;
    r.angle+=Phaser.Math.Angle.Wrap(visualAngle-r.angle)*(1-Math.exp(-delta/70));
    r.eyes.clear();const dx=Math.cos(r.angle),dy=Math.sin(r.angle);
    for(const side of [-1,1]){const ex=head.x+dx*6-dy*side*7,ey=head.y+dy*6+dx*side*7;r.eyes.fillStyle(0xfff7bf,1);r.eyes.fillCircle(ex,ey,6);r.eyes.fillStyle(0x173143,1);r.eyes.fillCircle(ex+dx*2,ey+dy*2,3.5);r.eyes.fillStyle(0xffffff,1);r.eyes.fillCircle(ex+dx*2-1,ey+dy*2-1,1);}
    r.label.setPosition(head.x,head.y-32);r.halo.setPosition(head.x,head.y);r.halo.setVisible(s.shield||s.boost);r.halo.setRadius(s.shield?22:19);
   }
   const myHead=this.renderSnakes.get(id)?.segments[0];
   if(myHead){const cx=myHead.x-camera.width/(2*zoom),cy=myHead.y-camera.height/(2*zoom);camera.scrollX=Phaser.Math.Linear(camera.scrollX,cx,1-Math.exp(-delta/70));camera.scrollY=Phaser.Math.Linear(camera.scrollY,cy,1-Math.exp(-delta/70));}
   if(time-this.lastSend>40&&socket.connected&&me?.alive){
    let angle=control.angle??me.angle;
    if(!mobile&&settings.control==='keyboard'&&this.keys){const k=this.keys;const x=Number(k.D.isDown||k.RIGHT.isDown)-Number(k.A.isDown||k.LEFT.isDown),y=Number(k.S.isDown||k.DOWN.isDown)-Number(k.W.isDown||k.UP.isDown);if(x||y){angle=Math.atan2(y,x);this.pointerAngle=angle;}else angle=this.pointerAngle??me.angle;}
    else angle=control.angle??this.pointerAngle??me.angle;
    socket.emit('input',{angle,boost:control.boost||!!this.keys?.SPACE?.isDown});this.lastSend=time;
   }
   if(time-this.lastFPS>1000){onFPS(Math.round(this.game.loop.actualFps));this.lastFPS=time;}
  }
 }
 const game=new Phaser.Game({type:Phaser.AUTO,parent,backgroundColor:'#80b9cb',scale:{mode:Phaser.Scale.RESIZE,width:parent.clientWidth,height:parent.clientHeight,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:settings.quality==='high',roundPixels:false,powerPreference:'high-performance'},fps:{target:60},scene:ArenaScene,input:{activePointers:3},audio:{noAudio:true}});
 return ()=>{socket.off('state',state);socket.off('food',foods);game.destroy(true);};
}
