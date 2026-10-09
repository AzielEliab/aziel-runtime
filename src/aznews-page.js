/**
 * GET /aznews — AZNews + 4DMap globe (AZNEWS-LIVE-1.0).
 * Data comes through the runtime FragGate door (POST /v1/fraggate/call, slug 4dmap,
 * news_* ops). Orthographic canvas globe, colored pins (several types on one spot are
 * offset, never hidden), era slider (+-3 years on the event date), last 10 pins added
 * with permalinks (?pin=<id> flies to and opens the pin), news / weather / sky panels,
 * and a color key at the bottom. Land outline: world-atlas land-110m (Natural Earth,
 * public domain) from jsDelivr; the globe still draws pins and graticule without it.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { PIN_COLORS, MATCH_SPEC, BLACK_RULE, WHITE_RULE } from "./engines/4dmap/aznews-pins.js";

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

export function aznewsPageHtml() {
  const key = Object.entries(PIN_COLORS)
    .map(([type, c]) => `<li><span class="sw" style="background:${c.hex}"></span><b>${esc(c.color.toUpperCase())}</b> <code>${esc(type)}</code> ${esc(c.label)}</li>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AZNews + 4DMap globe · Aziel Runtime</title>
<meta name="description" content="Real news from top global outlets, global weather, and computed sky (zodiac, constellations, seasons), pinned on the 4DMap globe with dual-lattice receipts. Author: Aziel Eliab.">
<style>
body{margin:0;background:#0d0f14;color:#e8e6e1;font:15px/1.45 system-ui,sans-serif}
header,main,footer{max-width:1200px;margin:0 auto;padding:12px 16px}
h1{font-size:22px;margin:6px 0}h2{font-size:17px;margin:10px 0 6px}
a{color:#8ab4ff}.muted{color:#9aa0a6}.grid{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:14px}
@media(max-width:860px){.grid{grid-template-columns:1fr}}
.card{background:#151922;border:1px solid #262c38;border-radius:10px;padding:12px;margin-bottom:12px}
canvas{width:100%;max-width:640px;aspect-ratio:1;display:block;margin:0 auto;cursor:grab;touch-action:none}
.sw{display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid #888;vertical-align:middle;margin-right:4px}
ul{padding-left:18px;margin:4px 0}li{margin:3px 0}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{border-bottom:1px solid #262c38;padding:3px 5px;text-align:left}
.flags code{background:#222838;padding:1px 5px;border-radius:4px;margin-right:4px}
#detail{white-space:pre-wrap;font-size:13px;max-height:340px;overflow:auto}
.key li{list-style:none}
</style></head><body>
<header><h1>AZNews + 4DMap globe</h1>
<p class="muted">Real headlines from the cited top-50 outlets (official public RSS), Open-Meteo weather for every continent and ocean, and the sky computed with astronomy-engine. Every report, pin, pull receipt and view receipt sits on the primary and secondary hash lattices. Data comes through the runtime FragGate door (<code>POST /v1/fraggate/call</code>, slug <code>4dmap</code>). Author: Aziel Eliab.</p>
<div class="flags" id="flags">Loading status…</div></header>
<main><div class="grid"><div>
<div class="card"><canvas id="globe" width="640" height="640" aria-label="4DMap globe with colored pins"></canvas>
<label>Era <b id="eraLabel">all</b> (±3 years on the event date) <input id="era" type="range" min="1900" max="2030" value="2030" step="1" style="width:60%"> <button id="eraAll" type="button">All eras</button></label>
<p class="muted" id="globeNote">Drag to rotate. Click a pin to open it. Several pins on one spot are fanned out so none is hidden.</p></div>
<div class="card"><h2>Pin</h2><div id="detail" class="muted">Select a pin, or open a link from “Last 10 pins added”.</div></div>
</div><div>
<div class="card"><h2>Last 10 pins added</h2><ol id="last10"><li class="muted">Loading…</li></ol></div>
<div class="card"><h2>Sky now</h2><div id="sky" class="muted">Loading…</div></div>
<div class="card"><h2>Latest headlines</h2><ul id="news"><li class="muted">Loading…</li></ul></div>
</div></div>
<div class="card"><h2>Global weather</h2><div id="weather" class="muted">Loading…</div></div>
</main>
<footer><div class="card key"><h2>Color key</h2><ul>${key}</ul>
<p class="muted">Correspondence rule ${esc(MATCH_SPEC)}: BLACK needs ≥${BLACK_RULE.min_shared} shared salient entities, Jaccard ≥ ${BLACK_RULE.min_jaccard}, ≤ ${BLACK_RULE.max_km} km and ≤ ${BLACK_RULE.max_years} years apart, from different sources. WHITE is a candidate (≥${WHITE_RULE.min_shared} shared, ≤ ${WHITE_RULE.max_km} km, ≤ ${WHITE_RULE.max_years} years) that did not pass BLACK; it is never promoted without the BLACK rule passing. Blue report locations come from the dateline in the item text (report_location_source: dateline). When the text has no dateline, the outlet headquarters is used and labeled report_location_source: outlet_hq. Never from who filed it. Pins are permanent and append-only.</p>
<p class="muted">JSON: <a href="/v1/aznews">/v1/aznews</a> · <a href="/v1/aznews/pins">pins</a> · <a href="/v1/aznews/feed">feed</a> · <a href="/v1/aznews/weather">weather</a> · <a href="/v1/aznews/sky">sky</a> · <a href="/v1/aznews/verify">verify</a>. Weather data by Open-Meteo.com. Gazetteer GeoNames (CC BY 4.0).</p></div></footer>
<script>
(function(){
const COLORS=${JSON.stringify(Object.fromEntries(Object.entries(PIN_COLORS).map(([k, v]) => [k, v.hex])))};
const fg=(op,payload)=>fetch('/v1/fraggate/call',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug:'4dmap',op,payload:Object.assign({via:'page:/aznews'},payload||{})})}).then(r=>r.json()).then(j=>{return (j&&j.result)||j;});
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let pins=[],land=null,rot=[-20,-20],era=null,sel=null,drawn=[];
const cv=$('globe'),cx=cv.getContext('2d'),W=cv.width,R=W/2-8;
function proj(lon,lat){const l=(lon+rot[0])*Math.PI/180,p=lat*Math.PI/180,p0=-rot[1]*Math.PI/180;
const x=Math.cos(p)*Math.sin(l),y=Math.cos(p0)*Math.sin(p)-Math.sin(p0)*Math.cos(p)*Math.cos(l),z=Math.sin(p0)*Math.sin(p)+Math.cos(p0)*Math.cos(p)*Math.cos(l);
return z<0?null:[W/2+R*x,W/2-R*y];}
function line(pts){let pen=false;cx.beginPath();for(const [lo,la] of pts){const q=proj(lo,la);if(!q){pen=false;continue;}if(!pen){cx.moveTo(q[0],q[1]);pen=true;}else cx.lineTo(q[0],q[1]);}cx.stroke();}
function draw(){cx.clearRect(0,0,W,W);cx.fillStyle='#0b2236';cx.beginPath();cx.arc(W/2,W/2,R,0,7);cx.fill();
cx.strokeStyle='#1d3a55';cx.lineWidth=0.6;for(let lo=-180;lo<180;lo+=30){const a=[];for(let la=-90;la<=90;la+=3)a.push([lo,la]);line(a);}for(let la=-60;la<=60;la+=30){const a=[];for(let lo=-180;lo<=180;lo+=3)a.push([lo,la]);line(a);}
if(land){cx.strokeStyle='#7b8a6a';cx.lineWidth=0.8;for(const ring of land)line(ring);}
drawn=[];const groups={};for(const p of pins){if(!p.geo||(era!=null&&!(p.era&&Math.abs(p.era.year-era)<=3)))continue;const k=p.geo.lat.toFixed(2)+','+p.geo.lon.toFixed(2);(groups[k]=groups[k]||[]).push(p);}
for(const k in groups){const g=groups[k];g.forEach((p,i)=>{const q=proj(p.geo.lon,p.geo.lat);if(!q)return;const a=i*2*Math.PI/g.length,o=g.length>1?7:0;const x=q[0]+o*Math.cos(a),y=q[1]+o*Math.sin(a);
cx.fillStyle=COLORS[p.pin_type]||'#ccc';cx.strokeStyle=sel&&sel.pin_id===p.pin_id?'#ffeb3b':'#000';cx.lineWidth=sel&&sel.pin_id===p.pin_id?3:1;cx.beginPath();cx.arc(x,y,5,0,7);cx.fill();cx.stroke();drawn.push({x,y,p});});}}
function topo(t){const o=t.objects.land,sc=t.transform.scale,tr=t.transform.translate;const arcs=t.arcs.map(a=>{let x=0,y=0;return a.map(([dx,dy])=>{x+=dx;y+=dy;return [x*sc[0]+tr[0],y*sc[1]+tr[1]];});});
const ring=r=>{let out=[];for(const i of r){const a=i<0?arcs[~i].slice().reverse():arcs[i];out=out.concat(a);}return out;};const rings=[];
for(const g of (o.geometries||[o])){const polys=g.type==='Polygon'?[g.arcs]:g.type==='MultiPolygon'?g.arcs:[];for(const p of polys)for(const r of p)rings.push(ring(r));}return rings;}
fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json').then(r=>r.json()).then(t=>{land=topo(t);draw();}).catch(()=>{$('globeNote').textContent+=' (Land outline did not load; pins and graticule still show.)';});
let drag=null;cv.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY,rot[0],rot[1],false];cv.setPointerCapture(e.pointerId);});
cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag[0],dy=e.clientY-drag[1];if(Math.abs(dx)+Math.abs(dy)>3)drag[4]=true;rot=[drag[2]+dx*0.4,Math.max(-89,Math.min(89,drag[3]-dy*0.4))];draw();});
cv.addEventListener('pointerup',e=>{const moved=drag&&drag[4];drag=null;if(moved)return;const b=cv.getBoundingClientRect(),x=(e.clientX-b.left)*W/b.width,y=(e.clientY-b.top)*W/b.height;let best=null,bd=144;for(const d of drawn){const dd=(d.x-x)**2+(d.y-y)**2;if(dd<bd){bd=dd;best=d.p;}}if(best)openPin(best.pin_id,true);});
function fly(lon,lat){const from=rot.slice(),to=[-lon,-lat],t0=performance.now();(function step(t){const k=Math.min(1,(t-t0)/700);rot=[from[0]+(to[0]-from[0])*k,from[1]+(to[1]-from[1])*k];draw();if(k<1)requestAnimationFrame(step);})(t0);}
function openPin(id,push){fg('news_pin_open',{pin_id:id}).then(b=>{if(!b||!b.ok){$('detail').textContent='Pin '+id+' is not stored.';return;}sel=b.pin;if(push)history.replaceState(null,'','?pin='+encodeURIComponent(id));if(b.pin.geo)fly(b.pin.geo.lon,b.pin.geo.lat);else draw();
const r=b.report||{};const lines=[(b.pin.color||'').toUpperCase()+' '+b.pin.pin_type+' · '+b.pin.pin_id,'Event: '+b.pin.event,'Date: '+(b.pin.date||'null ('+(b.pin.date_reason||'')+')')+(b.pin.era?' · era '+b.pin.era.decade:''),'Place: '+(b.pin.geo?(b.pin.geo.name||'')+' ('+b.pin.geo.lat+', '+b.pin.geo.lon+') '+(b.pin.geo.precision||'')+(b.pin.report_location_source?' · report_location_source: '+b.pin.report_location_source:''):'null · '+(b.pin.geo_reason||'')),'Report seq '+b.pin.report_seq+' · pull receipt seq '+b.pin.pull_receipt_seq,'Lattice primary '+b.pin.lattice.primary.slice(0,16)+'… secondary '+b.pin.lattice.secondary.slice(0,16)+'…'];
if(b.pin.match)lines.push('Match: '+b.pin.match.level+' · shared '+b.pin.match.shared.join(', ')+' · '+b.pin.match.distance_km+' km · '+b.pin.match.years_apart+' y');
if(r.title)lines.push('','['+r.outlet+'] '+r.title,r.link||'','Score '+(r.score&&r.score.value)+' ('+(r.score&&r.score.state)+') · full_text '+r.full_text,'',String(r.wording||'').slice(0,1200));
if(b.view_receipts&&b.view_receipts[0]){const v=b.view_receipts[0];lines.push('',v.view_receipt_seq?('View receipt seq '+v.view_receipt_seq+(v.minted?' (minted now)':' (this hour)')+' linked to pull receipt seq '+(v.pull_receipt_seq||'unknown')):('No view receipt: '+(v.reason||v.code||'not minted')));}
$('detail').innerHTML=esc(lines.join('\\n')).replace(/(https?:\\/\\/[^\\s<]+)/g,'<a href="$1" rel="noopener nofollow" target="_blank">$1</a>');});}
function render(b){if(!b||!b.ok){$('flags').textContent='AZNews store did not answer: '+esc(b&&(b.code||b.message));return;}
const st=b.status||{};$('flags').innerHTML=['live','joined','merged','lattice_live','weather_live','sky_live'].map(k=>'<code>'+k+': '+esc(st[k])+'</code>').join('')+' <span class="muted">'+esc(st.news_items_stored)+' items · '+esc(st.pins_stored)+' pins · outlets live (rolling '+esc(st.outlets_live_window?st.outlets_live_window.minutes:'')+' min, as of '+esc(st.outlets_live_window?st.outlets_live_window.as_of.slice(11,16)+'Z':'')+'): '+esc(st.outlets_live)+'/'+esc(st.outlets_configured)+' · '+esc(st.news_full_text)+' with feed full text'+(st.lattice_walk?' · full walk verified through seq '+esc(st.lattice_walk.verified_through):'')+(st.joined_reason?' · not joined: '+esc(st.joined_reason):'')+(st.lattice_live_reason?' · lattice: '+esc(st.lattice_live_reason):'')+'</span>';
pins=b.pins||[];$('last10').innerHTML=(b.last10||[]).map(p=>'<li><span class="sw" style="background:'+(COLORS[p.pin_type]||'#ccc')+'"></span><a href="?pin='+encodeURIComponent(p.pin_id)+'" data-pin="'+esc(p.pin_id)+'">'+esc(p.event)+'</a> <span class="muted">'+esc(p.pin_type)+'</span></li>').join('')||'<li class="muted">No pins yet.</li>';
document.querySelectorAll('#last10 a[data-pin]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openPin(a.dataset.pin,true);}));
$('news').innerHTML=(b.items||[]).map(i=>'<li><b>'+esc(i.outlet)+'</b>: <a href="'+esc(i.link)+'" rel="noopener nofollow" target="_blank">'+esc(i.title)+'</a> <span class="muted">'+esc((i.published||'').slice(0,16))+'</span></li>').join('')||'<li class="muted">No items yet.</li>';
const s=b.sky;if(s){$('sky').innerHTML='Sun: tropical <b>'+esc(s.sun.tropical_sign)+'</b> '+esc(s.sun.degree_in_sign)+'°, in the constellation <b>'+esc(s.sun.constellation)+'</b><br>Moon: '+esc(s.moon.phase_name)+' ('+(s.moon.illuminated_percent!=null?esc(s.moon.illuminated_percent):Math.round(s.moon.illuminated_fraction*100))+'% lit'+(s.moon.trend?', '+esc(s.moon.trend):'')+')'+(s.moon.next_new_moon?' · next new moon '+esc(s.moon.next_new_moon.slice(0,16))+'Z':'')+', sign '+esc(s.moon.tropical_sign)+', in '+esc(s.moon.constellation)+'<br>Season: north <b>'+esc(s.seasons.northern_hemisphere)+'</b>, south <b>'+esc(s.seasons.southern_hemisphere)+'</b> · next '+esc(s.seasons.next_marker.name)+' '+esc(s.seasons.next_marker.at.slice(0,16))+'Z<br><span class="muted">Computed '+esc(s.computed_at)+' with astronomy-engine.</span><details><summary>Visible tonight by region</summary>'+s.visible_tonight.map(v=>'<div><b>'+esc(v.anchor_name)+'</b>: '+esc(v.visible.map(x=>x.name).join(', '))+'</div>').join('')+'</details>';}else $('sky').textContent='No sky report yet.';
const w=b.weather||{},rows=w.regions||[];$('weather').innerHTML=rows.length?'<p class="muted">Observed '+esc(w.observed_at)+' · '+rows.length+' points · areas: '+esc((w.areas||[]).join(', '))+' · '+esc(w.source)+'</p><table><tr><th>Anchor</th><th>°C</th><th>Wind km/h</th><th>Gust</th><th>Conditions</th><th>Severe</th></tr>'+rows.map(r=>'<tr><td>'+esc(r.anchor.name)+'</td><td>'+esc(r.reading.temperature_2m)+'</td><td>'+esc(r.reading.wind_speed_10m)+'</td><td>'+esc(r.reading.wind_gusts_10m)+'</td><td>'+esc(r.conditions)+'</td><td>'+esc(r.severe.join(', '))+'</td></tr>').join('')+'</table>':'No weather stored yet.';
draw();}
$('era').addEventListener('input',e=>{era=Number(e.target.value);$('eraLabel').textContent=(era-3)+'–'+(era+3);draw();});
$('eraAll').addEventListener('click',()=>{era=null;$('eraLabel').textContent='all';draw();});
draw();fg('news_globe').then(b=>{render(b);const q=new URLSearchParams(location.search).get('pin');if(q)openPin(q,false);});
})();
</script></body></html>`;
}
