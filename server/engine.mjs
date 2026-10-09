import { randomUUID } from 'node:crypto';
export const WORLD=2400, MAX_SNAKES=10, NORMAL_SPEED=145, BOOST_SPEED=245;
const FOOD_TARGET=320, TURN_RATE=3.5, BODY_SPACING=7, START_MASS=24;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const rnd=(a,b)=>a+Math.random()*(b-a);
const BOT_NAMES=['Mây','Mochi','Bơ','Cá Mập','Tí Hon','Nắng','Milo','Bắp','Sushi','Bong Bóng'];
export class Arena {
 constructor(code,{isPublic=false,onDeath=()=>{}}={}){
  this.code=code;this.isPublic=isPublic;this.onDeath=onDeath;this.snakes=new Map();this.food=[];this.foodSeq=0;this.time=0;this.tick=0;this.revision=0;
  this.fillFood();
 }
 get humanCount(){return [...this.snakes.values()].filter(s=>!s.bot).length;}
 spawn(id,{name='Người chơi',skin='mint',bot=false}={}){
  if(!this.snakes.has(id)&&this.snakes.size>=MAX_SNAKES) throw new Error('Phòng đã đủ 10 người.');
  let x,y,angle;
  for(let tries=0;tries<60;tries++){
   x=rnd(180,WORLD-180);y=rnd(180,WORLD-180);angle=rnd(-Math.PI,Math.PI);
   if([...this.snakes.values()].every(s=>!s.alive||s.body.every(p=>dist2(p,{x,y})>150**2)))break;
  }
  const body=Array.from({length:22},(_,i)=>({x:x-Math.cos(angle)*i*BODY_SPACING,y:y-Math.sin(angle)*i*BODY_SPACING}));
  const snake={id,name,skin,bot,x,y,angle,targetAngle:angle,mass:START_MASS,score:0,peak:0,kills:0,alive:true,boost:false,body,shieldUntil:this.time+3,boostDrain:0,respawnAt:0,brainAt:0,speed:NORMAL_SPEED};
  this.snakes.set(id,snake);return snake;
 }
 addHuman(id,options){
  if(this.humanCount>=MAX_SNAKES&&!this.snakes.has(id))throw new Error('Phòng đã đủ 10 người.');
  if(!this.snakes.has(id)&&this.snakes.size>=MAX_SNAKES){const bot=[...this.snakes.values()].filter(s=>s.bot).sort((a,b)=>a.score-b.score)[0];if(bot)this.snakes.delete(bot.id);}
  const result=this.spawn(id,options);this.fillBots();return result;
 }
 remove(id){this.snakes.delete(id);if(this.humanCount)this.fillBots();}
 fillBots(){
  while(this.snakes.size<MAX_SNAKES){const n=this.snakes.size;this.spawn('bot:'+randomUUID(),{name:BOT_NAMES[n%BOT_NAMES.length]+' · AI',skin:['mint','violet','sunset','ocean','rose','lime','gold','rainbow'][n%8],bot:true});}
 }
 input(id,data){
  const s=this.snakes.get(id);if(!s?.alive||!data||typeof data.angle!=='number'||!Number.isFinite(data.angle))return;
  s.targetAngle=Math.atan2(Math.sin(data.angle),Math.cos(data.angle));s.boost=data.boost===true;
 }
 addFood(x=rnd(40,WORLD-40),y=rnd(40,WORLD-40),value=1){
  this.food.push({id:++this.foodSeq,x:clamp(x,15,WORLD-15),y:clamp(y,15,WORLD-15),value,color:Math.floor(rnd(0,7))});this.revision++;
 }
 fillFood(){while(this.food.length<FOOD_TARGET)this.addFood();}
 think(s){
  if(this.time<s.brainAt)return;s.brainAt=this.time+rnd(.12,.25);
  let nearest=null,best=Infinity;
  for(const f of this.food){const d=dist2(s,f);if(d<best){best=d;nearest=f;}}
  let angle=nearest?Math.atan2(nearest.y-s.y,nearest.x-s.x):s.angle;
  if(s.x<130||s.y<130||s.x>WORLD-130||s.y>WORLD-130)angle=Math.atan2(WORLD/2-s.y,WORLD/2-s.x);
  let bestCost=Infinity,choice=angle;
  // Tìm hướng có thức ăn, đồng thời tránh thân đối thủ và mép bản đồ.
  for(const delta of [0,.55,-.55,1.1,-1.1,Math.PI]){
   const candidate=angle+delta, probe={x:s.x+Math.cos(candidate)*100,y:s.y+Math.sin(candidate)*100};
   let cost=Math.abs(angleDiff(candidate,angle))*20+Math.abs(angleDiff(candidate,s.angle))*8;
   if(probe.x<55||probe.y<55||probe.x>WORLD-55||probe.y>WORLD-55)cost+=10000;
   for(const other of this.snakes.values())if(other.id!==s.id&&other.alive){
    for(let i=0;i<other.body.length;i+=3){const d=dist2(probe,other.body[i]);if(d<90**2)cost+=20000/(d+10);}
   }
   if(cost<bestCost){bestCost=cost;choice=candidate;}
  }
  s.targetAngle=choice;s.boost=s.mass>50&&bestCost<25&&best>200**2&&Math.random()<.18;
 }
 kill(s,killer=null,reason='collision'){
  if(!s.alive)return;
  s.alive=false;s.boost=false;s.respawnAt=this.time+2.5;
  if(killer){killer.kills++;}
  for(let i=0;i<s.body.length;i+=3){const p=s.body[i];this.addFood(p.x+rnd(-8,8),p.y+rnd(-8,8),3);}
  this.onDeath(s,{reason,killer:killer?.name??null});
 }
 step(dt=1/30){
  this.time+=dt;this.tick++;
  for(const s of this.snakes.values()){
   if(!s.alive){if(s.bot&&this.time>=s.respawnAt)this.spawn(s.id,{name:s.name,skin:s.skin,bot:true});continue;}
   if(s.bot)this.think(s);
   s.angle+=clamp(angleDiff(s.targetAngle,s.angle),-TURN_RATE*dt,TURN_RATE*dt);
   const boosting=s.boost&&s.mass>START_MASS+2;
   s.speed=boosting?BOOST_SPEED:NORMAL_SPEED;
   s.x+=Math.cos(s.angle)*s.speed*dt;s.y+=Math.sin(s.angle)*s.speed*dt;
   s.body.unshift({x:s.x,y:s.y});
   // Đường đi được lấy mẫu mỗi tick. Giới hạn chiều dài hình học để giữ hiệu năng.
   const length=clamp(150+s.mass*2,150,1600);
   let walked=0,keep=1;
   for(let i=1;i<s.body.length;i++){walked+=Math.sqrt(dist2(s.body[i],s.body[i-1]));keep=i+1;if(walked>=length)break;}
   s.body.length=Math.min(s.body.length,keep);
   if(boosting){s.boostDrain+=dt;if(s.boostDrain>=.18){s.boostDrain=0;s.mass=Math.max(START_MASS,s.mass-1);const tail=s.body.at(-1);this.addFood(tail.x,tail.y);}}
   if(s.x<12||s.y<12||s.x>WORLD-12||s.y>WORLD-12){this.kill(s,null,'boundary');continue;}
  }
  // Dùng tập ứng viên cố định để kết quả va chạm không phụ thuộc thứ tự xóa rắn.
  const active=[...this.snakes.values()].filter(s=>s.alive&&this.time>=s.shieldUntil),deaths=new Map();
  for(const s of active)for(const other of active){
   if(s.id===other.id)continue;
   if(dist2(s,other)<22**2){deaths.set(s.id,{s,killer:null});continue;}
   for(let i=4;i<other.body.length;i+=2){if(dist2(s,other.body[i])<21**2){if(!deaths.has(s.id))deaths.set(s.id,{s,killer:other});break;}}
  }
  for(const {s,killer}of deaths.values())this.kill(s,killer);
  // Thức ăn được nhận một lần; điểm = khối lượng hiện tại, peak là điểm cao nhất trận.
  for(const s of this.snakes.values())if(s.alive){
   for(let i=this.food.length-1;i>=0;i--){if(dist2(s,this.food[i])<23**2){s.mass+=this.food[i].value;this.food.splice(i,1);this.revision++;}}
   s.score=Math.max(0,Math.floor(s.mass-START_MASS));s.peak=Math.max(s.peak,s.score);
  }
  this.fillFood();
  if(this.food.length>700){this.food.splice(0,this.food.length-700);this.revision++;}
 }
 snapshot(){
  const round=n=>Math.round(n*10)/10;
  return {code:this.code,world:WORLD,tick:this.tick,time:this.time,humans:this.humanCount,bots:MAX_SNAKES-this.humanCount,foodRevision:this.revision,
   snakes:[...this.snakes.values()].map(s=>({id:s.id,name:s.name,skin:s.skin,bot:s.bot,alive:s.alive,x:round(s.x),y:round(s.y),angle:round(s.angle),speed:s.speed,boost:s.alive&&s.boost&&s.mass>START_MASS+2,score:s.score,peak:s.peak,kills:s.kills,shield:s.alive&&this.time<s.shieldUntil,body:s.alive?s.body.filter((_,i)=>i%2===0).map(p=>[round(p.x),round(p.y)]):[]}))};
 }
 foodSnapshot(){return this.food.map(f=>[f.id,Math.round(f.x),Math.round(f.y),f.color,f.value]);}
}
