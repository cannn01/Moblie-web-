export type Skin={id:string;name:string;colors:string[];required:number};
export type Profile={uid:string;name:string;skin:string;best:number;games:number;kills:number;guest:boolean;unlocked:string[];history?:{score:number;kills:number;created_at:string}[]};
export type Snake={id:string;name:string;skin:string;bot:boolean;alive:boolean;x:number;y:number;angle:number;speed:number;boost:boolean;score:number;peak:number;kills:number;shield:boolean;body:[number,number][]};
export type Snapshot={code:string;world:number;tick:number;time:number;humans:number;bots:number;snakes:Snake[];foodRevision:number};
export type Food=[number,number,number,number,number];
export type Death={reason:string;killer?:string;score:number;kills:number;profile:Profile};
export type Settings={music:boolean;volume:number;control:'mouse'|'keyboard';quality:'high'|'low';touch:'joystick'|'follow'};
export const SKINS:Skin[]=[
{id:'mint',name:'Ngọc lam',colors:['#20dec0','#009f98'],required:0},
{id:'violet',name:'Tử tinh',colors:['#c55dff','#7932ce'],required:0},
{id:'sunset',name:'Hoàng hôn',colors:['#ffb543','#ff663f'],required:100},
{id:'ocean',name:'Đại dương',colors:['#5bd6ff','#2870e6'],required:300},
{id:'rose',name:'Hoa hồng',colors:['#ff82b7','#db347e'],required:600},
{id:'lime',name:'Lá xanh',colors:['#cbf84e','#69c234'],required:1000},
{id:'gold',name:'Hoàng kim',colors:['#ffe66b','#d49727'],required:2000},
{id:'rainbow',name:'Cầu vồng',colors:['#ff5365','#ffa43b','#ffe256','#86d444','#24c6be','#477eff','#be5aff'],required:4000}];
