<h1><img src="./assets/compatscope.svg" width="52" height="52" align="absmiddle" alt=""> CompatScope</h1>

构建项目后运行 `compat-scope ./dist`，把生成的 `dist/compat.html` 放到网站上，或直接发给用户。这个单文件在打开它的浏览器里运行，不依赖服务器、CDN 或项目补丁。

使用 Node.js 22.13+（22.x）或 24+。从本机项目接入：在业务仓库执行 `npm install -D /Volumes/KIOXIA-500G/project/compat-scope`。也可用 `npm install -D /path/to/compat-scope-0.1.0.tgz` 安装独立包，然后运行：

    npx compat-scope ./dist --name 我的项目

也可指定输出位置：`--out ./browser-check.html`。不指定输入时扫描当前目录下的 dist。命令不会覆盖非本工具生成的文件；重复运行会排除旧报告。

从源码试用：在本仓库执行 `npm ci`，再运行 `node cli.js examples/build --name 示例项目`，打开生成的 `examples/build/compat.html`。测试命令为 `npm test`。

## 判读

报告列出浏览器自报的名称、版本、UA、逐项检测结果、10 种浏览器／平台的原生支持起始版本和构建文件行号，可一键复制完整诊断文本。当前结果基于本页的顶层 Window 环境；同站部署更有助于复现安全上下文。它不加载业务代码，也不验证权限、业务结果或整个应用能否运行。

扫描 JS、MJS、CSS、HTML 及 HTML 内联脚本和样式。JS 识别直接引用的全局对象、已映射的 Web API 成员、内置静态方法、现代原型方法及部分现代语法；CSS、HTML 使用特性规则（如 :has、容器查询、dialog、popover）。不会穷举全部技术或追踪动态生成的代码、别名、Worker 环境或运行时下载的外部资源。

原型方法遵循 compat-audit 的名称匹配：同名条目选索引中第一个；业务对象的同名属性也会命中。不把未匹配的名称算作缺失，不排除在 guard 中使用的 API，也不分析 polyfill。

“已提供”表示本页环境通过能力探测；“未提供”表示未暴露相应能力或未接受该语法；环境限制或缺少可靠探测则为“未确认”。JS 语法仅编译内置测试片段，不执行产物中的代码。方法只检查存在及函数类型，不调用业务 API。最低版本表使用 npm 包固定版本的 MDN Browser Compat Data（CC0）；部分实现、开关和前缀单独标注。
