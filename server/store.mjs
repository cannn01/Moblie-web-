import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SKINS,cleanName,skinAllowed } from './catalog.mjs';
export function createStore(directory){
 mkdirSync(directory,{recursive:true});const db=new DatabaseSync(join(directory,'snake.sqlite'));
 db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS users(uid TEXT PRIMARY KEY,name TEXT NOT NULL,skin TEXT NOT NULL DEFAULT 'mint',best INTEGER NOT NULL DEFAULT 0,games INTEGER NOT NULL DEFAULT 0,kills INTEGER NOT NULL DEFAULT 0,guest INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS runs(id INTEGER PRIMARY KEY AUTOINCREMENT,uid TEXT,score INTEGER,kills INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
 const read=db.prepare('SELECT * FROM users WHERE uid=?');
 return {
  db,
  user(identity){db.prepare('INSERT OR IGNORE INTO users(uid,name,guest) VALUES(?,?,?)').run(identity.uid,cleanName(identity.name),identity.guest?1:0);return this.profile(identity.uid);},
  profile(uid){const row=read.get(uid);return row?{...row,guest:!!row.guest,unlocked:SKINS.filter(s=>skinAllowed(s.id,row.best)).map(s=>s.id)}:null;},
  edit(uid,{name,skin}){const old=this.profile(uid);if(!old)throw new Error('Không tìm thấy tài khoản.');if(!skinAllowed(skin,old.best))throw new Error('Skin chưa được mở khóa.');db.prepare('UPDATE users SET name=?,skin=? WHERE uid=?').run(cleanName(name),skin,uid);return this.profile(uid);},
  progress(uid,score){db.prepare('UPDATE users SET best=MAX(best,?) WHERE uid=?').run(Math.max(0,Math.floor(score)),uid);},
  finish(uid,score,kills){db.prepare('UPDATE users SET best=MAX(best,?),games=games+1,kills=kills+? WHERE uid=?').run(Math.max(0,Math.floor(score)),Math.max(0,Math.floor(kills)),uid);db.prepare('INSERT INTO runs(uid,score,kills) VALUES(?,?,?)').run(uid,score,kills);db.prepare('DELETE FROM runs WHERE uid=? AND id NOT IN (SELECT id FROM runs WHERE uid=? ORDER BY id DESC LIMIT 20)').run(uid,uid);},
  history(uid){return db.prepare('SELECT score,kills,created_at FROM runs WHERE uid=? ORDER BY id DESC LIMIT 10').all(uid);},
  leaders(){return db.prepare('SELECT name,skin,best,games FROM users WHERE guest=0 ORDER BY best DESC LIMIT 20').all();}
 };
}
