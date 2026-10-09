export const SKINS = [
 {id:'mint',name:'Ngọc lam',colors:['#20dec0','#009f98'],required:0},
 {id:'violet',name:'Tử tinh',colors:['#c55dff','#7932ce'],required:0},
 {id:'sunset',name:'Hoàng hôn',colors:['#ffb543','#ff663f'],required:100},
 {id:'ocean',name:'Đại dương',colors:['#5bd6ff','#2870e6'],required:300},
 {id:'rose',name:'Hoa hồng',colors:['#ff82b7','#db347e'],required:600},
 {id:'lime',name:'Lá xanh',colors:['#cbf84e','#69c234'],required:1000},
 {id:'gold',name:'Hoàng kim',colors:['#ffe66b','#d49727'],required:2000},
 {id:'rainbow',name:'Cầu vồng',colors:['#ff5365','#ffa43b','#ffe256','#86d444','#24c6be','#477eff','#be5aff'],required:4000}
];
export const skinAllowed=(id,best)=>SKINS.some(s=>s.id===id&&s.required<=best);
export function cleanName(value){ return String(value??'Người chơi').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,20)||'Người chơi'; }
