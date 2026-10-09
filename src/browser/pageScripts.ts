/**
 * Minimal page scripts for Orizen browser actions.
 * Privacy: these scripts only read transient page state and report a single
 * http(s) URL back. Nothing is stored. All messages are scheme-validated
 * before use on the native side.
 */

/** Long-press (550ms, no scroll) on a link reports its URL for the link menu. */
export const LINK_MENU_SCRIPT = `(function(){try{
if(window.__orizenLinkMenuInstalled)return;window.__orizenLinkMenuInstalled=true;
var timer=null,startX=0,startY=0;
function anchorAt(x,y){var el=document.elementFromPoint(x,y);while(el&&el!==document.body){if(el.tagName==='A'&&el.href)return el;el=el.parentElement;}return null;}
document.addEventListener('touchstart',function(e){try{if(e.touches.length!==1)return;var t=e.touches[0];startX=t.clientX;startY=t.clientY;var x=t.clientX,y=t.clientY;timer=setTimeout(function(){var a=anchorAt(x,y);if(a&&a.href){window.ReactNativeWebView.postMessage(JSON.stringify({type:'orizen-link',url:String(a.href)}));}},550);}catch(err){}},{passive:true});
function cancel(){if(timer){clearTimeout(timer);timer=null;}}
document.addEventListener('touchmove',function(e){try{if(e.touches.length!==1)return;var t=e.touches[0];if(Math.abs(t.clientX-startX)>12||Math.abs(t.clientY-startY)>12)cancel();}catch(err){}},{passive:true});
document.addEventListener('touchend',cancel,{passive:true});
document.addEventListener('touchcancel',cancel,{passive:true});
document.addEventListener('contextmenu',function(e){try{e.preventDefault();}catch(err){}});
}catch(err){}})();true;`;

/** Escape a search term for safe injection (JSON string literal). */
export function findTermLiteral(term: string): string {
  return JSON.stringify(term.slice(0, 200));
}

export const FIND_SCRIPT = `(function(){try{
window.__orizenFindClear&&window.__orizenFindClear();
var term=__ORIZEN_TERM__;
if(!term){window.ReactNativeWebView.postMessage(JSON.stringify({type:'orizen-find',count:0,index:0}));return;}
term=term.toLowerCase();
var matches=[];
function walk(node){if(node.nodeType===3){var text=node.nodeValue||'';var lower=text.toLowerCase();var from=0;var hits=[];var at;while((at=lower.indexOf(term,from))>=0){hits.push(at);from=at+term.length;}if(hits.length){var frag=document.createDocumentFragment();var last=0;for(var i=0;i<hits.length;i++){var s=hits[i];frag.appendChild(document.createTextNode(text.slice(last,s)));var span=document.createElement('span');span.setAttribute('data-orizen-find','1');span.style.backgroundColor='rgba(124,134,255,0.55)';span.style.borderRadius='2px';span.textContent=text.substr(s,term.length);frag.appendChild(span);matches.push(span);last=s+term.length;}frag.appendChild(document.createTextNode(text.slice(last)));if(node.parentNode)node.parentNode.replaceChild(frag,node);}}else if(node.nodeType===1){var tag=node.tagName;if(tag==='SCRIPT'||tag==='STYLE'||tag==='NOSCRIPT'||tag==='TEXTAREA'||tag==='INPUT')return;var kids=Array.prototype.slice.call(node.childNodes);for(var k=0;k<kids.length;k++)walk(kids[k]);}}
walk(document.body);
window.__orizenFindMatches=matches;window.__orizenFindIndex=-1;
window.__orizenFindClear=function(){try{var spans=document.querySelectorAll('span[data-orizen-find]');for(var i=0;i<spans.length;i++){var sp=spans[i];var parent=sp.parentNode;if(!parent)continue;parent.replaceChild(document.createTextNode(sp.textContent||''),sp);parent.normalize();}window.__orizenFindMatches=[];window.__orizenFindIndex=-1;}catch(err){}};
window.__orizenFindNav=function(dir){try{var list=window.__orizenFindMatches||[];if(!list.length){window.ReactNativeWebView.postMessage(JSON.stringify({type:'orizen-find',count:0,index:0}));return;}for(var i=0;i<list.length;i++)list[i].style.backgroundColor='rgba(124,134,255,0.55)';var idx=window.__orizenFindIndex;idx=dir>0?(idx+1)%list.length:(idx-1+list.length)%list.length;window.__orizenFindIndex=idx;var cur=list[idx];cur.style.backgroundColor='rgba(255,176,32,0.85)';try{cur.scrollIntoView({block:'center',behavior:'smooth'});}catch(err){}window.ReactNativeWebView.postMessage(JSON.stringify({type:'orizen-find',count:list.length,index:idx+1}));}catch(err){}};
window.__orizenFindNav(1);
}catch(err){}})();true;`;

export const FIND_CLEAR_SCRIPT = `(function(){try{window.__orizenFindClear&&window.__orizenFindClear();}catch(err){}})();true;`;

export const FIND_NAV_SCRIPT = `(function(){try{window.__orizenFindNav&&window.__orizenFindNav(__ORIZEN_DIR__);}catch(err){}})();true;`;

export function buildFindScript(term: string): string {
  return FIND_SCRIPT.replace('__ORIZEN_TERM__', findTermLiteral(term));
}

export function buildFindNavScript(dir: 1 | -1): string {
  return FIND_NAV_SCRIPT.replace('__ORIZEN_DIR__', String(dir));
}
