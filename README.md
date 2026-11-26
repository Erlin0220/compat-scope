<h1 align="center"><img src="./assets/compatscope.svg" alt="" width="42" height="42" align="absmiddle"> CompatScope</h1>
<p align="center"><strong>把前端构建产物变成一张自检页，让用户用出问题的浏览器打开它。</strong></p>
<p align="center"><strong>简体中文</strong> · <a href="./README.en.md" lang="en">English</a> · <a href="https://github.com/Erlin0220/compat-scope/releases/latest">最新版本</a></p>

同一个功能在你的电脑上正常，在用户的浏览器里却没反应。CompatScope 扫描发布目录里的 JS、CSS 和 HTML，生成一个独立的 `compat.html`。用户打开后，你可以看到**哪个 API 在当前环境里没找到、构建产物在哪里用到了它，以及其他浏览器从哪个版本开始支持它**。

**[下载示例报告](https://github.com/Erlin0220/compat-scope/releases/download/v0.1.0/compat-example.html)**，用自己的浏览器打开就能试，无需安装。也可以直接[生成项目报告](#生成项目报告)。

![深色模式下的示例报告：首页展示浏览器概要、兼容性诊断和检测表。Chrome 中唯一未提供的能力是 GestureEvent，位于 assets.js:15。](./assets/report-preview.png)

图中是[示例构建](https://github.com/Erlin0220/compat-scope/blob/v0.1.0/examples/build/assets.js#L14-L16)在 Chrome 中的结果。`GestureEvent` 出现在第 15 行，但代码先检查了它是否存在。**红色表示这个环境没提供该能力，不等于这行代码会报错。**

## 生成项目报告

先用项目原有的命令构建前端，再从项目根目录运行下面这条命令。需要 Node.js 22.13 或更新的 22.x，或 Node.js 24 及以上；不需要把 CompatScope 装进项目。v0.1.0 从 GitHub Releases 分发。

```sh
npx --yes https://github.com/Erlin0220/compat-scope/releases/download/v0.1.0/compat-scope-0.1.0.tgz ./dist
```

**打开 `dist/compat.html`。** 可以把文件直接发给用户，也可以随本次构建一起部署，把链接发给用户。后者更适合排查受页面环境影响的 API。报告可离线打开，不加载业务代码，也不会自动上传检测结果。

### 接入 npm 或 pnpm 项目

需要每次发版都生成报告时，用项目现有的包管理器把 CLI 加为开发依赖：

```sh
# npm
npm install -D https://github.com/Erlin0220/compat-scope/releases/download/v0.1.0/compat-scope-0.1.0.tgz

# pnpm（在前端应用包目录执行）
pnpm add -D https://github.com/Erlin0220/compat-scope/releases/download/v0.1.0/compat-scope-0.1.0.tgz
```

在 `package.json` 的 `scripts` 中添加 `"compat": "compat-scope ./dist --name Portal"`，构建完成后运行 `npm run compat` 或 `pnpm run compat`。不要用 npm 给已有的 pnpm workspace 安装依赖。

### CLI 参数

| 参数 | 用途 | 默认值 |
| --- | --- | --- |
| `[目录]` | 要扫描的前端构建目录 | `./dist` |
| `--name <名称>` | 报告里的项目名称，可带上发布版本 | 构建目录名 |
| `--out <路径>` | HTML 输出位置，相对路径从当前工作目录算起 | 构建目录下的 `compat.html` |
| `-h, --help` | 查看用法 | — |

## 拿到用户的报告后，先看什么？

先确认项目版本和浏览器，再把「检测结果」切到「未提供」。每条记录都带有**构建文件和行号**；下面的版本表来自 [MDN Browser Compat Data](https://github.com/mdn/browser-compat-data)，用于对照，不代替当前设备的检测。「复制内容到剪贴板」复制的是完整诊断文本，不受筛选影响。

| 页面状态 | 对开发者意味着什么 |
| --- | --- |
| **已提供** | 当前页面通过了该项探测。比如检测到了 `navigator.clipboard.writeText` 方法，但没有尝试写入剪贴板。 |
| **未提供** | 当前页面没有暴露该能力，或浏览器不接受这项语法。到标出的文件位置，查看它是必需调用还是可选分支。 |
| **未确认** | 没有可靠的探测方式，或探测受到限制。不要按“不支持”处理。 |

**问题发生在 iframe 里？** 分别扫描主应用与内嵌应用的产物，并在对应环境中打开各自的报告。主页面不会自动扫描 iframe 的代码，它的绿项也不能代表子页面的权限和可用能力。

## 扫描范围

- **JavaScript**：识别规则覆盖的 Web API、内置方法和现代语法，例如 `AbortSignal.any()`、`Object.hasOwn()` 和 `?.`。原型方法按名称匹配：业务对象的 `.at()` 也可能命中，请结合使用位置判断。
- **CSS 和 HTML**：识别部分选择器、属性、规则、元素和属性用法，例如 `:has()`、`aspect-ratio`、`<dialog>` 和 `popover`，也会扫描 HTML 中的内联脚本和样式。
- **范围以本次构建为准**：不执行打包代码，不追踪运行时下载的资源或所有别名，不推断项目补丁与降级逻辑。版本表提供 10 个桌面、移动及 WebView 平台条目，不给整个应用判定一个最低浏览器版本。

## 从源码运行

```sh
git clone https://github.com/Erlin0220/compat-scope.git
cd compat-scope
npm ci
node cli.js examples/build --name "CompatScope Demo"
npm test
```

示例输出在 `examples/build/compat.html`。遇到漏检或误报，可以[提交 Issue](https://github.com/Erlin0220/compat-scope/issues)，附上最小的构建代码片段、实际结果和预期结果。原型方法匹配参考了 [compat-audit](https://github.com/Goodzilla/compat-audit)，详见 [NOTICE](./NOTICE)。
