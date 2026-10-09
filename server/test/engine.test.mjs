import test from 'node:test';
import assert from 'node:assert/strict';
import { Arena,NORMAL_SPEED,BOOST_SPEED } from '../engine.mjs';
const setup=()=>new Arena('TEST');
test('ten total snakes: a human replaces a bot and eleventh human is rejected',()=>{
 const a=setup();a.addHuman('p1');assert.equal(a.snakes.size,10);assert.equal(a.humanCount,1);
 for(let i=2;i<=10;i++)a.addHuman('p'+i);
 assert.equal(a.snakes.size,10);assert.equal(a.humanCount,10);assert.throws(()=>a.addHuman('p11'),/10/);
 a.remove('p2');assert.equal(a.snakes.size,10);assert.equal(a.humanCount,9);
});
test('food is awarded once; boost consumes mass but keeps the run peak',()=>{
 const a=setup(),s=a.spawn('p');a.fillFood=()=>{};s.x=800;s.y=800;s.angle=0;s.targetAngle=0;s.body=[{x:800,y:800},{x:790,y:800}];a.food=[];a.addFood(805,800,50);
 a.step();assert.equal(s.score,50);assert.equal(s.peak,50);assert.equal(s.mass,74);
 a.food=[];s.boost=true;for(let i=0;i<7;i++)a.step();assert.equal(s.speed,BOOST_SPEED);assert.ok(s.mass<74);assert.equal(s.peak,50);
 s.mass=24;a.step();assert.equal(s.speed,NORMAL_SPEED);
});
test('head into another body dies, head to head kills both, shield protects spawn',()=>{
 let died=[];const a=new Arena('X',{onDeath:s=>died.push(s.id)}),p=a.spawn('p'),q=a.spawn('q');
 a.time=10;p.shieldUntil=0;q.shieldUntil=0;p.x=400;p.y=400;p.angle=0;p.targetAngle=0;p.body=[{x:400,y:400}];q.x=900;q.y=900;q.mass=1000;q.body=Array.from({length:20},(_,i)=>({x:405,y:400+i*.1}));
 a.step();assert.equal(p.alive,false);assert.equal(q.kills,1);assert.ok(a.food.some(f=>f.value===3));
 const b=setup(),s=b.spawn('s'),t=b.spawn('t');b.time=5;for(const snake of [s,t]){snake.shieldUntil=0;snake.x=700;snake.y=700;snake.angle=0;snake.targetAngle=0;snake.body=[{x:700,y:700}];}b.step();assert.equal(s.alive,false);assert.equal(t.alive,false);
 const c=setup(),u=c.spawn('u'),v=c.spawn('v');for(const snake of [u,v]){snake.x=800;snake.y=800;snake.angle=0;snake.targetAngle=0;}c.step();assert.ok(u.alive&&v.alive);
});
test('invalid input is ignored and boundary ends a run once',()=>{
 let calls=0;const a=new Arena('X',{onDeath:()=>calls++}),s=a.spawn('s');const before=s.targetAngle;a.input('s',{angle:NaN,boost:true});assert.equal(s.targetAngle,before);a.input('s',{angle:Infinity});assert.equal(s.targetAngle,before);s.x=2;s.angle=Math.PI;s.targetAngle=Math.PI;a.step();a.step();assert.equal(calls,1);assert.equal(s.alive,false);
});
