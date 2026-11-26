#!/usr/bin/env node
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,relative,join,basename} from 'node:path';
import {parseArgs} from 'node:util';
import {scan,dataVersion} from './scan.js';
const {positionals,values}=parseArgs({allowPositionals:true,options:{out:{type:'string'},name:{type:'string'},help:{type:'boolean',short:'h'}}});
if(values.help || positionals.length>1){
  console.log('compat-scope [构建目录，默认 dist] [--out 报告.html] [--name 项目名称]');
  process.exit(values.help?0:1);
}
const root=resolve(positionals[0]??'dist'), output=resolve(values.out??join(root,'compat.html'));
const marker='<!doctype html><!-- generated:compat-scope -->';
async function main(){
  let previous;
  try {previous=await readFile(output,'utf8')} catch(e){if(e.code!=='ENOENT')throw e}
  if(previous!==undefined && !previous.startsWith(marker)) throw Error('输出路径已有其他文件，请用 --out 另选路径：'+output);
  let count=0;
  const all=new Map();
  async function walk(dir){
    for(const e of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
      const full=join(dir,e.name);
      if(e.isDirectory()){await walk(full);continue}
      if(full===output || !e.isFile() || !/\.(m?js|css|html?)$/i.test(e.name))continue;
      const content=await readFile(full,'utf8');
      if(content.startsWith(marker))continue;
      const name=relative(root,full);
      let entries;
      try {entries=scan([{name,content}])}catch(e){throw Error('无法解析 '+name+'：'+e.message)}
      count++;
      for(const r of entries){
        const previous=all.get(r.label);
        if(previous){
          for(const location of r.locations) previous.locations.push(location);
          if(r.probe[0]==='path' && r.probe[2])previous.probe[2]=true;
        }else all.set(r.label,r);
      }
    }
  }
  await walk(root);
  if(!count)throw Error('目录内没有 JS、CSS 或 HTML 构建产物：'+root);
  const payload={name:values.name??basename(root),version:dataVersion,files:count,rows:[...all.values()]};
  const template=await readFile(new URL('report.html',import.meta.url),'utf8');
  const logo=await readFile(new URL('assets/compatscope.svg',import.meta.url),'base64');
  const json=JSON.stringify(payload).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
  await writeFile(output,template.replaceAll('COMPATSCOPE_LOGO','data:image/svg+xml;base64,'+logo).replace('/*PAYLOAD*/null',()=>json));
  console.log(count+' 个文件 · '+all.size+' 项能力 → '+output);
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
