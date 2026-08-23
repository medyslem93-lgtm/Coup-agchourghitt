(()=>{
'use strict';
const cfg=window.AGCH_CONFIG;if(!cfg||!window.supabase)return;
const sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false}});
const videoNews=new Map();
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=d=>{if(!d)return '';try{return new Intl.DateTimeFormat('ar-MR',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${d}T12:00:00Z`))}catch{return d}};
function style(){if(document.getElementById('agh-video-news-style'))return;document.head.insertAdjacentHTML('beforeend',`<style id="agh-video-news-style">
.news-card{position:relative}.agh-video-badge{position:absolute;z-index:3;top:12px;left:12px;display:inline-flex;align-items:center;gap:6px;background:#071713e8;color:#fff;border:1px solid #ffffff24;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:800;backdrop-filter:blur(9px)}
.agh-video-badge:before{content:'▶';color:#b8ff3d}.agh-news-video{width:100%;max-height:68vh;background:#000;border-radius:22px;display:block;object-fit:contain}.agh-video-copy{color:var(--muted,#9aa7a1);line-height:1.9}.agh-video-head{display:flex;justify-content:space-between;gap:8px;position:sticky;top:0;z-index:3;padding-bottom:10px;background:linear-gradient(#0b0f0c 70%,transparent)}.agh-video-head button{border:1px solid var(--line,#26372f);background:var(--panel,#111713);color:#fff;border-radius:13px;padding:9px 12px;font-weight:700}
</style>`)}
function decorate(){document.querySelectorAll('[data-news]').forEach(card=>{const n=videoNews.get(String(card.dataset.news));if(!n||!n.video_url||card.querySelector('.agh-video-badge'))return;const badge=document.createElement('span');badge.className='agh-video-badge';badge.textContent='فيديو';card.appendChild(badge)})}
function close(){document.getElementById('sheet')?.classList.remove('show')}
async function share(title){const data={title,text:title,url:location.href};try{if(navigator.share)await navigator.share(data);else await navigator.clipboard?.writeText(location.href)}catch{}}
function openVideoNews(n){const sheet=document.getElementById('sheet'),panel=document.getElementById('sheetPanel');if(!sheet||!panel)return;panel.innerHTML=`<div class="article"><div class="agh-video-head"><button id="aghVideoClose">إغلاق</button><button id="aghVideoShare">مشاركة</button></div><video class="agh-news-video" controls playsinline preload="metadata" poster="${esc(n.image_url||'assets/tournament.jpg')}"><source src="${esc(n.video_url)}" type="video/mp4">تعذر تشغيل الفيديو على هذا المتصفح.</video><h1>${esc(n.title)}</h1><small style="color:var(--gold,#d7b460)">${esc(fmt(n.publish_date))}</small>${n.description?`<p class="agh-video-copy">${esc(n.description)}</p>`:''}${n.content&&n.content!==n.description?`<p class="agh-video-copy">${esc(n.content).replace(/\n/g,'<br>')}</p>`:''}</div>`;sheet.classList.add('show');document.getElementById('aghVideoClose').onclick=close;document.getElementById('aghVideoShare').onclick=()=>share(n.title)}
async function load(){const {data,error}=await sb.from('news').select('id,title,description,content,image_url,video_url,publish_date').not('video_url','is',null);if(error)return;videoNews.clear();(data||[]).forEach(n=>{if(n.video_url)videoNews.set(String(n.id),n)});decorate()}
document.addEventListener('click',e=>{const card=e.target.closest?.('[data-news]');if(!card)return;const n=videoNews.get(String(card.dataset.news));if(!n)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openVideoNews(n)},true);
new MutationObserver(()=>decorate()).observe(document.documentElement,{childList:true,subtree:true});style();load();setInterval(load,60000);
})();
