(async()=>{
'use strict';
if(window.EFC_SIDEBAR_LOCK_V30?.ready)return;
const waitUntil=async(check,timeout=15000)=>{const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Sidebar lock v30 timed out.');await new Promise(resolve=>setTimeout(resolve,20));}};
await waitUntil(()=>window.EFC_COURSES_CENTERS_REDESIGN_V23?.ready&&window.EFC_COURSES_CENTERS_REDESIGN_V23?.detailFixConsolidated&&window.EFC_PERIOD_SEARCH_REDESIGN_V28?.ready&&window.EFC_PERIOD_SEARCH_REDESIGN_V28?.countGridConsolidated&&typeof window.shell==='function');

const style=document.createElement('style');
style.id='efc-sidebar-lock-style-v30';
style.textContent=`
/* Registration sidebar is the single source of truth on every page. */
html body .shell.shell-v13{min-width:0!important;min-height:100vh!important;overflow-x:hidden!important}
html body .shell.shell-v13 aside{
  position:fixed!important;top:0!important;right:0!important;bottom:0!important;
  width:clamp(230px,18vw,268px)!important;padding:22px 16px 18px!important;
  display:flex!important;flex-direction:column!important;box-sizing:border-box!important;
  background:linear-gradient(180deg,#075445 0%,#05473d 48%,#033d35 100%)!important;
  color:#fff!important;box-shadow:-10px 0 35px rgba(5,55,47,.08)!important;
  font-family:"Segoe UI Variable","Segoe UI",Tahoma,Arial,sans-serif!important;
  overscroll-behavior:contain!important;
}
html body .shell.shell-v13 main{
  margin-right:clamp(230px,18vw,268px)!important;width:calc(100% - clamp(230px,18vw,268px))!important;
  height:100dvh!important;max-height:100dvh!important;min-height:0!important;min-width:0!important;
  overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain!important;scrollbar-gutter:auto!important;
}
html body .shell.shell-v13 main>.efc-taskbar-safe-space-v30{display:none!important}
html body .shell.shell-v13 aside .brand{
  display:flex!important;align-items:center!important;gap:11px!important;
  padding:0 3px 18px!important;border-bottom:1px solid rgba(255,255,255,.18)!important;box-sizing:border-box!important;
}
html body .shell.shell-v13 aside .brand .logo{
  width:50px!important;height:50px!important;min-width:50px!important;max-width:50px!important;flex:0 0 50px!important;
  padding:4px!important;border-radius:12px!important;background:#fff!important;display:grid!important;place-items:center!important;
  overflow:hidden!important;box-sizing:border-box!important;
}
html body .shell.shell-v13 aside .brand .logo img{
  width:42px!important;height:42px!important;max-width:42px!important;max-height:42px!important;
  padding:0!important;margin:auto!important;object-fit:contain!important;object-position:center center!important;transform:none!important;place-self:center!important;
}
html body .shell.shell-v13 aside .brand>div:last-child{min-width:0!important;display:block!important}
html body .shell.shell-v13 aside .brand b{
  display:grid!important;gap:1px!important;margin:0!important;line-height:1.22!important;color:#fff!important;text-align:right!important;
}
html body .shell.shell-v13 aside .brand b span:first-child{font-size:15.5px!important;font-weight:850!important}
html body .shell.shell-v13 aside .brand b span:last-child{font-size:13px!important;font-weight:800!important;white-space:nowrap!important}
html body .shell.shell-v13 aside .brand small{display:block!important;margin-top:3px!important;color:#b9d9cf!important;font-size:9px!important;line-height:1.3!important}
html body .shell.shell-v13 aside nav{display:grid!important;gap:5px!important;padding-top:18px!important;font-family:inherit!important}
html body .shell.shell-v13 aside nav a{
  display:flex!important;align-items:center!important;min-height:48px!important;padding:8px 13px!important;
  border:1px solid transparent!important;border-radius:11px!important;color:#e2f0eb!important;text-decoration:none!important;
  font-size:13.5px!important;font-weight:650!important;line-height:1.25!important;gap:11px!important;box-sizing:border-box!important;
}
html body .shell.shell-v13 aside nav a i{width:24px!important;height:24px!important;min-width:24px!important;max-width:24px!important;display:grid!important;place-items:center!important;font-style:normal!important;text-align:center!important}
html body .shell.shell-v13 aside nav a i svg{width:23px!important;height:23px!important}
html body .shell.shell-v13 aside nav a:hover{background:rgba(255,255,255,.08)!important;color:#fff!important}
html body .shell.shell-v13 aside nav a.active{background:linear-gradient(90deg,rgba(38,181,139,.26),rgba(255,255,255,.06))!important;color:#fff!important;border-color:rgba(93,216,179,.44)!important;box-shadow:inset 6px 0 #35c99a,0 8px 20px rgba(0,0,0,.08)!important}
html body .shell.shell-v13 aside .side-foot{margin-top:auto!important;border-top:1px solid rgba(255,255,255,.18)!important;padding-top:12px!important;display:grid!important;gap:7px!important}
html body .shell.shell-v13 aside .production-side-note{display:none!important}
html body .shell.shell-v13 aside .user-controls-v13{gap:7px!important;border:0!important;padding:0!important}
html body .shell.shell-v13 aside .user-controls-v13 small{font-size:10px!important;color:#d6eae3!important;text-align:center!important}
html body .shell.shell-v13 aside .user-controls-v13 button{min-height:42px!important;border:1px solid rgba(255,255,255,.24)!important;border-radius:11px!important;background:rgba(255,255,255,.04)!important;color:#fff!important;font-family:inherit!important;font-size:12.5px!important}
html body .efc-bell-v13{top:34px!important;left:22px!important;width:48px!important;height:48px!important;border-radius:13px!important;font-size:18px!important}
html body .efc-bell-v13>b{min-width:21px!important;height:21px!important;line-height:21px!important;font-size:10px!important}

/* Settings must shrink with the available main workspace instead of forcing 900px. */
html body .content:has(.settings-grid-prod){
  width:min(900px,calc(100% - 32px))!important;max-width:900px!important;min-width:0!important;
  margin:0 auto!important;padding:12px 0 24px!important;box-sizing:border-box!important;
}
html body .content:has(.settings-grid-prod) .settings-grid-prod{width:100%!important;max-width:100%!important;min-width:0!important}

/* Registration's sidebar-to-content breathing room, only on pages already redesigned. */
html body.efc-specialties-redesign-v23 .shell.shell-v13 main>.content,
html body.efc-period-redesign-v28 .shell.shell-v13 main>.content{margin-right:22px!important;margin-left:0!important}

/* Exact registration hero card treatment for the two redesigned pages; only icon/title content changes. */
html body.efc-specialties-redesign-v23 .page-title,
html body.efc-period-redesign-v28 .efc-period-hero-v28{
  position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;
  width:min(470px,calc(100% - 24px))!important;min-width:0!important;max-width:470px!important;
  height:76px!important;min-height:76px!important;max-height:76px!important;
  margin:0 auto 18px!important;padding:0!important;border:0!important;border-radius:17px!important;
  background:linear-gradient(135deg,#e4f8f0,#d4efe5)!important;
  box-shadow:0 10px 30px rgba(20,102,76,.05)!important;color:#073f35!important;box-sizing:border-box!important;
}
html body.efc-specialties-redesign-v23 .page-title>div{width:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:18px!important}
html body.efc-specialties-redesign-v23 .page-title h1,
html body.efc-period-redesign-v28 .efc-period-hero-v28 h1{margin:0!important;font-size:31px!important;line-height:1!important;font-weight:850!important;white-space:nowrap!important;letter-spacing:-.3px!important;color:#073f35!important}
html body.efc-specialties-redesign-v23 .efc-page-icon-v23,
html body.efc-period-redesign-v28 .efc-period-hero-v28>svg{display:grid!important;place-items:center!important;flex:0 0 42px!important;width:42px!important;height:42px!important;color:#073f35!important}
html body.efc-specialties-redesign-v23 .efc-page-icon-v23 svg,
html body.efc-period-redesign-v28 .efc-period-hero-v28>svg{width:42px!important;height:42px!important}
html body.efc-specialties-redesign-v23 .page-title::after,
html body.efc-period-redesign-v28 .efc-period-hero-v28::after{content:''!important;position:absolute!important;bottom:9px!important;left:50%!important;transform:translateX(-50%)!important;width:48px!important;height:3px!important;border-radius:6px!important;background:#0a7f62!important}

@media(max-width:1260px){html body .shell.shell-v13 aside{width:230px!important}html body .shell.shell-v13 main{margin-right:230px!important;width:calc(100% - 230px)!important}}
@media(max-width:1080px){
  html body .shell.shell-v13 aside{width:205px!important;padding-left:12px!important;padding-right:12px!important}
  html body .shell.shell-v13 main{margin-right:205px!important;width:calc(100% - 205px)!important}
  html body .content:has(.settings-grid-prod) .settings-grid-prod{grid-template-columns:1fr!important;grid-template-rows:auto!important}
  html body .content:has(.settings-grid-prod) .settings-card-prod.backup-prod,
  html body .content:has(.settings-grid-prod) .settings-card-prod.restore-prod,
  html body .content:has(.settings-grid-prod) .settings-card-prod.methods-settings-v13,
  html body .content:has(.settings-grid-prod) .settings-card-prod.security-settings-v13{grid-column:1!important;grid-row:auto!important;height:auto!important;min-height:145px!important}
  html body .content:has(.settings-grid-prod) .settings-card-prod.methods-settings-v13,
  html body .content:has(.settings-grid-prod) .settings-card-prod.security-settings-v13{min-height:230px!important}
  html body .content:has(.settings-grid-prod) .methods-list-v13,
  html body .content:has(.settings-grid-prod) .users-list-v13{max-height:145px!important}
}
@media(max-width:900px){
  html body .shell.shell-v13 aside{width:190px!important}
  html body .shell.shell-v13 main{margin-right:190px!important;width:calc(100% - 190px)!important}
  html body .shell.shell-v13 aside .brand b span:first-child{font-size:14px!important}
  html body .shell.shell-v13 aside .brand b span:last-child{font-size:11.5px!important}
  html body .shell.shell-v13 aside nav a{font-size:12px!important;padding-left:9px!important;padding-right:9px!important;gap:8px!important}
  html body .content:has(.settings-grid-prod){width:calc(100% - 20px)!important}
}
@media(max-height:760px){
  html body .shell.shell-v13 main{scroll-padding-bottom:56px!important}
  html body .shell.shell-v13 main>.efc-taskbar-safe-space-v30{display:block!important;width:100%!important;height:56px!important;min-height:56px!important;pointer-events:none!important}
  html body .shell.shell-v13 aside{padding-top:12px!important;padding-bottom:10px!important;overflow-y:auto!important;scrollbar-width:thin!important}
  html body .shell.shell-v13 aside .brand{padding-bottom:10px!important;gap:8px!important}
  html body .shell.shell-v13 aside .brand .logo{width:44px!important;height:44px!important;min-width:44px!important;max-width:44px!important;flex-basis:44px!important}
  html body .shell.shell-v13 aside .brand .logo img{width:37px!important;height:37px!important}
  html body .shell.shell-v13 aside nav{padding-top:10px!important;gap:3px!important}
  html body .shell.shell-v13 aside nav a{min-height:40px!important;padding-top:5px!important;padding-bottom:5px!important}
  html body .shell.shell-v13 aside nav a i{width:21px!important;height:21px!important;min-width:21px!important;max-width:21px!important}
  html body .shell.shell-v13 aside nav a i svg{width:20px!important;height:20px!important}
  html body .shell.shell-v13 aside .side-foot{padding-top:7px!important;gap:4px!important}
  html body .shell.shell-v13 aside .user-controls-v13{gap:4px!important}
  html body .shell.shell-v13 aside .user-controls-v13 button{min-height:35px!important;font-size:11px!important}
  html body .efc-bell-v13{top:18px!important;width:42px!important;height:42px!important}
}
@media(max-height:640px){
  html body .shell.shell-v13 aside{padding-top:8px!important;padding-bottom:8px!important}
  html body .shell.shell-v13 aside .brand{padding-bottom:7px!important}
  html body .shell.shell-v13 aside .brand small{display:none!important}
  html body .shell.shell-v13 aside nav{padding-top:7px!important;gap:2px!important}
  html body .shell.shell-v13 aside nav a{min-height:36px!important;font-size:11.5px!important;padding-top:3px!important;padding-bottom:3px!important}
  html body .shell.shell-v13 aside .side-foot{padding-top:5px!important}
  html body .shell.shell-v13 aside .user-controls-v13 button{min-height:32px!important}
}
`;
document.head.appendChild(style);

window.EFC_SIDEBAR_LOCK_V30=Object.freeze({
  ready:true,singleSidebarDesignSource:true,registrationSidebarLockedGlobally:true,unfinishedPagesSidebarOnly:true,
  redesignedPagesUseRegistrationGap:true,redesignedTitlesMatchRegistrationHero:true,
  responsiveSmallViewport:true,settingsFitAvailableWidth:true,shortScreenSidebarScrollFallback:true,mainViewportScroll:true,taskbarSafeBottomClearance:true,singleMainScrollOwner:true,
  centeredBrandLogo:true,noStyleReordering:true,noMutationObserverLoop:true,canonicalTaskbarSpacer:true
});
})();
