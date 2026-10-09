import type { Settings } from './types';
class Music {
 tracks={menu:new Audio('/audio/nhac_nen.mp3'),game:new Audio('/audio/nhac_trong_tran.mp3')};
 mode:'menu'|'game'='menu';unlocked=false;enabled=true;volume=.35;
 constructor(){for(const a of Object.values(this.tracks)){a.loop=true;a.preload='auto';}document.addEventListener('visibilitychange',()=>this.sync());}
 unlock(){this.unlocked=true;void this.sync();}
 configure(settings:Settings){this.enabled=settings.music;this.volume=settings.volume;void this.sync();}
 setMode(mode:'menu'|'game'){if(this.mode!==mode){this.tracks[this.mode].pause();this.tracks[this.mode].currentTime=0;this.mode=mode;}void this.sync();}
 async sync(){for(const [key,a]of Object.entries(this.tracks)){a.volume=this.volume;if(!this.unlocked||!this.enabled||document.hidden||key!==this.mode)a.pause();else await a.play().catch(()=>{});}}
 pause(){for(const a of Object.values(this.tracks))a.pause();}
}
export const music=new Music();
