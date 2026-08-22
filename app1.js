const embeddedLogos={};
const logoBase='assets/logos/';
const logoMap={'الشهيد الدكتور محمد الأمين محمد المصطفى':'martyr.jpg','الحمد':'alhamd.jpg','البلد الطيب':'balad_tayib.jpg','بير البركة':'bir_baraka.jpg','الكبة':'alkabba.jpg','الهلال':'hilal.jpg','الواد الغارگ':'wadi_gharig.jpg','الواد الغارك':'wadi_gharig.jpg','نجوم لمدن':'noujoum_lmdn.jpg','بوقبره':'bou_gabra.jpg','بو قبره':'bou_gabra.jpg','بغداد':'baghdad.jpg','نادي بغداد':'baghdad.jpg','القدس 2':'qods2.jpg','الاتحاد':'ittihad.jpg','الملوك':'molouk.jpg','ملوك أغشوركيت':'molouk.jpg','أغشوركيت':'aghchorguit.jpg','التحدي':'tahaddi.jpg','الأساطير':'asatir.jpg','النجوم الجديدة':'new_stars.jpg','دبي':'dubai.jpg','الأنصار':'ansar.jpg','البداعة':'bidaa.jpg','البضاعة':'bidaa.jpg'};
const fallback='assets/tournament.jpg';
const logo=n=>embeddedLogos[n]|| (logoMap[n]?logoBase+logoMap[n]:fallback);
const displayName=n=>n;
const groups={A:['الشهيد الدكتور محمد الأمين محمد المصطفى','الهلال','الواد الغارگ','بغداد'],B:['البلد الطيب','بير البركة','الحمد'],C:['بوقبره','نجوم لمدن','الكبة']};
const seniorMatches=[
{cat:'الكبار',stage:'دوري المجموعات',date:'2026-08-22',time:'17:30',a:'الشهيد الدكتور محمد الأمين محمد المصطفى',b:'الهلال',group:'A'},
{cat:'الكبار',stage:'دوري المجموعات',date:'2026-08-23',time:'17:30',a:'الحمد',b:'بير البركة',group:'B'},
{cat:'الكبار',stage:'دوري المجموعات',date:'2026-08-24',time:'17:30',a:'بوقبره',b:'الكبة',group:'C'},
{cat:'الكبار',stage:'دوري المجموعات',date:'2026-08-25',time:'17:30',a:'الواد الغارگ',b:'بغداد',group:'A'},
{cat:'الكبار',stage:'دوري المجموعات',date:'2026-08-29',time:'17:30',a:'نجوم لمدن',b:'بوقبره',group:'C'},
{cat:'الكبار',stage:'دوري المجموعات',date:'2026-08-30',time:'17:30',a:'الحمد',b:'البلد الطيب',group:'B'},
{cat:'الكبار',stage:'دوري المجموعات',date:'2026-08-31',time:'17:30',a:'الشهيد الدكتور محمد الأمين محمد المصطفى',b:'الواد الغارگ',group:'A'},
{cat:'الكبار',stage:'دوري المجموعات',date:'2026-09-01',time:'17:30',a:'الهلال',b:'بغداد',group:'A'},
{cat:'الكبار',stage:'دوري المجموعات',date:'2026-09-05',time:'17:30',a:'بير البركة',b:'البلد الطيب',group:'B'},
{cat:'الكبار',stage:'دوري المجموعات',date:'2026-09-06',time:'17:30',a:'نجوم لمدن',b:'الكبة',group:'C'},
{cat:'الكبار',stage:'دوري المجموعات',date:'2026-09-07',time:'17:30',a:'الشهيد الدكتور محمد الأمين محمد المصطفى',b:'بغداد',group:'A'},
{cat:'الكبار',stage:'دوري المجموعات',date:'2026-09-08',time:'17:30',a:'الهلال',b:'الواد الغارگ',group:'A'},
{cat:'الكبار',stage:'نصف النهائي',date:'2026-09-14',time:'17:30',a:'متصدر المجموعة A',b:'متصدر المجموعة C'},
{cat:'الكبار',stage:'نصف النهائي',date:'2026-09-15',time:'17:30',a:'وصيف المجموعة A',b:'متصدر المجموعة B'},
{cat:'الكبار',stage:'النهائي',date:'2026-09-20',time:'17:30',a:'الفائز من نصف النهائي الأول',b:'الفائز من نصف النهائي الثاني'}];
const middleMatches=[{cat:'الوسط',stage:'الدور الأول',date:'2026-08-26',time:'17:00',a:'تُحدد بالقرعة',b:'تُحدد بالقرعة'},{cat:'الوسط',stage:'الدور الأول',date:'2026-08-27',time:'17:00',a:'تُحدد بالقرعة',b:'تُحدد بالقرعة'},{cat:'الوسط',stage:'الدور الأول',date:'2026-08-28',time:'17:00',a:'تُحدد بالقرعة',b:'تُحدد بالقرعة'},{cat:'الوسط',stage:'الدور الأول',date:'2026-09-02',time:'17:00',a:'تُحدد بالقرعة',b:'تُحدد بالقرعة'},{cat:'الوسط',stage:'الدور الأول',date:'2026-09-03',time:'17:00',a:'تُحدد بالقرعة',b:'تُحدد بالقرعة'},{cat:'الوسط',stage:'الدور الثاني',date:'2026-09-09',time:'17:00',a:'المتأهل من الجمعة',b:'الفريق المتأهل بالقرعة'},{cat:'الوسط',stage:'الدور الثاني',date:'2026-09-10',time:'17:00',a:'المتأهل',b:'المتأهل'},{cat:'الوسط',stage:'الدور الثاني',date:'2026-09-11',time:'17:00',a:'المتأهل',b:'المتأهل'},{cat:'الوسط',stage:'الدور الثالث',date:'2026-09-16',time:'17:00',a:'المتأهلون من الدور الثاني',b:'الفريق الثالث بالقرعة'}];
const smallMatches=[{cat:'الصغار',stage:'بداية البطولة',date:'2026-08-20',time:'09:00',a:'بطولة الصغار',b:'الخميس والجمعة صباحًا'}];
const refereeAssignments={'الصغار':{main:'أبوبكر محمد عبد الرحمن (الصديق)',assistant:'هارون يحي'},'الوسط':{main:'مصعب أعل محمود',assistant:'محمد بابي'},'الكبار':{main:'سيتم الإعلان عنه لاحقًا',assistant:'سيتم الإعلان عنه لاحقًا'}};
const teamMeta={'الشهيد الدكتور محمد الأمين محمد المصطفى':{coach:'محمد سالم سعدبوه بونا',captain:'دماه حاج محم'},'بغداد':{captain:'حمني أميس'},'نادي بغداد':{captain:'حمني أميس'}};
let D={الكبار:{},الوسط:{},الصغار:{}};
const allMatches=()=>[...seniorMatches,...middleMatches,...smallMatches];
const fmtDate=d=>new Intl.DateTimeFormat('ar-MR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00Z'));
const dt=m=>new Date(`${m.date}T${m.time.includes(':')?m.time:'09:00'}:00Z`);
function go(id){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===id));scrollTo({top:0,behavior:'smooth'})}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>go(b.dataset.page));
function pname(p){return typeof p==='string'?p:(p?.name||p?.n||'')} function pnum(p){return typeof p==='object'&&p?String(p.num??p.number??p.no??'').trim():''} function ppos(p){return typeof p==='object'&&p?String(p.pos??p.position??'').trim():''}
function applyOfficialOverrides(){
D.الكبار=D.الكبار||{};
D.الكبار['الشهيد الدكتور محمد الأمين محمد المصطفى']=['الشيخ أحمدو غلاوي','فؤاد ولد حيبتي','الداه ولد محمد اطفيل','عالي ولد معط لل','عبدالرحمن محمذن باب','الصديق محمذن باب','محمد ابييه','الشيخ يحيى غلاوي','أحمد ولد ابييه','محمد يسلم محمد حبيب','الندى ولد الندى','عزيز ولد الدي','الحسن ولد كبود','شكرود حيبلاه','معاذ باب','اينجيه محمد عبدالله','محمد محمود خليل','الطاهر ولد الحسن','محمد محمود انجاي','دماه حاج محم','محفوظ محمدا','حمدا محمد سيدي','سيدي ولد لميني','عبد الله ولد محمدي فال','عبد الله ولد كبود','الناجي ولد منجى'];
let k=(D.الكبار['الكبة']||[]).filter(p=>pname(p)!=='عمر');['الغزالي زيدان','كباد تمبل','أحمد سيدي'].forEach(n=>{if(!k.some(p=>pname(p)===n))k.push(n)});D.الكبار['الكبة']=k;
D.الكبار['الواد الغارك']=[{name:'المصطفى يعقوب',num:'8'},{name:'ادوم من',num:'10'},{name:'زايد محمد',num:'3'},{name:'محمد طالب محمد',num:'9'},{name:'الحسن ساليم',num:'12'},{name:'اسماعيل موسى',num:'2'},{name:'علين الشداد',num:'7'},{name:'العمدة طراح',num:'5'},{name:'محمد هارون',num:'99',position:'حارس مرمى'},{name:'الحسين شيخاني',num:'55'},{name:'الزدف سيدي عثمان',num:'11'},{name:'عبد الرحمن الحسين',num:'20'},{name:'بوه الحسين',num:'4'},{name:'باه لمام',num:'69'},{name:'هارون نيناه',num:'42'},{name:'شيخاني محمد',num:'22'},{name:'محمد سالم عدود',num:'30'},{name:'حمد عبد الودود',num:'15'},{name:'احمد سيلومه',num:'77'},{name:'بلاه محمد باب',num:'19'},{name:'محمد بلال',num:'6'},{name:'حمدي لبات',num:'1',position:'حارس مرمى'}];
D.الكبار['بغداد']=[{name:'محمد أحمد سالم',position:'حارس مرمى'},{name:'التراد إحمد أسغير',position:'حارس مرمى'},{name:'سيدي محمد اسغير',position:'الدفاع'},{name:'محمد أحمد',position:'الدفاع'},{name:'عبد الله تمبل',position:'الدفاع'},{name:'عمر أعبيد الله',position:'الدفاع'},{name:'بوه محفوظ',position:'الدفاع'},{name:'يحي مبروك',position:'الدفاع'},{name:'محمد حمد أمبارك',position:'الدفاع'},{name:'حمني أميس',position:'خط الوسط',captain:true},{name:'محمد الأمين إبراهيم',position:'خط الوسط'},{name:'محمد سيدي',position:'خط الوسط'},{name:'عثمان أعثيميين',position:'خط الوسط'},{name:'محمد آميجن',position:'خط الوسط'},{name:'حمزة محمذن',position:'خط الوسط'},{name:'يحي',position:'خط الوسط'},{name:'عثمان أحمد',position:'الهجوم'},{name:'محمد أميجن',position:'الهجوم'},{name:'أحمد جمعه',position:'الهجوم'},{name:'محمد محمود',position:'الهجوم'},{name:'الداه أميس',position:'الهجوم'}];
}