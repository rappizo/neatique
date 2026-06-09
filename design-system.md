# Neatique Beauty Design System

版本：v1.0  
日期：2026-06-09  
范围：主色、辅色、字体、按钮、卡片、圆角、阴影、动画

## 1. 设计定位

Neatique Beauty 的视觉系统服务于一个面向美国市场的现代护肤品牌独立站。整体气质应当是柔和、专业、干净、有日常坚持感，而不是医疗化、实验室化或夸张功效化。

### 设计关键词

- Soft clinical：有专业感，但保持温柔和亲近。
- Warm premium：以暖珊瑚、奶白、桃粉为主，体现护肤品的舒适和光泽。
- Everyday ritual：页面节奏清楚，适合反复浏览、购买、阅读和参与奖励活动。
- Content friendly：商品、Beauty Tips、Comic、Mascot Rewards 都应在同一品牌视觉下共存。
- Admin efficient：后台延续品牌色，但信息密度更高、操作反馈更明确。

### 视觉原则

- 大图和真实商品视觉优先，装饰只做轻量氛围辅助。
- 大面积背景保持柔白、桃粉、浅暖色，避免过重、过暗或高饱和。
- CTA 使用珊瑚色建立识别，不能到处滥用主色。
- 卡片和表面要有轻玻璃感，但边框、阴影和背景透明度应克制。
- 前台可更柔和，后台要更清晰、高效、可扫读。

## 2. 色彩系统

当前色彩来源以 `app/globals.css` 的 `:root` token 为准。

### 2.1 主色

| Token | 色值 | 用途 |
| --- | --- | --- |
| `--brand` | `#ed7361` | 主 CTA、评分星、重点 icon、主要状态强调 |
| `--brand-deep` | `#d85f4f` | 链接 hover、eyebrow、激活状态、强调文字 |
| `--brand-soft` | `#f7c7bc` | 柔和填充、渐变辅助、品牌背景层 |

### 2.2 背景与表面

| Token | 色值 | 用途 |
| --- | --- | --- |
| `--bg` | `#fff7f2` | 页面主背景 |
| `--bg-strong` | `#fff1ea` | 更强的品牌背景区块 |
| `--surface` | `rgba(255, 255, 255, 0.82)` | 玻璃感卡片、面板、表格 |
| `--surface-solid` | `#fffdfb` | 需要稳定白底的表单、弹层、正文区域 |
| `--surface-brand` | `#fdf0eb` | 品牌色弱背景、精选模块 |

### 2.3 中性色

| Token | 色值 | 用途 |
| --- | --- | --- |
| `--ink` | `#2e2825` | 标题、正文主文本、按钮文字 |
| `--muted` | `#6d6560` | 描述、meta、辅助文本 |
| `--line` | `rgba(46, 40, 37, 0.1)` | 分割线、边框、表格线 |
| White | `#ffffff` | 按钮文字、卡片高光、输入背景 |

### 2.4 辅色

| Token | 色值 | 用途 |
| --- | --- | --- |
| `--sage` | `#d9e2d6` | 护肤、成分、舒缓感模块辅助 |
| `--sand` | `#f0e1d4` | 温暖内容区、产品故事、次级背景 |
| Peach gradient | `#fff7f3` to `#f9dfd5` | 商品图、文章图、空态图片底 |
| Brand gradient | `#ed7361` to `#f08f7f` | Primary CTA、重点徽章 |

### 2.5 状态色

| 状态 | 色值 | 用途 |
| --- | --- | --- |
| Success text | `#2f7a4f` | 成功按钮、兑换成功、同步成功 |
| Success bg | `rgba(85, 168, 117, 0.16)` | 成功状态底色 |
| Success border | `rgba(85, 168, 117, 0.32)` | 成功状态边框 |
| Warning text | `#8a6428` | 待处理、注意、库存提醒 |
| Warning bg | `rgba(255, 251, 238, 0.94)` | Warning pill 背景 |
| Danger text | `#a84738` | 删除、失败、拒绝、错误 |
| Danger border | `rgba(217, 85, 67, 0.32)` | Danger 边框 |

### 2.6 色彩使用规则

- Primary CTA 只用 `--brand` 渐变，不新增其他主 CTA 色。
- 链接和 hover 用 `--brand-deep`，不要用纯红或纯橙。
- 大面积背景用 `--bg`、`--bg-strong`、`--surface-brand`，避免整页单一珊瑚色。
- `--sage` 适合舒缓、成分、奖励、环保感内容，不能替代主 CTA。
- `--sand` 适合温暖说明区、政策内容、轻故事模块。
- 错误状态要用 danger 色系，不要只靠文字提示。
- 深色背景只用于图片遮罩或局部阅读增强，不作为站点主主题。

## 3. 字体系统

### 3.1 字体家族

| 用途 | 字体 |
| --- | --- |
| 品牌名、H1、H2、卡片标题 | `Baskerville`, `"Palatino Linotype"`, serif |
| 正文、导航、按钮、表单、后台 | `"Avenir Next"`, `"Segoe UI"`, sans-serif |

### 3.2 字体层级

| 层级 | 推荐尺寸 | 行高 | 字重 | 用途 |
| --- | --- | --- | --- | --- |
| Display / Hero H1 | `clamp(2rem, 4vw, 3.65rem)` | `1` to `1.08` | 700 | 首页 hero、页面主标题 |
| Section H2 | `clamp(2rem, 4vw, 3.65rem)` | `1.05` | 700 | 主要分区标题 |
| Card H3 | `1.4rem` to `1.6rem` | `1.2` | 700 | 商品卡、文章卡、后台卡片 |
| Body | `1rem` | `1.6` to `1.75` | 400 | 正文、说明、政策内容 |
| Meta | `0.88rem` to `0.92rem` | `1.4` | 500 to 700 | 分类、日期、积分、状态 |
| Button | `0.95rem` to `1rem` | `1` | 700 | CTA、表单提交 |
| Compact | `0.78rem` to `0.86rem` | `1.2` | 600 to 700 | 小标签、后台紧凑按钮 |

### 3.3 字体规则

- 标题优先使用 serif，保持品牌的温柔高级感。
- 正文、后台、表单必须使用 sans-serif，确保可读和高效。
- 新增组件的 letter spacing 默认使用 `0`。
- 只有 uppercase eyebrow 可以使用较大字距，推荐 `0.12em` to `0.16em`。
- 标题不要过度压缩行高，中文或长英文标题需要允许换行。
- 后台页面标题可以使用 serif，但表格、筛选器、输入项不使用 serif。

## 4. 间距与布局

### 4.1 容器

```css
--container: min(1600px, calc(100vw - 32px));
```

- 前台主容器使用 `.container`。
- 页面左右至少保留 `16px` 移动端边距。
- 桌面端内容可以较宽，但正文阅读区域应限制在 `720px` to `880px`。
- 后台主布局使用侧边栏 `280px` 加内容区，内容区 padding 为 `32px`。

### 4.2 Section

| 类型 | 间距 |
| --- | --- |
| 默认 section | `padding: clamp(42px, 5vw, 56px) 0` |
| Product section | 顶部更紧，`clamp(18px, 2.8vw, 30px)` |
| Account section | `clamp(24px, 3.2vw, 34px)` |
| 相邻 section | 第二段可减少顶部 padding |

### 4.3 Grid

- 商品列表桌面端最多 3 列。
- 文章列表桌面端最多 3 列。
- 双卡内容使用 2 列，`max-width: 1080px` 后降到 1 到 2 列。
- 移动端多数业务卡片降为 1 列。
- 后台表单复杂字段可使用 2 到 3 列，但筛选和批量操作在移动端必须堆叠。

## 5. 按钮系统

按钮基础 class 为 `.button`，当前组件入口为 `components/ui/button-link.tsx`。

### 5.1 基础按钮

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 46px;
  padding: 0 20px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 700;
  transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
}
```

### 5.2 按钮变体

| 变体 | class | 用途 | 视觉 |
| --- | --- | --- | --- |
| Primary | `.button--primary` | 加购、结账、保存、主要下一步 | 珊瑚渐变，白字，品牌阴影 |
| Secondary | `.button--secondary` | 次要 CTA、返回、查看详情 | 白色半透明底，浅品牌边框 |
| Ghost | `.button--ghost` | 低优先级操作、取消、辅助链接 | 透明底，细边框 |
| Danger | `.button--danger` | 删除、拒绝、危险操作 | 淡红底，红棕文字 |
| Success | `.button--success` | 通过、同步成功、完成 | 淡绿底，绿色文字 |
| Compact | `.button--compact` | 后台表格、小型工具操作 | `32px` 高，小字号 |
| Disabled | `.button--disabled` 或 `disabled` | 不可操作状态 | 低透明度、无阴影 |

### 5.3 按钮交互

- Hover：向上移动 `1px`，保持轻微高级感。
- Focus：必须可见，建议使用品牌色 outline 或 box-shadow。
- Disabled：降低透明度，禁用 pointer events，不使用 hover 位移。
- Loading：保留按钮宽度，文案可改为 `Saving...`、`Publishing...`、`Processing...`。
- 表单提交按钮不能只靠颜色表达状态，应配合文字。

### 5.4 使用规则

- 每个主要视图最多一个 primary CTA。
- 商品页 primary CTA 为加购或结账动作。
- 后台编辑页 primary CTA 为保存、发布、生成或同步。
- 危险操作必须用 danger，并和普通操作保持距离。
- Icon button 后续如新增，应使用明确图标和 `aria-label`，尺寸不小于 `40px`。

## 6. 卡片系统

卡片是 Neatique 的主要信息承载形态。前台卡片偏柔和，后台卡片偏清晰和可扫读。

### 6.1 通用表面

```css
.panel,
.product-card,
.post-card,
.contact-card,
.admin-card,
.admin-table,
.admin-form {
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: var(--surface);
  backdrop-filter: blur(14px);
  box-shadow: var(--shadow);
}
```

### 6.2 卡片类型

| 类型 | 用途 | 圆角 | 内边距 | 规则 |
| --- | --- | --- | --- | --- |
| Product card | 商品列表 | `28px` | 内容区 `20px 22px 22px` | 图片比例 `1:1`，价格和详情链接底部对齐 |
| Post card | Beauty Tips 列表 | `28px` | 内容区 `20px 22px 22px` | 图片比例 `16:10`，meta 放标题上方 |
| Hero card | 首页/重点推广 | `36px` | `28px` | 适合大图、卖点和 stats |
| Panel | 通用内容面板 | `28px` | `28px` | 表单、说明、账户页模块 |
| Admin card | 后台统计/模块 | `28px` | `28px` | 结构紧凑，标题清楚 |
| Admin table | 后台数据列表 | `28px` | `28px` | 表格、筛选、批量操作 |
| Review card | 评论瀑布流 | `18px` | `18px` | 内容短、可链接 hover |
| Stat card | 数据指标 | `20px` | `16px 18px` | strong 数字，span 说明 |

### 6.3 卡片内容结构

商品卡：

```text
ProductCard
├─ Image area: 1:1
├─ Meta: category + points
├─ Rating
├─ Title
├─ Short description
└─ Bottom: price stack + detail link
```

文章卡：

```text
PostCard
├─ Image area: 16:10
├─ Meta: category + read time + date
├─ Title
├─ Excerpt
└─ Read article link
```

后台卡：

```text
AdminCard
├─ Header: title + optional action
├─ Body: summary, table, form, or controls
└─ Footer: secondary metadata or pagination
```

### 6.4 卡片规则

- 卡片内不要再嵌套大卡片，复杂内容用分组、分割线、表格或列表解决。
- 图片区域必须设置稳定比例，避免加载后布局跳动。
- 商品图、文章图、漫画图优先使用 Vercel Blob URL。
- 卡片标题不使用过大的 hero 字号。
- Hover 只用于可点击卡片，不可点击卡片不做位移。
- 移动端卡片内按钮和链接允许换行，不能挤压价格或标题。

## 7. 圆角系统

当前全局 token：

| Token | 值 | 用途 |
| --- | --- | --- |
| `--radius-xl` | `28px` | 主卡片、面板、表格、商品卡 |
| `--radius-lg` | `22px` | 次级面板、优惠券区、局部容器 |
| `--radius-md` | `18px` | 小卡片、评论卡、工具块 |
| `--radius-sm` | `14px` | logo mark、select、小控件 |

补充组件圆角：

| 值 | 用途 |
| --- | --- |
| `999px` | pill、导航项、主按钮、标签 |
| `36px` | hero copy、hero card |
| `30px` | hero 图片、重点大图 |
| `20px` | stat card、cart image、局部图片区 |
| `16px` | 表单输入、后台侧边栏链接 |

### 圆角规则

- CTA 和 pill 使用全圆角 `999px`。
- 常规卡片优先使用 `28px`。
- 后台输入、筛选器、侧边栏项使用 `14px` to `16px`。
- 评论、列表行、小型工具卡使用 `18px`。
- 不新增超过 `40px` 的圆角。
- 同一模块内最多使用两级圆角。

## 8. 阴影系统

### 8.1 基础阴影

```css
--shadow: 0 18px 50px rgba(237, 115, 97, 0.14);
```

基础阴影用于主卡片、面板、hero、后台卡片。它的作用是提供柔和层次，不是制造强浮层。

### 8.2 组件阴影

| 阴影 | 用途 |
| --- | --- |
| `0 18px 50px rgba(237, 115, 97, 0.14)` | 通用卡片、面板、hero |
| `0 14px 30px rgba(237, 115, 97, 0.24)` | Primary button |
| `0 14px 30px rgba(85, 168, 117, 0.18)` | Success button |
| `0 18px 36px rgba(237, 115, 97, 0.1)` | Review card hover |
| `0 22px 60px rgba(46, 40, 37, 0.18)` | 需要更强层级的大图或强调内容 |

### 8.3 阴影规则

- 页面主层级使用 `--shadow`。
- 只有 hover、弹层、重点 CTA 可使用更强阴影。
- 表格和后台列表不要使用过重阴影，优先靠边框和背景区分。
- 移动端避免多层阴影叠加，保持渲染轻快。
- 阴影颜色优先使用品牌珊瑚或暖黑透明色，不使用纯黑重阴影。

## 9. 动画与交互

当前系统没有复杂 keyframes，动效以 CSS transition 为主。

### 9.1 动效 token

| Token | 建议值 | 用途 |
| --- | --- | --- |
| Fast | `120ms ease` | 小图标、微状态切换 |
| Base | `180ms ease` | 按钮、链接、卡片 hover、导航 |
| Slow | `300ms ease` | 弹层、菜单、较大视觉变化 |
| Media | `420ms ease` | 图片、hero 媒体轻位移 |

### 9.2 现有动效模式

- 按钮 hover：`transform: translateY(-1px)`。
- 可点击评论卡 hover：`translateY(-2px)` 加弱阴影。
- 导航 hover：背景色和文字色 `180ms` 过渡。
- 后台折叠菜单：箭头旋转 `180ms`。
- 图片 hover 或媒体变化不应超过 `420ms`。

### 9.3 动效规则

- 动画必须服务反馈，不做纯装饰动效。
- 购物、结账、表单、后台保存等关键流程要优先稳定，不使用干扰动画。
- Hover 位移最大 `2px`。
- 页面进入动画默认不需要。
- 颜色、阴影、位移可以组合，但一次交互不要超过 3 个属性变化。
- 新增复杂动画前必须考虑 `prefers-reduced-motion`。

推荐补充：

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 10. 导航组件

### 10.1 前台顶部导航

结构：

```text
Announcement Bar
└─ Header
   ├─ Logo
   ├─ Primary Nav
   └─ My Account + Cart
```

规则：

- Header sticky，背景使用半透明白和 blur。
- Primary Nav 使用 pill 容器，导航项也是 pill。
- Shop 可以作为 featured nav item。
- Cart 使用 primary button，并显示数量。
- Mobile 需要保证导航可换行或折叠，不能挤压 logo 和 cart。

### 10.2 后台侧边栏

结构：

```text
Admin Sidebar
├─ Logo
├─ Session pills
├─ Nav groups
└─ Sign out
```

规则：

- 侧边栏宽度 `280px`。
- Active item 用浅珊瑚背景和 `--brand-deep`。
- Group toggle 使用 `42px` 控件，箭头旋转表示展开。
- Finance 角色只显示 Finance 入口。
- 后台导航优先稳定，不使用过强动画。

## 11. 表单与输入

### 11.1 字段基础

```css
.field input,
.field select,
.field textarea {
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid rgba(46, 40, 37, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--ink);
}
```

### 11.2 表单规则

- Label 使用 `0.92rem`、`700`。
- 必填标记使用 `--brand-deep`，但不要只靠颜色表达。
- Textarea 默认最小高度 `140px`，允许垂直 resize。
- 表单错误应显示在字段附近。
- 后台表单可更密集，但输入高度不小于 `40px`。
- Checkout 和账户流程的输入高度不小于 `48px`。

## 12. 标签与状态

### 12.1 Pill

基础 pill：

```css
.pill {
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(237, 115, 97, 0.15);
  color: var(--muted);
  font-size: 0.92rem;
}
```

### 12.2 Pill 类型

| 类型 | 用途 |
| --- | --- |
| Default | 分类、账户名、普通 metadata |
| Success | 已发布、已通过、已同步、已完成 |
| Warning | Pending、需要审核、库存提醒 |
| Danger | 拒绝、失败、错误、风险 |

规则：

- 状态 pill 文案要明确，例如 `Published`、`Pending review`、`Failed`。
- 不要只用颜色表达状态。
- 商品积分、文章分类、后台角色适合使用 pill。

## 13. 图片与媒体

### 13.1 图片比例

| 场景 | 比例 | 说明 |
| --- | --- | --- |
| 商品卡 | `1:1` | 展示瓶身、包装或主视觉 |
| 商品详情主图 | `1:1` 或产品页既有比例 | 保持清晰 inspection |
| 文章卡 | `16:10` | 更适合 Beauty Tips 列表 |
| 文章封面 | `4:3` | 详情页上方大图 |
| Comic 阅读页 | 原漫画页比例 | 不裁切，不遮挡文字 |
| Mascot | `1:1` 或透明 PNG 适配 | 保持角色完整 |

### 13.2 媒体规则

- 正式图片优先托管在 Vercel Blob。
- 数据库保存 URL、alt、metadata，不保存正式大图 base64。
- 商品图不要使用过暗、过糊、过裁切的图。
- Comic 阅读图不能压缩到影响文字阅读。
- 所有前台图片需要有有意义的 alt。

## 14. 前台页面使用规范

### 14.1 首页

- 第一屏必须清楚出现品牌、产品或护肤主题。
- Hero 用真实产品或品牌媒体承载，不用纯抽象图形。
- 核心入口包括 Shop、Beauty Tips、Comic、Mascot Rewards、Contact。
- 内容模块使用温柔渐变和卡片，但不要堆叠太多大卡。

### 14.2 商品页

- 图片、价格、库存、评价、加购按钮是首要信息。
- 说明文案强调 hydration、smooth texture、glow、comfort，避免夸张医疗承诺。
- 价格优惠、积分奖励、评论证明要靠近购买决策区。

### 14.3 Beauty Tips

- 列表页以文章卡为主，分类和阅读时间清楚。
- 详情页正文限制宽度，保证阅读舒适。
- 文章可自然链接商品，但不要像广告落地页。

### 14.4 Comic

- Comic 可以更叙事，但仍保持 Neatique 的柔和专业基调。
- 阅读页优先图片清晰和导航顺畅。
- 语言切换、章节切换和返回入口必须清楚。

## 15. 后台页面使用规范

### 15.1 后台整体

- 后台延续前台色彩，但更强调效率和信息密度。
- 页面标题、关键指标、筛选、表格、操作按钮层级必须清楚。
- 大批量操作要有确认和状态反馈。
- AI 生成、图片上传、发布中心必须显示当前状态和错误。

### 15.2 后台组件

| 组件 | 规则 |
| --- | --- |
| Admin card | 适合统计、入口、设置组 |
| Admin table | 适合订单、评论、客户、claim、finance |
| Admin form | 适合编辑商品、文章、coupon、mascot |
| Sidebar nav | 当前页面高亮，分组可展开 |
| Inline actions | 使用 compact button，危险动作必须 danger |

## 16. 可访问性

- 正文和背景对比必须足够，浅粉背景上不要使用过浅文字。
- 所有按钮、链接、输入、折叠菜单必须可键盘访问。
- 图标按钮必须有 `aria-label`。
- 图片必须有 alt，装饰图片 alt 可为空。
- 表单错误要用文字说明，不能只改变边框颜色。
- 页面标题层级必须顺序清楚，不跳级滥用 H1。

## 17. 代码落地规则

### 17.1 Token 优先

新增样式优先引用现有 token：

```css
color: var(--ink);
background: var(--surface);
border-color: var(--line);
box-shadow: var(--shadow);
border-radius: var(--radius-xl);
```

### 17.2 新组件命名

- 延续 BEM 风格：`.component`, `.component__element`, `.component--variant`。
- 前台组件可放在 `components/site`、`components/product`、`components/ui`。
- 后台组件可放在 `components/admin`。
- 通用链接按钮优先复用 `ButtonLink`。

### 17.3 新页面检查清单

- 是否复用 `--brand`、`--ink`、`--surface` 等 token。
- 是否只有一个主 CTA。
- 图片比例是否稳定。
- 移动端文字和按钮是否换行正常。
- 表单是否有 label、错误文案和 disabled/loading 状态。
- Hover 和 focus 是否有反馈。
- 后台表格是否适合扫读和批量操作。

## 18. 当前系统可优化项

- 可补充统一的 focus-visible 样式，保证键盘用户体验。
- 可补充 `prefers-reduced-motion` 规则。
- 可把 `--text`、`--accent` 等少量历史变量统一回 `--ink`、`--brand`。
- 可沉淀 `Button`、`Card`、`Pill`、`Field` 的 React 组件，减少页面内重复 class。
- 可建立 Storybook 或轻量 `/admin/design-system` 内部预览页，用于后续视觉回归。
