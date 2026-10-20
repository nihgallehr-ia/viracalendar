export const pad = n => String(n).padStart(2,'0');
export function localISO(date=new Date()){return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());}
export function monthDays(year,month){const days=new Date(year,month+1,0).getDate(),offset=new Date(year,month,1).getDay();return Array.from({length:Math.ceil((days+offset)/7)*7},(_,i)=>{const day=i-offset+1;return day>=1&&day<=days?year+'-'+pad(month+1)+'-'+pad(day):null;});}
export function shiftMonth(year,month,shift){const date=new Date(year,month+shift,1);return {year:date.getFullYear(),month:date.getMonth()};}
export function monthRange(year,month){return {start:year+'-'+pad(month+1)+'-01',end:localISO(new Date(year,month+1,1))};}
export function countByDate(items){return items.reduce((counts,item)=>{(counts[item.scheduled_date]??=[]).push(item);return counts;},{});}
export function statusCounts(items){return {total:items.length,posted:items.filter(x=>x.status==='posted').length,planned:items.filter(x=>x.status!=='posted').length};}
export function cleanFilename(name){return (name||'Vídeo').replace(/\.[^/.]+$/,'').replace(/[\-_]+/g,' ').trim().slice(0,120)||'Vídeo';}
export function humanBytes(bytes){return bytes>=1048576?(bytes/1048576).toFixed(1)+' MB':(bytes/1024).toFixed(0)+' KB';}
