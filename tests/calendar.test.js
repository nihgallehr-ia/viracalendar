import test from 'node:test';import assert from 'node:assert/strict';import {monthDays,shiftMonth,monthRange,localISO,countByDate,statusCounts,cleanFilename} from '../src/calendar.js';
test('calendário de outubro de 2026',()=>{const days=monthDays(2026,9);assert.equal(days.length,35);assert.equal(days.indexOf('2026-10-01'),4);assert.equal(days.filter(Boolean).length,31)});
test('transição de ano',()=>{assert.deepEqual(shiftMonth(2026,11,1),{year:2027,month:0});assert.deepEqual(monthRange(2026,11),{start:'2026-12-01',end:'2027-01-01'})});
test('agrupa e calcula status',()=>{const rows=[{scheduled_date:'2026-10-20',status:'planned'},{scheduled_date:'2026-10-20',status:'posted'}];assert.equal(countByDate(rows)['2026-10-20'].length,2);assert.deepEqual(statusCounts(rows),{total:2,posted:1,planned:1})});
test('data local evita conversão UTC',()=>{assert.equal(localISO(new Date(2026,9,20)), '2026-10-20');assert.equal(cleanFilename('Meu_video-1.mp4'),'Meu video 1')});
