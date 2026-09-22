(() => {
  'use strict';

  const cfg = window.AGCH_CONFIG || {};
  const factory = window.supabase?.createClient;
  if (!factory || !cfg.supabaseUrl || !cfg.supabaseKey) return;

  const db = factory(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'aghchorguit-media-score-fix' } },
  });

  let lastMatchId = '';
  let payload = null;
  let timer = 0;

  const norm = (v = '') => String(v || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ـ/g, '').replace(/\s+/g, ' ');
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const matchIdFromHash = () => location.hash.match(/^#\/?match\/([0-9a-f-]{36})(?:\/|$)/i)?.[1] || '';
  const isGoal = e => ['هدف','هدف عكسي','ركلة جزاء مسجلة'].includes(e?.type);

  function injectStyles() {
    if (document.getElementById('aghMediaScoreFixCss')) return;
    const style = document.createElement('style');
    style.id = 'aghMediaScoreFixCss';
    style.textContent = `
      .agh-media-compact-score{position:absolute;z-index:8;top:10px;left:10px;right:10px;display:flex;align-items:center;justify-content:space-between;gap:7px;direction:rtl;pointer-events:none;font-family:inherit}
      .agh-media-compact-score .agh-ms-team{display:flex;align-items:center;gap:6px;max-width:43%;padding:5px 8px;border-radius:10px;background:rgba(4,8,7,.86);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.12);color:#fff;font-size:10px;font-weight:800;min-width:0}
      .agh-media-compact-score .agh-ms-team img{width:22px;height:22px;border-radius:6px;background:#fff;object-fit:contain;padding:1px;flex:0 0 auto}
      .agh-media-compact-score .agh-ms-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
      .agh-media-compact-score .agh-ms-count{display:grid;place-items:center;min-width:22px;height:22px;border-radius:7px;background:var(--accent,#2fc3ff);color:#06100d;font-size:12px;font-weight:950;line-height:1;padding:0 5px;flex:0 0 auto;transition:transform .25s ease,filter .25s ease}
      .agh-media-compact-score .agh-ms-team.is-scoring{border-color:color-mix(in srgb,var(--accent,#2fc3ff) 65%,rgba(255,255,255,.18));box-shadow:0 0 0 1px color-mix(in srgb,var(--accent,#2fc3ff) 15%,transparent)}
      .agh-media-compact-score .agh-ms-team.is-goal-flash .agh-ms-count{animation:aghScorePulse .85s ease both}
      .agh-media-compact-score .agh-ms-minute{flex:0 0 auto;padding:5px 7px;border-radius:8px;background:rgba(4,8,7,.86);color:#fff;font-size:9px;font-weight:900;direction:ltr}
      .agh-media-goal-pop{position:absolute;z-index:11;top:58px;left:50%;transform:translate(-50%,-14px) scale(.94);min-width:min(78%,320px);max-width:88%;padding:10px 16px;border-radius:16px;background:linear-gradient(135deg,rgba(5,17,14,.96),rgba(7,39,31,.94));border:1px solid color-mix(in srgb,var(--accent,#2fc3ff) 55%,rgba(255,255,255,.16));box-shadow:0 14px 32px rgba(0,0,0,.34);color:#fff;text-align:center;opacity:0;pointer-events:none;transition:opacity .28s ease,transform .28s ease;direction:rtl}
      .agh-media-goal-pop.is-visible{opacity:1;transform:translate(-50%,0) scale(1)}
      .agh-media-goal-pop strong{display:block;color:var(--accent,#2fc3ff);font-size:19px;font-weight:950;letter-spacing:.04em}
      .agh-media-goal-pop span{display:block;margin-top:2px;font-size:12px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .agh-media-goal-pop small{display:block;margin-top:2px;color:rgba(255,255,255,.68);font-size:10px}
      .agh-media-download{position:absolute;z-index:12;right:10px;bottom:50px;display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:7px 10px;background:rgba(4,8,7,.86);color:#fff;font:800 10px/1 inherit;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .agh-media-download:hover{border-color:var(--accent,#2fc3ff);color:var(--accent,#2fc3ff)}
      .agh-media-download[disabled]{opacity:.65;cursor:wait}
      .agh-media-score-hidden{display:none!important}
      .match-recap .recap-score strong{direction:ltr;unicode-bidi:isolate}
      @keyframes aghScorePulse{0%{transform:scale(1)}35%{transform:scale(1.45);filter:brightness(1.35)}100%{transform:scale(1)}}
      @media(max-width:560px){.agh-media-compact-score{top:7px;left:7px;right:7px;gap:5px}.agh-media-compact-score .agh-ms-team{padding:4px 6px;font-size:9px;max-width:44%}.agh-media-compact-score .agh-ms-team img{width:19px;height:19px}.agh-media-compact-score .agh-ms-count{min-width:19px;height:19px;font-size:11px}.agh-media-compact-score .agh-ms-minute{padding:4px 6px;font-size:8px}.agh-media-goal-pop{top:46px;padding:8px 12px}.agh-media-goal-pop strong{font-size:16px}.agh-media-download{right:7px;bottom:43px;padding:6px 8px;font-size:9px}}
    `;
    document.head.appendChild(style);
  }

  async function loadMatch(matchId) {
    const [matchRes, mediaRes, eventRes] = await Promise.all([
      db.from('matches').select('id,tournament_id,team_a_id,team_b_id,score_a,score_b,status,team_a:teams!matches_team_a_id_fkey(id,name,logo_url),team_b:teams!matches_team_b_id_fkey(id,name,logo_url),tournament:tournaments(id,name,short_name,logo_url)').eq('id', matchId).single(),
      db.from('media_assets').select('id,public_url,media_type,kind,caption,captured_minute,score_a,score_b,created_at').eq('entity_type','match').eq('entity_id',matchId).order('created_at',{ascending:true}),
      db.from('match_events').select('id,type,team_id,player_id,player_name,minute,created_at').eq('match_id',matchId).in('type',['هدف','هدف عكسي','ركلة جزاء مسجلة']).order('minute',{ascending:true}).order('created_at',{ascending:true}),
    ]);
    if (matchRes.error) throw matchRes.error;
    return { match: matchRes.data, media: mediaRes.data || [], events: eventRes.data || [] };
  }

  function scoreAtMedia(media, data) {
    if (media.score_a != null && media.score_b != null && Number.isFinite(Number(media.score_a)) && Number.isFinite(Number(media.score_b))) {
      return { a:Number(media.score_a), b:Number(media.score_b) };
    }
    let a = 0, b = 0;
    const minute = Number(media.captured_minute ?? 9999);
    for (const e of data.events) {
      if (Number(e.minute ?? 0) > minute) continue;
      if (e.team_id === data.match.team_a_id) a += 1;
      else if (e.team_id === data.match.team_b_id) b += 1;
    }
    return { a, b };
  }

  function goalForMedia(media, data) {
    const minute = Number(media.captured_minute ?? -1);
    if (minute < 0) return null;
    const exact = data.events.filter(e => isGoal(e) && Number(e.minute) === minute);
    if (exact.length) return exact[exact.length - 1];
    const ranked = data.events.filter(isGoal).map(e => ({ e, d:Math.abs(Number(e.minute ?? 999)-minute) })).sort((x,y)=>x.d-y.d);
    return ranked[0]?.d <= 1 ? ranked[0].e : null;
  }

  function scoreBeforeGoal(goal, data) {
    let a = 0, b = 0;
    for (const e of data.events) {
      if (!isGoal(e) || e.id === goal.id) continue;
      const beforeMinute = Number(e.minute ?? -1) < Number(goal.minute ?? -1);
      const sameMinuteEarlier = Number(e.minute ?? -1) === Number(goal.minute ?? -1) && String(e.created_at || '') < String(goal.created_at || '');
      if (!beforeMinute && !sameMinuteEarlier) continue;
      if (e.team_id === data.match.team_a_id) a += 1;
      else if (e.team_id === data.match.team_b_id) b += 1;
    }
    return { a, b };
  }

  function scoringSide(media, data, score) {
    const goal = goalForMedia(media, data);
    if (goal?.team_id === data.match.team_a_id) return 'a';
    if (goal?.team_id === data.match.team_b_id) return 'b';
    if (score.a > 0 && score.b === 0) return 'a';
    if (score.b > 0 && score.a === 0) return 'b';
    return '';
  }

  function mediaForVideo(video, data) {
    const src = video.currentSrc || video.getAttribute('src') || video.querySelector('source')?.getAttribute('src') || '';
    if (!src) return null;
    return data.media.find(item => item.public_url && (src === item.public_url || src.includes(item.public_url) || item.public_url.includes(src))) || null;
  }

  function hideLegacyScore(wrapper, teamA, teamB) {
    const a = norm(teamA.name), b = norm(teamB.name);
    const nodes = wrapper.querySelectorAll('div,section,header');
    for (const node of nodes) {
      if (node.classList.contains('agh-media-compact-score') || node.classList.contains('agh-media-goal-pop')) continue;
      const text = norm(node.textContent);
      if (!text || text.length > 180 || !text.includes(a) || !text.includes(b)) continue;
      const imgs = node.querySelectorAll('img').length;
      if (imgs < 2) continue;
      const style = getComputedStyle(node);
      if (style.position === 'absolute' || style.position === 'fixed') node.classList.add('agh-media-score-hidden');
    }
  }

  function logoHtml(t) {
    return t?.logo_url ? `<img src="${esc(t.logo_url)}" alt="">` : '';
  }

  function renderBar(bar, media, data, score, scoring = '') {
    const a = data.match.team_a || {name:'الفريق الأول',logo_url:''};
    const b = data.match.team_b || {name:'الفريق الثاني',logo_url:''};
    bar.innerHTML = `<span class="agh-ms-team ${scoring==='a'?'is-scoring':''}" data-agh-side="a">${logoHtml(a)}<span class="agh-ms-name">${esc(a.name)}</span><b class="agh-ms-count">${score.a}</b></span><span class="agh-ms-minute">${media.captured_minute != null ? `${esc(media.captured_minute)}′` : ''}</span><span class="agh-ms-team ${scoring==='b'?'is-scoring':''}" data-agh-side="b">${logoHtml(b)}<span class="agh-ms-name">${esc(b.name)}</span><b class="agh-ms-count">${score.b}</b></span>`;
  }

  function mountGoalAnimation(video, wrapper, media, data, bar) {
    const goal = goalForMedia(media, data);
    if (!goal || video.dataset.aghGoalMounted === '1') return;
    video.dataset.aghGoalMounted = '1';
    const after = scoreAtMedia(media, data);
    const before = scoreBeforeGoal(goal, data);
    const side = goal.team_id === data.match.team_a_id ? 'a' : goal.team_id === data.match.team_b_id ? 'b' : '';
    const team = side === 'a' ? data.match.team_a : data.match.team_b;
    let pop = wrapper.querySelector(':scope > .agh-media-goal-pop');
    if (!pop) {
      pop = document.createElement('div');
      pop.className = 'agh-media-goal-pop';
      wrapper.appendChild(pop);
    }
    pop.innerHTML = `<strong>⚽ هدف!</strong><span>${esc(goal.player_name || team?.name || 'مسجل الهدف')}</span><small>${goal.minute != null ? `${esc(goal.minute)}′` : ''}${team?.name ? ` · ${esc(team.name)}` : ''}</small>`;
    let runId = 0;
    const reset = () => {
      runId += 1;
      pop.classList.remove('is-visible');
      renderBar(bar, media, data, before, side);
    };
    const animate = () => {
      const id = ++runId;
      renderBar(bar, media, data, before, side);
      window.setTimeout(() => { if (id !== runId) return; pop.classList.add('is-visible'); }, 250);
      window.setTimeout(() => {
        if (id !== runId) return;
        renderBar(bar, media, data, after, side);
        bar.querySelector(`[data-agh-side="${side}"]`)?.classList.add('is-goal-flash');
      }, 900);
      window.setTimeout(() => { if (id === runId) pop.classList.remove('is-visible'); }, 3200);
    };
    video.addEventListener('play', () => {
      if (video.currentTime < 2.2) animate();
      else renderBar(bar, media, data, after, side);
    });
    video.addEventListener('seeked', () => {
      if (video.currentTime < 1) reset();
      else renderBar(bar, media, data, after, side);
    });
    video.addEventListener('ended', () => { pop.classList.remove('is-visible'); renderBar(bar, media, data, after, side); });
    renderBar(bar, media, data, after, side);
  }

  function roundedRect(ctx,x,y,w,h,r,fill) {
    const rr = Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }

  function fitText(ctx,text,maxWidth,startSize,minSize=18) {
    let size = startSize;
    while (size > minSize) { ctx.font = `800 ${size}px Arial,sans-serif`; if (ctx.measureText(text).width <= maxWidth) break; size -= 2; }
    return size;
  }

  function loadExportImage(url) {
    return new Promise(resolve => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  function drawExportOverlay(ctx,w,h,media,data,elapsed,goal,images={}) {
    const a = data.match.team_a || {name:'الفريق الأول'};
    const b = data.match.team_b || {name:'الفريق الثاني'};
    const after = scoreAtMedia(media,data);
    const before = goal ? scoreBeforeGoal(goal,data) : after;
    const showGoal = Boolean(goal && elapsed >= .35 && elapsed <= 3.4);
    const counted = !goal || elapsed >= 1.05;
    const scoreNow = counted ? after : before;
    const pad = Math.max(12,Math.round(w*.018));
    const top = pad;
    const boxH = Math.max(42,Math.round(h*.085));
    const boxW = Math.min(Math.round(w*.39), 430);
    const midW = Math.max(72,Math.round(w*.12));
    const font = Math.max(18,Math.round(h*.032));
    roundedRect(ctx,pad,top,boxW,boxH,12,'rgba(4,8,7,.86)');
    roundedRect(ctx,w-pad-boxW,top,boxW,boxH,12,'rgba(4,8,7,.86)');
    roundedRect(ctx,(w-midW)/2,top,midW,boxH,12,'rgba(4,8,7,.9)');
    const logoSize=Math.max(25,Math.round(boxH*.7));
    if(images.b) ctx.drawImage(images.b,pad+8,top+(boxH-logoSize)/2,logoSize,logoSize);
    if(images.a) ctx.drawImage(images.a,w-pad-logoSize-8,top+(boxH-logoSize)/2,logoSize,logoSize);
    ctx.textBaseline='middle'; ctx.fillStyle='#fff';
    ctx.textAlign='left'; ctx.font=`800 ${fitText(ctx,b.name,boxW-logoSize-76,font,14)}px Arial,sans-serif`; ctx.fillText(b.name,pad+logoSize+17,top+boxH/2);
    ctx.textAlign='right'; ctx.font=`900 ${font}px Arial,sans-serif`; ctx.fillStyle='#31c4ff'; ctx.fillText(String(scoreNow.b),pad+boxW-14,top+boxH/2);
    ctx.textAlign='right'; ctx.fillStyle='#fff'; ctx.font=`800 ${fitText(ctx,a.name,boxW-logoSize-76,font,14)}px Arial,sans-serif`; ctx.fillText(a.name,w-pad-logoSize-17,top+boxH/2);
    ctx.textAlign='left'; ctx.font=`900 ${font}px Arial,sans-serif`; ctx.fillStyle='#31c4ff'; ctx.fillText(String(scoreNow.a),w-pad-boxW+14,top+boxH/2);
    if(images.tournament){const cup=Math.max(17,Math.round(boxH*.43));ctx.drawImage(images.tournament,w/2-cup/2,top+3,cup,cup);}
    ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.font=`900 ${Math.max(13,Math.round(font*.62))}px Arial,sans-serif`; ctx.fillText(media.captured_minute != null ? `${media.captured_minute}′` : '',w/2,top+boxH*.72);
    if (showGoal) {
      const sideA=goal.team_id===data.match.team_a_id;
      const goalTeam=sideA?a:b;
      const labelW=Math.min(Math.round(w*.22),230), labelH=Math.max(34,Math.round(h*.06));
      const labelX=(w-labelW)/2, labelY=top+boxH+Math.max(8,pad*.55);
      roundedRect(ctx,labelX,labelY,labelW,labelH,labelH/2,'rgba(5,28,22,.94)');
      ctx.strokeStyle='#31c4ff';ctx.lineWidth=Math.max(2,Math.round(w*.002));ctx.stroke();
      ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font=`950 ${Math.max(19,Math.round(h*.038))}px Arial,sans-serif`;ctx.fillText('هــــدف!',w/2,labelY+labelH/2);

      const cardW=Math.min(Math.round(w*.38),390), cardH=Math.max(58,Math.round(h*.105));
      const cardX=sideA?w-pad-cardW:pad, cardY=labelY+labelH+Math.max(7,pad*.45);
      roundedRect(ctx,cardX,cardY,cardW,cardH,14,'rgba(5,28,22,.92)');
      ctx.strokeStyle='rgba(49,196,255,.72)';ctx.lineWidth=2;ctx.stroke();
      const eventLogo=images.goal||(sideA?images.a:images.b), eventLogoSize=Math.round(cardH*.68);
      const eventLogoX=sideA?cardX+cardW-eventLogoSize-9:cardX+9;
      if(eventLogo) ctx.drawImage(eventLogo,eventLogoX,cardY+(cardH-eventLogoSize)/2,eventLogoSize,eventLogoSize);
      const scorer=goal.player_name||goalTeam.name||'مسجل الهدف';
      ctx.direction='rtl';ctx.fillStyle='#31c4ff';ctx.font=`800 ${Math.max(11,Math.round(h*.019))}px Arial,sans-serif`;
      ctx.textAlign=sideA?'right':'left';const textX=sideA?eventLogoX-9:eventLogoX+eventLogoSize+9;
      ctx.fillText(goalTeam.name||'',textX,cardY+cardH*.31);
      ctx.fillStyle='#fff';ctx.font=`900 ${Math.max(15,Math.round(h*.029))}px Arial,sans-serif`;ctx.fillText(scorer,textX,cardY+cardH*.66);
      ctx.direction='ltr';ctx.fillStyle='#31c4ff';ctx.font=`900 ${Math.max(17,Math.round(h*.034))}px Arial,sans-serif`;ctx.textAlign=sideA?'left':'right';
      ctx.fillText(goal.minute!=null?`${goal.minute}′`:'GOAL',sideA?cardX+12:cardX+cardW-12,cardY+cardH/2);
    }
    const title = `${data.match.tournament?.short_name || data.match.tournament?.name || 'كأس أغشوركيت 2026'} • ${a.name} × ${b.name}`;
    ctx.font=`700 ${Math.max(13,Math.round(h*.022))}px Arial,sans-serif`; const tw=Math.min(ctx.measureText(title).width+30,w-pad*2);
    roundedRect(ctx,(w-tw)/2,h-pad-Math.max(34,Math.round(h*.055)),tw,Math.max(34,Math.round(h*.055)),10,'rgba(4,8,7,.72)');
    ctx.textAlign='center'; ctx.fillStyle='rgba(255,255,255,.9)'; ctx.fillText(title,w/2,h-pad-Math.max(34,Math.round(h*.055))/2);
  }

  function bestMime() {
    if (!window.MediaRecorder) return '';
    return ['video/mp4;codecs=h264','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t => MediaRecorder.isTypeSupported?.(t)) || '';
  }

  async function downloadOriginal(url, filename) {
    try {
      const res = await fetch(url,{mode:'cors'});
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=href; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(href),1500);
    } catch {
      const a=document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener'; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    }
  }

  async function originalVideoFile(url,filename) {
    const res=await fetch(url,{mode:'cors'});
    if(!res.ok) throw new Error('fetch failed');
    const blob=await res.blob();
    return new File([blob],filename,{type:blob.type||'video/mp4'});
  }

  function saveVideoFile(file) {
    if(navigator.share&&navigator.canShare?.({files:[file]})) return navigator.share({files:[file],title:'ملخص المباراة'});
    const href=URL.createObjectURL(file);const a=document.createElement('a');a.href=href;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),30000);return Promise.resolve();
  }

  async function exportVideoWithOverlay(media,data,button) {
    const url = media.public_url;
    if (!url) return;
    const goal = goalForMedia(media,data);
    const mime = bestMime();
    if (!mime || !HTMLCanvasElement.prototype.captureStream) {
      return originalVideoFile(url,`agchourghit-${media.captured_minute || 'clip'}.mp4`);
    }
    const source = document.createElement('video');
    source.crossOrigin='anonymous'; source.playsInline=true; source.preload='auto'; source.muted=true; source.src=url;
    await new Promise((resolve,reject)=>{ source.addEventListener('loadedmetadata',resolve,{once:true}); source.addEventListener('error',reject,{once:true}); source.load(); });
    const vw=source.videoWidth||1280, vh=source.videoHeight||720, maxW=1280, scale=Math.min(1,maxW/vw);
    const canvas=document.createElement('canvas'); canvas.width=Math.max(320,Math.round(vw*scale)); canvas.height=Math.max(180,Math.round(vh*scale));
    const ctx=canvas.getContext('2d',{alpha:false}); if (!ctx) throw new Error('canvas');
    const [teamAImage,teamBImage,tournamentImage,goalImage]=await Promise.all([
      loadExportImage(data.match.team_a?.logo_url),loadExportImage(data.match.team_b?.logo_url),loadExportImage(data.match.tournament?.logo_url),loadExportImage(goal?.team_id===data.match.team_a_id?data.match.team_a?.logo_url:data.match.team_b?.logo_url),
    ]);
    const exportImages={a:teamAImage,b:teamBImage,tournament:tournamentImage,goal:goalImage};
    const stream=canvas.captureStream(30);
    let sourceStream=null;
    try { sourceStream=source.captureStream?.(); sourceStream?.getAudioTracks?.().forEach(t=>stream.addTrack(t)); } catch {}
    const chunks=[];
    const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5_000_000});
    recorder.ondataavailable=e=>{ if(e.data?.size) chunks.push(e.data); };
    const stopped=new Promise(resolve=>recorder.addEventListener('stop',resolve,{once:true}));
    let raf=0, startedAt=0;
    const draw=()=>{
      if (source.readyState >= 2) {
        ctx.drawImage(source,0,0,canvas.width,canvas.height);
        const elapsed=startedAt?performance.now()/1000-startedAt:0;
        drawExportOverlay(ctx,canvas.width,canvas.height,media,data,elapsed,goal,exportImages);
      }
      if (!source.ended) raf=requestAnimationFrame(draw);
    };
    recorder.start(500); startedAt=performance.now()/1000; await source.play(); draw();
    await new Promise(resolve=>{ source.addEventListener('ended',resolve,{once:true}); source.addEventListener('error',resolve,{once:true}); });
    cancelAnimationFrame(raf); if(recorder.state!=='inactive') recorder.stop(); await stopped;
    source.pause(); source.removeAttribute('src'); source.load(); stream.getTracks().forEach(t=>t.stop()); sourceStream?.getTracks?.().forEach(t=>t.stop());
    const blob=new Blob(chunks,{type:mime}); if(!blob.size) throw new Error('empty export');
    const ext=mime.includes('mp4')?'mp4':'webm';
    return new File([blob],`agchourghit-goal-${media.captured_minute || 'clip'}.${ext}`,{type:mime});
  }

  function addDownloadButton(wrapper,media,data) {
    let button=wrapper.querySelector(':scope > .agh-media-download');
    if (!button) { button=document.createElement('button'); button.type='button'; button.className='agh-media-download'; button.innerHTML='⬇ حفظ الفيديو'; wrapper.appendChild(button); }
    if (button.dataset.bound==='1') return;
    button.dataset.bound='1';
    button.addEventListener('click',async e=>{
      e.preventDefault(); e.stopPropagation(); if(button.disabled) return;
      if(button._exportedFile){try{await saveVideoFile(button._exportedFile);}catch(err){if(err?.name!=='AbortError')console.error('Video save failed',err);}return;}
      button.disabled=true;button.innerHTML='⏳ تجهيز الفيديو…';
      try {
        button._exportedFile=await exportVideoWithOverlay(media,data,button);
        button.innerHTML=navigator.canShare?.({files:[button._exportedFile]})?'⬇ حفظ في المعرض':'✓ تنزيل الفيديو';
        if(!navigator.canShare?.({files:[button._exportedFile]})) await saveVideoFile(button._exportedFile);
      }
      catch(err) { console.error('Overlay video export failed',err); await downloadOriginal(media.public_url,`agchourghit-${media.captured_minute || 'clip'}.mp4`); button.innerHTML='⬇ تم تنزيل الأصل'; }
      finally{button.disabled=false;}
    });
  }

  function decorateVideos(data) {
    for (const video of document.querySelectorAll('#appMain video')) {
      const media = mediaForVideo(video, data);
      if (!media || media.media_type !== 'video') continue;
      const wrapper = video.closest('figure,article,.media-item,.match-media-item,.match-recap-media,.recap-media-item,.media-card') || video.parentElement;
      if (!wrapper) continue;
      if (getComputedStyle(wrapper).position === 'static') wrapper.style.position = 'relative';
      hideLegacyScore(wrapper, data.match.team_a, data.match.team_b);
      const score = scoreAtMedia(media, data);
      const scoring = scoringSide(media, data, score);
      let bar = wrapper.querySelector(':scope > .agh-media-compact-score');
      if (!bar) { bar=document.createElement('div'); bar.className='agh-media-compact-score'; wrapper.appendChild(bar); }
      renderBar(bar,media,data,score,scoring);
      mountGoalAnimation(video,wrapper,media,data,bar);
      addDownloadButton(wrapper,media,data);
    }
  }

  function fixRecapScore(data) {
    const board = document.querySelector('#appMain .match-recap-scoreboard');
    const strong = board?.querySelector('.recap-score strong');
    const teams = board ? [...board.querySelectorAll('.recap-team')] : [];
    if (!board || !strong || teams.length < 2) return;
    const sorted = teams.map(el => ({el, x:el.getBoundingClientRect().left, name:norm(el.textContent)})).sort((x,y)=>x.x-y.x);
    const left = sorted[0], right = sorted[sorted.length-1];
    const aName = norm(data.match.team_a?.name), bName = norm(data.match.team_b?.name);
    const scoreFor = name => name.includes(aName) ? Number(data.match.score_a || 0) : name.includes(bName) ? Number(data.match.score_b || 0) : 0;
    strong.innerHTML = `${scoreFor(left.name)}<i>–</i>${scoreFor(right.name)}`;
    strong.setAttribute('dir','ltr');
  }

  async function apply(force = false) {
    const matchId = matchIdFromHash();
    if (!matchId) { lastMatchId=''; payload=null; return; }
    try {
      if (force || !payload || lastMatchId !== matchId) { payload=await loadMatch(matchId); lastMatchId=matchId; }
      if (matchIdFromHash() !== matchId) return;
      injectStyles(); fixRecapScore(payload); decorateVideos(payload);
    } catch (e) { console.error('Match media score fix failed', e); }
  }

  function schedule(force = false) { clearTimeout(timer); timer=setTimeout(()=>apply(force),120); }
  window.addEventListener('hashchange',()=>schedule(true));
  document.addEventListener('DOMContentLoaded',()=>schedule(true),{once:true});
  const root=document.getElementById('appMain');
  if(root) new MutationObserver(()=>schedule(false)).observe(root,{childList:true,subtree:true});
  schedule(true);
})();
