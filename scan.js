import bcd from '@mdn/browser-compat-data' with { type: 'json' };
import { parse as parseJS } from 'acorn';
import { ancestor } from 'acorn-walk';
import { analyze } from 'eslint-scope';
import * as css from 'css-tree';
import { parse as parseHTML } from 'parse5';

const browsers = ['chrome','edge','firefox','safari','safari_ios','chrome_android','firefox_android','samsunginternet_android','webview_android','webview_ios'];
export const dataVersion = bcd.__meta.version;
const builtin = bcd.javascript.builtins;
const prototypes = new Map();
// Like compat-audit: the first modern prototype entry with this name wins.
const skip = new Set('constructor toString toLocaleString valueOf hasOwnProperty isPrototypeOf propertyIsEnumerable slice concat join indexOf lastIndexOf forEach map filter reduce reduceRight some every sort reverse push pop shift unshift splice split substring substr charAt charCodeAt replace search toLowerCase toUpperCase trim description flags byteLength length name size source message register unregister resize detached values entries keys'.split(' '));
for (const [owner, obj] of Object.entries(builtin)) {
  for (const [key, entry] of Object.entries(obj)) {
    const c = entry.__compat;
    if (!c || skip.has(key) || prototypes.has(key)) continue;
    const modern = Object.entries({chrome:51,edge:15,firefox:54,safari:10,safari_ios:10,chrome_android:51,samsunginternet_android:5}).some(([b,v]) => parseFloat([c.support[b]].flat()[0]?.version_added) > v);
    if (modern && [c.spec_url].flat().some(url => url?.includes('.prototype.'))) prototypes.set(key, owner);
  }
}

function version(entry) {
  if (!entry) return '未知';
  return [entry].flat().map(s => {
    if (s.version_added === false) return '不支持';
    const n = s.version_added === true ? '版本未知' : s.version_added ?? '未知';
    return [n, s.partial_implementation && '部分', s.flags && '需开关', s.prefix && '前缀 '+s.prefix, s.alternative_name && '别名 '+s.alternative_name, s.version_removed && '已移除 '+s.version_removed].filter(Boolean).join(' · ');
  }).join(' / ');
}
const roots = {navigator:'Navigator',document:'Document',crypto:'Crypto',location:'Location',performance:'Performance',history:'History',console:'console',screen:'Screen',CSS:'CSS',localStorage:'Storage',sessionStorage:'Storage',URL:'URL'};
const nested = {'navigator.clipboard':'Clipboard','navigator.mediaDevices':'MediaDevices','navigator.geolocation':'Geolocation','navigator.serviceWorker':'ServiceWorkerContainer','crypto.subtle':'SubtleCrypto','navigator.gpu':'GPU','document.fonts':'FontFaceSet'};
const syntax = {
  '?.':['optional_chaining','var a={}; a?.b'],
  '??':['nullish_coalescing','return null ?? 0'],
  '??=':['nullish_coalescing_assignment','var a; a ??= 1'],
  '||=':['logical_or_assignment','var a; a ||= 1'],
  '&&=':['logical_and_assignment','var a; a &&= 1'],
  'import()':['import','return import("about:blank")']
};
export function scan(files) {
  const rows = new Map();
  for (const {name:file, content} of files) {
    function add(label,category,entry,probe,line) {
      const c = entry?.__compat;
      if (!c) return;
      if (!rows.has(label)) rows.set(label,{label,category,probe,support:browsers.map(b=>version(c.support[b])),locations:new Set()});
      const row=rows.get(label);
      if(probe[0]==='path' && probe[2])row.probe[2]=true;
      row.locations.add(file+':'+line);
    }
    function js(code, offset=0) {
      let ast;
      try { ast=parseJS(code,{ecmaVersion:'latest',sourceType:'module',locations:true,ranges:true}); }
      catch { ast=parseJS(code,{ecmaVersion:'latest',sourceType:'script',locations:true,ranges:true}); }
      const free=new Set(analyze(ast,{ecmaVersion:2024,sourceType:ast.sourceType,ignoreEval:true}).globalScope.through.map(r=>r.identifier));
      function path(node) {
        if(node.type==='Identifier' && free.has(node)) return ['window','self','globalThis'].includes(node.name) ? [] : [node.name];
        if(node.type==='MemberExpression') {
          const p = path(node.object), key=node.computed ? node.property.value : node.property.name;
          if(p && typeof key==='string') return [...p,key];
        }
      }
      ancestor(ast,{
        Identifier(node,_,anc) {
          if (!free.has(node) || anc.at(-2)?.object===node) return;
          const key=node.name, entry=bcd.api[key] ?? bcd.api.Window[key] ?? builtin[key];
          add(key,'API',entry,['path',[key],['CallExpression','NewExpression'].includes(anc.at(-2)?.type) && anc.at(-2).callee===node],node.loc.start.line+offset);
        },
        MemberExpression(node,_,anc) {
          const p=path(node), key=node.computed ? node.property.value : node.property.name;
          const line=node.loc.start.line+offset, invoke=anc.at(-2)?.callee===node;
          if(p?.length) {
            const last=p.at(-1), base=p.slice(0,-1).join('.');
            const owner=nested[base] ?? roots[base] ?? base;
            const staticMember=p.length===2 ? bcd.api[base]?.[last+'_static'] : undefined;
            const entry=p.length===1 ? bcd.api[last] ?? bcd.api.Window[last] ?? builtin[last] : staticMember ?? bcd.api[owner]?.[last] ?? builtin[base]?.[last];
            if(entry?.__compat) { add(p.join('.'),builtin[base]?'JS 内置':'Web API',entry,['path',p,invoke],line); return; }
          }
          const owner=prototypes.get(key);
          if(owner) add(owner+'.prototype.'+key,'JS 原型 · 名称匹配',builtin[owner][key],['path',[owner,'prototype',key],invoke],line);
        },
        ChainExpression:n=>op(n,'?.'), LogicalExpression:n=>op(n,n.operator), AssignmentExpression:n=>op(n,n.operator), ImportExpression:n=>op(n,'import()')
      });
      function op(n,key) {
        if(Object.hasOwn(syntax,key)) add(key,'JS 语法',bcd.javascript.operators[syntax[key][0]],['syntax',syntax[key][1]],n.loc.start.line+offset);
      }
    }
    function stylesheet(code,offset=0) {
      const ast=css.parse(code,{positions:true});
      css.walk(ast,n=>{
        if(n.type==='PseudoClassSelector' && ['has','is','where','focus-visible'].includes(n.name)){
          const sel=':'+n.name+(n.name==='focus-visible'?'':'(*)');
          add(':'+n.name,'CSS 选择器',bcd.css.selectors[n.name],['selector',sel],n.loc.start.line+offset);
        }
        if(n.type==='Declaration'){
          const samples={'aspect-ratio':'1 / 1','accent-color':'red','container-type':'inline-size','backdrop-filter':'blur(1px)','content-visibility':'auto'};
          if(Object.hasOwn(samples,n.property)) add(n.property,'CSS 属性',bcd.css.properties[n.property],['css',n.property,samples[n.property]],n.loc.start.line+offset);
        }
        if(n.type==='Function'){
          const colors={'oklch':'oklch(50% 0.1 20)','oklab':'oklab(50% 0 0)','light-dark':'light-dark(black,white)','color-mix':'color-mix(in srgb,red,blue)'};
          if(Object.hasOwn(colors,n.name)) add(n.name+'()','CSS 颜色',bcd.css.types.color[n.name],['css','color',colors[n.name]],n.loc.start.line+offset);
        }
        if(n.type==='Atrule') add('@'+n.name,'CSS 规则',bcd.css['at-rules'][n.name],['at',n.name],n.loc.start.line+offset);
      });
    }
    if(/\.m?js$/i.test(file)) js(content);
    else if(/\.css$/i.test(file)) stylesheet(content);
    else {
      const doc=parseHTML(content,{sourceCodeLocationInfo:true});
      function visit(n) {
        const loc=n.sourceCodeLocation, tag=n.tagName;
        if(loc && tag) {
          const attrs=Object.fromEntries(n.attrs.map(a=>[a.name,a.value])), line=loc.startLine;
          if(tag==='dialog') add('<dialog>','HTML 元素',bcd.html.elements.dialog,['element','dialog','showModal'],line);
          if('popover' in attrs) add('popover','HTML 属性',bcd.html.global_attributes.popover,['element','div','popover'],line);
          if((tag==='img'||tag==='iframe') && attrs.loading==='lazy') add(tag+'[loading=lazy]','HTML 属性',bcd.html.elements[tag].loading,['element',tag,'loading'],line);
          if(tag==='script' && !attrs.src && /^(|module|(?:text|application)\/(?:java|ecma)script)$/i.test((attrs.type??'').trim())) js(n.childNodes.map(c=>c.value).join(''),loc.startTag.endLine-1);
          if(tag==='style') stylesheet(n.childNodes.map(c=>c.value).join(''),loc.startTag.endLine-1);
        }
        for(const child of n.childNodes??[]) visit(child);
        if(n.content) visit(n.content);
      }
      visit(doc);
    }
  }
  return Array.from(rows.values(),r=>({...r,locations:[...r.locations]}));
}
