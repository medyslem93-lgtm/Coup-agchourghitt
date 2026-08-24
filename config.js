window.AGCH_CONFIG={
  supabaseUrl:'https://pncjlbsflsgshmzgiiqu.supabase.co',
  supabaseKey:'sb_publishable_fnl_v042_IqkcFPpP5oVLA_F_CrpRZX',
  mediaBucket:'tournament-media'
};

(() => {
  const isAdmin=/\/admin(?:\/|$)/.test(location.pathname);
  const css=document.createElement('link');
  css.rel='stylesheet';css.href='predictions.css';document.head.appendChild(css);
  if(isAdmin){
    document.addEventListener('DOMContentLoaded',()=>{
      const s=document.createElement('script');s.src='predictions.js';document.body.appendChild(s);
    },{once:true});
  }else{
    document.write('<script src="predictions.js"><\\/script>');
  }
})();
