const SUPABASE = (process.env.SUPABASE_URL || 'https://pncjlbsflsgshmzgiiqu.supabase.co').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_fnl_v042_IqkcFPpP5oVLA_F_CrpRZX';
const paths = {
  tournaments: 'tournaments?select=*&order=sort_order',
  teams: 'teams?select=*&order=name',
  players: 'players?select=*&order=name',
  matches: 'matches?select=*&order=match_date.desc.nullslast',
  events: 'match_events?select=*&order=created_at.asc',
  lineups: 'match_lineups?select=*',
  lineupPlayers: 'match_lineup_players?select=*',
  matchStats: 'match_stats?select=*',
  standings: 'tournament_standings?select=*',
  playerStats: 'player_tournament_stats?select=*',
  news: 'news?select=*&order=featured.desc,sort_order.asc,publish_date.desc',
  awards: 'awards?select=*',
  media: 'media_assets?select=*&entity_type=eq.match&order=created_at.asc',
  settings: 'site_settings?select=*&id=eq.main&limit=1',
  referees: 'referees?select=*&order=name',
  assignments: 'referee_assignments?select=id,referee_id,tournament_id,match_id,role,category,name,photo_url',
  clocks: 'match_live_clocks?select=match_id,elapsed_seconds,anchor_at,running',
};
const core = new Set(['tournaments', 'teams', 'players', 'matches', 'events']);

// Verified emergency snapshot used only while Supabase is returning Fair Use / quota blocks.
// It keeps the public site usable without changing or replacing database data.
const emergencySnapshot = {
  tournaments: [
    { id:'011a04a0-6635-4cea-be5c-7948efe1bc09', name:'كأس أغشوركيت — الكبار', slug:'seniors-2026', season:'2026', status:'مستمرة', division:'الكبار', logo_url:'assets/tournament.jpg', short_name:'بطولة الكبار', sort_order:1, description:'البطولة الرئيسية لفئة الكبار', accent_color:'#ffffff' },
    { id:'4b420e85-19b3-479c-bd79-e0fef79a105f', name:'كأس أغشوركيت — الوسط', slug:'middle-2026', season:'2026', status:'مستمرة', division:'الوسط', logo_url:'assets/tournament.jpg', short_name:'بطولة الوسط', sort_order:2, description:'بطولة الفئة الوسطى — بنظام خروج المغلوب', accent_color:'#8b5cf6' },
    { id:'93ae7f53-cad3-4c35-8621-f37435abf723', name:'كأس أغشوركيت — الصغار', slug:'juniors-2026', season:'2026', status:'مستمرة', division:'الصغار', logo_url:'assets/tournament.jpg', short_name:'بطولة الصغار', sort_order:3, description:'بطولة فئة الصغار', accent_color:'#38bdf8' },
    { id:'17dd6742-5ca3-47e2-a729-8fac742cdc53', name:'فئة المعتزلين', slug:'retired-2026', season:'2026', status:'مكتملة', division:'المعتزلين', logo_url:'assets/tournament.jpg', short_name:'المعتزلين', sort_order:13, description:'مباراة تكريمية لنجوم كرة القدم المعتزلين في أغشوركيت.', accent_color:'#ffffff' },
  ],
  teams: [
    { id:'b7dd4863-616e-40dc-a817-0af5ef5a82ab', tournament_id:'011a04a0-6635-4cea-be5c-7948efe1bc09', name:'الواد الغارك', category:'الكبار', group_name:'A', logo_url:'https://raw.githubusercontent.com/medyslem93-lgtm/Coup-agchourghitt/44b4d06a1de0b91681d31e85cf6998ee3a319f1f/assets/logos/custom/wadi_gharig.webp' },
    { id:'dfa21e30-675f-4408-a51e-b931a06fa475', tournament_id:'011a04a0-6635-4cea-be5c-7948efe1bc09', name:'نجوم لمدن', category:'الكبار', group_name:'C', logo_url:'https://raw.githubusercontent.com/medyslem93-lgtm/Coup-agchourghitt/44b4d06a1de0b91681d31e85cf6998ee3a319f1f/assets/logos/custom/noujoum_lmdn.webp' },
    { id:'5dad0ccb-237b-433b-b445-27cf3e139789', tournament_id:'011a04a0-6635-4cea-be5c-7948efe1bc09', name:'نادي بغداد', category:'الكبار', group_name:'A', logo_url:'https://raw.githubusercontent.com/medyslem93-lgtm/Coup-agchourghitt/44b4d06a1de0b91681d31e85cf6998ee3a319f1f/assets/logos/custom/baghdad.webp' },
    { id:'1a32942e-159b-41da-bd1f-7f3026c8de43', tournament_id:'011a04a0-6635-4cea-be5c-7948efe1bc09', name:'الهلال', category:'الكبار', group_name:'A', logo_url:'assets/teams/senior/hilal.svg' },
    { id:'e36c9ef2-6510-4bb3-b712-9a73e511773e', tournament_id:'011a04a0-6635-4cea-be5c-7948efe1bc09', name:'الشهيد الدكتور محمد الأمين محمد المصطفى', category:'الكبار', group_name:'A', logo_url:'https://raw.githubusercontent.com/medyslem93-lgtm/Coup-agchourghitt/44b4d06a1de0b91681d31e85cf6998ee3a319f1f/assets/logos/custom/martyr.webp' },
    { id:'f1964c43-5f9f-4423-b3b5-889db1c0a8fc', tournament_id:'011a04a0-6635-4cea-be5c-7948efe1bc09', name:'الحمد', category:'الكبار', group_name:'B', logo_url:'assets/teams/senior/hamd.svg' },
    { id:'50625705-22ad-4c50-aadd-78563824bf17', tournament_id:'011a04a0-6635-4cea-be5c-7948efe1bc09', name:'البلد الطيب', category:'الكبار', group_name:'B', logo_url:'https://raw.githubusercontent.com/medyslem93-lgtm/Coup-agchourghitt/44b4d06a1de0b91681d31e85cf6998ee3a319f1f/assets/logos/custom/balad_tayib.webp' },
    { id:'0e35f612-05be-4380-9d1f-f95a153b71f5', tournament_id:'011a04a0-6635-4cea-be5c-7948efe1bc09', name:'بير البركة', category:'الكبار', group_name:'B', logo_url:'https://raw.githubusercontent.com/medyslem93-lgtm/Coup-agchourghitt/44b4d06a1de0b91681d31e85cf6998ee3a319f1f/assets/logos/custom/bir_baraka.webp' },
    { id:'5d402c0e-05d1-4521-b720-760d9ceddb3b', tournament_id:'011a04a0-6635-4cea-be5c-7948efe1bc09', name:'بوقبره', category:'الكبار', group_name:'C', logo_url:'https://raw.githubusercontent.com/medyslem93-lgtm/Coup-agchourghitt/44b4d06a1de0b91681d31e85cf6998ee3a319f1f/assets/logos/custom/bou_gabra.webp' },
    { id:'cbf9b6db-9293-4c8d-91fa-1de91108e037', tournament_id:'011a04a0-6635-4cea-be5c-7948efe1bc09', name:'الكبة', category:'الكبار', group_name:'C', logo_url:'https://raw.githubusercontent.com/medyslem93-lgtm/Coup-agchourghitt/44b4d06a1de0b91681d31e85cf6998ee3a319f1f/assets/logos/custom/alkabba.webp' },
    { id:'5fc25d64-4bfb-4b14-9967-d6e21a9d60ed', tournament_id:'4b420e85-19b3-479c-bd79-e0fef79a105f', name:'سانتوس', category:'الوسط', logo_url:'assets/tournament.jpg' },
    { id:'2ac6adf0-dfd3-406a-adf8-fdf0710edc2f', tournament_id:'4b420e85-19b3-479c-bd79-e0fef79a105f', name:'البلد الطيب', category:'الوسط', logo_url:'https://raw.githubusercontent.com/medyslem93-lgtm/Coup-agchourghitt/44b4d06a1de0b91681d31e85cf6998ee3a319f1f/assets/logos/custom/balad_tayib.webp' },
    { id:'e023fda0-a678-4808-be90-7895d5ea2ec4', tournament_id:'93ae7f53-cad3-4c35-8621-f37435abf723', name:'الشمال', category:'الصغار', logo_url:'assets/tournament.jpg' },
    { id:'abc74a83-7381-46cb-b0cd-4e697635ea4a', tournament_id:'93ae7f53-cad3-4c35-8621-f37435abf723', name:'الحمد', category:'الصغار', logo_url:'assets/tournament.jpg' },
    { id:'ca4578db-2971-49ad-b7de-2b3fdc471880', tournament_id:'17dd6742-5ca3-47e2-a729-8fac742cdc53', name:'الأسود', category:'المعتزلين', logo_url:'assets/tournament.jpg' },
    { id:'a9b77f12-c58f-463a-a1c1-e88aba716ae2', tournament_id:'17dd6742-5ca3-47e2-a729-8fac742cdc53', name:'النجوم', category:'المعتزلين', logo_url:'assets/tournament.jpg' },
  ],
  players: [],
  matches: [
    { id:'1e79da7b-1d03-46e3-8f61-b7948d9634ce', stage:'النهائي', round_name:'النهائي', venue:'رضوانه', status:'قادمة', score_a:null, score_b:null, minute:null, category:'الكبار', team_a_id:'dfa21e30-675f-4408-a51e-b931a06fa475', team_b_id:'b7dd4863-616e-40dc-a817-0af5ef5a82ab', match_date:'2026-09-26', match_time:'16:30:00', stream_type:'livekit', stream_status:'offline', stream_enabled:false, stream_url:null, tournament_id:'011a04a0-6635-4cea-be5c-7948efe1bc09', display_order:3, qualifier_note:'نهائي بطولة الكبار: نجوم لمدن × الواد الغارك.', updated_at:'2026-09-26T00:01:17.371339+00:00' },
    { id:'abb6e6e5-0478-4722-8339-70cddd12b20f', stage:'النهائي', round_name:'النهائي', venue:'الرضوانه', status:'انتهت', score_a:1, score_b:1, category:'الوسط', team_a_id:'5fc25d64-4bfb-4b14-9967-d6e21a9d60ed', team_b_id:'2ac6adf0-dfd3-406a-adf8-fdf0710edc2f', match_date:'2026-09-16', match_time:'17:30:00', stream_status:'offline', stream_enabled:false, tournament_id:'4b420e85-19b3-479c-bd79-e0fef79a105f', home_penalty_score:5, away_penalty_score:6, qualifier_note:'تعادل سانتوس والبلد الطيب 1-1؛ فاز البلد الطيب بركلات الترجيح 6-5 وتوج بطلاً.' },
    { id:'8116ebf4-d6c4-407c-9b31-c2439bef610f', stage:'النهائي', round_name:'النهائي', venue:'ملعب رضوان', status:'انتهت', score_a:4, score_b:0, minute:40, category:'الصغار', team_a_id:'e023fda0-a678-4808-be90-7895d5ea2ec4', team_b_id:'abc74a83-7381-46cb-b0cd-4e697635ea4a', match_date:'2026-09-16', match_time:'17:00:00', stream_status:'ended', stream_enabled:false, tournament_id:'93ae7f53-cad3-4c35-8621-f37435abf723', qualifier_note:'نهائي بطولة الصغار: الشمال × الحمد' },
    { id:'c0766b04-e3b2-42be-8748-095bc15ae45b', stage:'النهائي', round_name:'النهائي', venue:'رضوانه', status:'انتهت', score_a:1, score_b:1, category:'المعتزلين', team_a_id:'ca4578db-2971-49ad-b7de-2b3fdc471880', team_b_id:'a9b77f12-c58f-463a-a1c1-e88aba716ae2', match_date:'2026-09-18', match_time:'17:00:00', stream_status:'offline', stream_enabled:false, tournament_id:'17dd6742-5ca3-47e2-a729-8fac742cdc53', qualifier_note:'الأسود والنجوم بطلا بطولة المعتزلين 2026 — مباراة نهائية تكريمية.' },
  ],
  events: [],
  lineups: [], lineupPlayers: [], matchStats: [], standings: [], playerStats: [], news: [], awards: [], media: [], referees: [], assignments: [],
  settings: { id:'main', season:'2026', logo_url:'assets/tournament.jpg', hero_title:'كل البطولة. كل الفرق. كل لحظة.', venue_name:'ملعب رضوان', announcement:'الخدمة المباشرة محدودة مؤقتًا — يتم عرض آخر بيانات موثقة للبطولة.', hero_subtitle:'النتائج، المباريات، الفرق والإحصائيات في تجربة رياضية واحدة.', tournament_name:'كأس أغشوركيت 2026', tournament_status:'مستمرة' },
  emergencyFallback: true,
  generated_at: '2026-09-26T01:20:00Z',
};

async function read(path) {
  const response = await fetch(`${SUPABASE}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error(`database_${response.status}`);
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => {
      try { return [key, await read(path)]; }
      catch (error) { if (core.has(key)) throw error; return [key, []]; }
    }));
    const payload = Object.fromEntries(entries);
    payload.settings = Array.isArray(payload.settings) ? payload.settings[0] || {} : {};
    const clockByMatch = new Map(payload.clocks.map(row => [row.match_id, row]));
    for (const match of payload.matches) {
      const clock = clockByMatch.get(match.id);
      if (clock) Object.assign(match, { clock_elapsed_seconds: clock.elapsed_seconds, clock_anchor_at: clock.anchor_at, clock_running: clock.running });
    }
    delete payload.clocks;
    res.setHeader('Cache-Control', 'public, max-age=0');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=20, stale-while-revalidate=90');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Data-Source', 'supabase');
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Public snapshot using emergency fallback', error);
    res.setHeader('Cache-Control', 'public, max-age=0');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Data-Source', 'emergency-fallback');
    return res.status(200).json(emergencySnapshot);
  }
}
