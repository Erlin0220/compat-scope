import test from 'node:test';
import assert from 'node:assert/strict';
import {scan} from './scan.js';
test('静态方法按对象名；实例方法按名称，包含同名业务方法，跳过未命中项',()=>{
  const rows=scan([{name:'app.js',content:'Object.hasOwn({}, "x"); other.hasOwn(); model.at(0); customer.ownMethod();'}]);
  assert.deepEqual(rows.map(r=>r.label),['Object.hasOwn','Array.prototype.at']);
  assert.deepEqual(rows[1].probe,['path',['Array','prototype','at'],true]);
});
test('保留已保护调用，不加载补丁；同名局部变量不是全局 API',()=>{
  const rows=scan([{name:'app.js',content:'if(window.ResizeObserver) new ResizeObserver(f); function foo(fetch){fetch()} navigator.clipboard.writeText("x");'}]);
  assert.ok(rows.some(r=>r.label==='ResizeObserver'));assert.ok(rows.some(r=>r.label==='navigator.clipboard.writeText'));assert.ok(!rows.some(r=>r.label==='fetch'));
});
test('扫描打包 HTML 及内联资源，保留实际行号，忽略非 JS 脚本',()=>{
 const rows=scan([{name:'index.html',content:'<script type="application/json">{"a":1}</script>\n<dialog popover></dialog>\n<script>\nfetch("/data"); user?.name;\n</script><style>.a:has(b){color:oklch(50% 0 0)}</style>'}]);
 for(const key of ['<dialog>','popover','fetch','?.',':has','oklch()'])assert.ok(rows.some(x=>x.label===key),key);
 assert.deepEqual(rows.find(r=>r.label==='fetch').locations,['index.html:4']);
});
