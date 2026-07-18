# Neatique SEO 优化执行计划（P0–P3 与长期路线）

> 站点：<https://www.neatiquebeauty.com>  
> 基线日期：2026-07-18  
> 适用项目：Neatique Beauty Next.js 独立站  
> 计划原则：先消除合规与索引风险，再完善商品承接能力，然后扩展内容和站外权威度。

## 1. 计划目标

本计划分为两个阶段：

1. **当前阶段：P0–P3。** 修复现有站点问题，建立可测量、可收录、可转化的 SEO 基础。
2. **长期阶段：P0–P3 全部验收后。** 持续扩大非品牌自然流量、品牌搜索量和自然搜索收入。

执行顺序必须遵守以下依赖关系：

```text
P0 风险与索引止血
  ↓ 验收通过
P1 商品搜索与数据基础
  ↓ 验收通过
P2 站点架构、内容质量与性能
  ↓ 验收通过
P3 增长验证与运营机制
  ↓ 全部验收通过
长期 SEO 增长
```

## 2. 优先级定义

| 级别 | 定义 | 处理时限 | 是否阻断后续工作 |
| --- | --- | --- | --- |
| P0 | 合规、信任、域名、重复 URL、索引边界等基础风险 | 1–3 个工作日 | 是 |
| P1 | 直接影响商品曝光、数据归因和购买转化的能力 | 1–2 周 | 是 |
| P2 | 站点架构、现有内容质量、内部链接和 Core Web Vitals | 2–4 周 | 是 |
| P3 | 内容增长验证、数字 PR、CRO 和日常运营机制 | 4–8 周 | 是 |
| 长期 | 规模化增长与持续优化 | P0–P3 后持续执行 | 否 |

## 3. 当前基线

截至基线日期，站点具备以下基础：

- sitemap 包含 37 个 URL，其中包括 12 个商品页和 14 篇 Beauty Tips 文章。
- sitemap 中所有页面均有且只有一个 H1。
- 商品页已有基础 `Product`、`Offer` 和 `AggregateRating` 结构化数据。
- 文章页已有 `Article` 结构化数据。
- 已安装 GA4，但目前仅发现基础 page view，没有完整电商事件。

已确认的主要问题：

- 非 `www` 域名以临时 307 跳转到 `www`，但 canonical、sitemap、robots 和 JSON-LD 使用非 `www`。
- Google 仍能发现 `?p=...`、`?post_type=product`、`?product_view=list` 等旧 WordPress 参数 URL。
- 购物车、账户、登录注册、订单匹配、积分领取及成功页默认允许索引。
- 首页 JSON-LD 的图片 URL 出现域名与 Blob 绝对 URL 重复拼接。
- 代码支持生成 `AI_GENERATED` 评论，并将其设置为 `verifiedPurchase: true`；必须确认没有此类评论公开展示或参与评分。
- 首页生产响应目前为 `private, no-cache, no-store`，需要进一步减少全页动态渲染。

---

## 4. P0：风险与索引止血

**目标：** 消除可能导致监管、品牌信任、权重分散和错误收录的紧急问题。

### P0 任务清单

| ID | 任务 | 具体动作 | 交付物 | 验收标准 |
| --- | --- | --- | --- | --- |
| P0-01 | 评论真实性与合规审计 | 查询所有 `source = AI_GENERATED` 的评论；撤下所有已发布记录；禁止 AI 评论被标记为 Verified Purchase；公开评分及 Schema 只统计真实客户评论 | 评论审计表、清理记录、代码保护规则 | 线上不存在 AI 虚构消费者评论；AI 评论不参与评分；Verified Purchase 可追溯至真实订单 |
| P0-02 | 统一首选域名 | 选择 `https://www.neatiquebeauty.com` 为唯一版本；把非 `www` 改为永久 308；同步 metadataBase、canonical、OG、JSON-LD、robots、sitemap 和内部链接 | 域名规范化修改 | 所有公开 URL 最多一次跳转到 `www`；所有 canonical、sitemap 和 Schema 使用同一主机名 |
| P0-03 | 旧 WordPress URL 清理 | 从 Search Console 导出旧 URL；为有对应内容的 URL 建立逐条 308；无对应内容返回 410；清理 `?p=`、`post_type`、`product_view` 等无效参数 | 旧 URL 映射表、重定向规则 | 已知旧 URL 不再返回重复内容 200；重定向目标与页面意图一致；不存在重定向链 |
| P0-04 | 收录边界治理 | 对 `/cart`、`/account/*`、`/checkout/*`、`/om*`、`/ryo*`、`/rd*` 及感谢/成功页设置 `noindex,follow`；从 sitemap 移除流程页 | 页面索引规则清单 | 所有交易与账户流程页输出 `noindex,follow`；sitemap 仅保留希望参与搜索的 URL |
| P0-05 | 修复首页 JSON-LD | 使用绝对 URL helper 修复 `Organization.image` 与 `primaryImageOfPage`；统一 Schema 中的域名 | 修复后的首页结构化数据 | Schema 中不再出现 `https://...https://...`；Rich Results Test 无解析错误 |
| P0-06 | Search Console 基线 | 验证 Domain Property；提交修正后的 sitemap；记录页面索引、手动处置、安全问题、商品结果和 Core Web Vitals 基线 | SEO 基线截图或导出 | Search Console 已验证；sitemap 成功读取；无未处理的手动处置或安全问题 |
| P0-07 | 上线后回归检查 | 对首页、Shop、12 个商品页、14 篇文章及 noindex 页面检查状态码、canonical、robots、H1 和 Schema | 回归检查报告 | 所有检查项通过；没有把商品或文章误设为 noindex |

### P0 实施状态（2026-07-18）

| ID | 当前状态 | 已完成 | 上线/外部待办 |
| --- | --- | --- | --- |
| P0-01 | 代码已完成，待生产迁移 | 公共查询、评分与 Schema 排除 `AI_GENERATED`；AI 评论生成/重置入口停用；Verified Purchase 必须关联真实订单；新增数据库清理迁移 | 部署时执行 Prisma migration，并抽查生产评论与评分 |
| P0-02 | 代码已完成，待域名平台确认 | canonical 主域、metadata、sitemap、Schema 与站内绝对链接统一为 `https://www.neatiquebeauty.com`；应用层配置永久重定向 | 在 Vercel Domains 将当前 apex 临时跳转确认/改为永久 308，并检查没有跳转链 |
| P0-03 | 当前已知 URL 已完成 | 已知 WordPress 参数 URL 逐条 308；无对应内容的旧参数/分类/作者/feed URL 返回 410；修复 `/private-policy` | 从 Search Console 导出完整旧 URL 后补充遗漏映射，并做生产状态码抽查 |
| P0-04 | 代码已完成 | cart、account、checkout、OMB、RYO、RD、评论详情等流程页统一 `noindex,follow`；流程入口从 sitemap 移除 | 部署后检查响应页面 robots metadata 与线上 sitemap |
| P0-05 | 代码已完成 | 首页 JSON-LD 图片统一通过绝对 URL helper 生成，不再重复拼接域名 | 部署后用 Rich Results Test 验证生产 HTML |
| P0-06 | 接入能力已完成，外部待办 | 支持通过 `GOOGLE_SITE_VERIFICATION` 注入 Google 验证标记 | 配置验证值或 DNS 验证 Domain Property，提交 sitemap，并保存 Search Console 基线 |
| P0-07 | 本地回归通过，生产待办 | TypeScript、96 项自动化测试、ESLint、Next.js production build 与 function trace guard 已通过 | 部署后执行首页、Shop、12 个商品、14 篇文章和 noindex 页面回归 |

> 当前结论（2026-07-18 更新）：P0 代码与生产迁移已经完成；站点负责人已确认 Vercel 域名跳转问题处理完毕并已提交 sitemap，因此进入 P1。Search Console 基线与持续索引观察仍作为外部验收项保留。

### P0 涉及的主要代码

- `lib/site-config.ts`
- `app/layout.tsx`
- `app/robots.ts`
- `app/sitemap.ts`
- `app/(site)/page.tsx`
- `app/(site)/shop/[slug]/page.tsx`
- `app/admin/actions.ts`
- `lib/openai-reviews.ts`
- 所有账户、购物车、checkout、OMB、RYO、RD 页面 metadata
- Vercel 域名及重定向配置

### P0 完成门槛

只有同时满足以下条件才进入 P1：

- [ ] 公开页面不存在 AI 虚构消费者评论。
- [ ] `www` 成为唯一 canonical 主机名，非 `www` 使用永久跳转。
- [ ] 已知旧参数 URL 已完成 308/410 处理。
- [ ] 所有账户、交易和奖励流程页均为 `noindex,follow`。
- [ ] sitemap 只包含可索引页面。
- [ ] 首页 JSON-LD 通过语法与 URL 检查。
- [ ] Search Console 已建立基线。

---

## 5. P1：商品曝光、测量与信任基础

**目标：** 让 Google 正确理解商品，并能追踪从自然访问到购买的完整漏斗。

### P1 任务清单

| ID | 任务 | 具体动作 | 交付物 | 验收标准 |
| --- | --- | --- | --- | --- |
| P1-01 | GA4 电商事件 | 添加 `view_item`、`select_item`、`add_to_cart`、`view_cart`、`begin_checkout`、`purchase`、优惠券和 Amazon/TikTok/Walmart 外链点击；使用 order ID 去重购买事件 | GA4 事件规范、代码实现 | DebugView 能看到完整漏斗；同一订单不重复记收入；金额和币种正确 |
| P1-02 | 商品 metadata 重写 | 为 12 个商品建立独立的搜索意图、title、description、H1 和主要关键词；避免标题模板重复追加品牌名或堆砌成分 | 商品关键词映射表、12 套 metadata | 每个商品只有一个主要意图；标题和描述不重复；页面承诺与实际配方一致 |
| P1-03 | 商品内容完整性 | 补全实际容量、完整 INCI、关键成分真实浓度、PDRN/蜗牛黏液来源、使用方法、适用肤质、注意事项、产地、运输和退货信息 | 12 个商品内容清单 | 页面与包装/真实资料一致；没有无法证明的认证、功效或来源描述 |
| P1-04 | Product Schema 增强 | 在现有 Schema 中补充真实 `gtin/mpn`、`itemCondition`、`priceValidUntil`、`shippingDetails`、`hasMerchantReturnPolicy`；仅输出真实评论 | 增强后的商品 Schema | 12 个商品页 Rich Results Test 无关键错误；页面可见内容与 Schema 一致 |
| P1-05 | OnlineStore Schema | 首页采用 `OnlineStore`；补充真实 logo、客服联系方式、sameAs、退货、配送和会员积分信息 | 组织级 Schema | Organization/OnlineStore 数据通过验证；联系方式均真实有效 |
| P1-06 | Merchant Center | 建立 Google Merchant Center；从商品数据库生成 Feed；开启免费商品列表；配置配送、税费和退货政策 | 商品 Feed、Merchant Center 账户 | 12 个在售商品成功同步；无影响投放/免费列表的严重拒登问题 |
| P1-07 | 品牌信任页面 | 新增 `/about`；核实或删除 `+1 (213) 555-0148`；补充真实公司主体、品牌故事、配方理念、客服和生产/质量信息 | About 页面、联系方式检查表 | 页面所有身份、联系方式、测试、认证和生产信息均可验证 |
| P1-08 | 索引迁移观察 | 在 Search Console 检查 Google-selected canonical、旧 URL 和新商品页；对重点页面请求重新抓取 | 迁移观察记录 | Google-selected canonical 与声明版本一致；旧 URL 展示量持续下降 |

### P1 实施状态（2026-07-18）

| ID | 当前状态 | 已完成 | 上线/外部待办 |
| --- | --- | --- | --- |
| P1-01 | 代码已完成，待线上数据验收 | GA4 已覆盖 `view_item`、`select_item`、`add_to_cart`、`view_cart`、`begin_checkout`、`purchase`、优惠券与 Amazon/TikTok/Walmart 外链；购买事件以不可变的 Stripe Checkout Session 去重，并附带站内订单号 | 部署后在 GA4 DebugView 完成一次完整测试订单，核对收入、税费、币种及事件去重 |
| P1-02 | 代码已完成 | 为 12 个在售商品建立独立 title、description、主关键词和次关键词映射；后台支持经核实后的 SEO 覆盖值 | 部署后抽查生产 HTML，结合 Search Console 查询数据持续微调，不批量改写承诺 |
| P1-03 | 系统能力已完成，商品事实待补 | 后台新增容量、完整 INCI、使用方法、注意事项、产地、GTIN、MPN 与价格有效期字段；页面只展示已填写的核实信息；配送与退货信息已可见 | 按 12 个实物包装/供应商资料逐项录入；不得凭商品名猜测容量、完整配方、来源、产地或认证 |
| P1-04 | 代码已完成，待 Rich Results 验收 | Product Schema 已增加 `itemCondition`、免费配送、处理时间、30 天退货政策、价格有效期与经过校验的 GTIN/MPN；真实评论规则沿用 P0 | 部署后用 Rich Results Test 验证 12 个商品页；补录商品事实后再次验证 |
| P1-05 | 核心代码已完成，外部身份信息待补 | 首页已改为 `OnlineStore`，包含真实站点 logo、支持邮箱、配送和退货政策；虚假电话号码已删除 | 只有在能核实后才补充公司主体、官方社交主页 `sameAs` 和完整会员计划 Schema |
| P1-06 | Feed 已完成，Merchant Center 待接入 | 新增数据库驱动的 Google Merchant XML Feed；仅在校验通过时输出 GTIN，`identifier_exists=no` 必须由后台明确确认 | 在 Merchant Center 添加 Feed URL，配置税费/配送/退货并开启免费商品；处理诊断拒登 |
| P1-07 | 核心页面已完成，主体资料待补 | 新增 `/about`；导航、Footer 和 sitemap 已接入；删除 `+1 (213) 555-0148` 和未经核实的客服时段 | 由负责人提供可公开验证的公司主体、品牌沿革、生产和质量资料后再扩写，不添加无法证明的陈述 |
| P1-08 | 外部待办 | canonical、sitemap 和旧 URL 治理能力已在 P0 上线 | 在 Search Console 记录 Google-selected canonical、旧 URL 趋势、商品结果和新错误，持续观察至少 28 天 |

Google Merchant Feed 地址：`https://www.neatiquebeauty.com/google-merchant.xml`

> 当前结论：P1 站内代码改造已完成主要部分，但 P1 总状态仍为“待外部与真实商品数据验收”。Merchant Center 接入、12 个商品包装事实、GA4 DebugView、Rich Results Test 与 Search Console 观察完成前，不标记 P1 全部完成。

### P1 完成门槛

- [ ] GA4 能从商品浏览追踪到购买并正确归因收入。
- [ ] 12 个商品页完成关键词和 metadata 映射。
- [ ] 12 个商品页补齐真实商品信息。
- [ ] 商品与 OnlineStore Schema 无关键错误。
- [ ] Merchant Center 已成功接收商品 Feed。
- [ ] About 与客服信息真实有效。
- [ ] Search Console 未出现新的 canonical 或结构化数据异常。

---

## 6. P2：架构、现有内容质量与性能

**目标：** 建立清晰的主题层级，提升现有页面竞争力，而不是立即扩大文章数量。

### P2 任务清单

| ID | 任务 | 具体动作 | 交付物 | 验收标准 |
| --- | --- | --- | --- | --- |
| P2-01 | 主题集合页 | 建立 `/collections/pdrn-skincare`、`/collections/snail-mucin-skincare`、`/collections/uneven-tone-serums`、`/collections/dry-skin-hydration`；每页提供选择指南和产品差异 | 4 个集合页 | 每页具有独立意图和实质内容；不是单纯重复商品列表 |
| P2-02 | 内部链接重构 | 建立“文章/成分指南 → 集合页 → 商品页”和“商品页 → 使用指南 → 相关商品”的链接；添加可见面包屑 | 内链地图、Breadcrumb UI | 重点商品从首页或集合页不超过 3 次点击；无孤立商品或文章 |
| P2-03 | 文章库存审计 | 审计现有 14 篇文章的意图、排名、质量、事实、外链、内部链接和关键词冲突；决定保留、更新、合并或撤下 | 内容库存表 | 每篇文章有唯一意图和处理决定；PDRN、Snail Mucin 等集群无明显自相竞争 |
| P2-04 | 文章模板升级 | 添加真实作者、审核者、发布日期、更新日期、来源、关键结论、产品关联及免责声明；AI 草稿必须人工事实核查 | 文章编辑规范、模板 | 所有保留文章符合模板；不存在自动生成后直接发布的流程 |
| P2-05 | 页面缓存与渲染 | 为公共商品、文章、首页数据使用 `revalidate`/tag cache；将登录状态、评论资格等个性化逻辑从公共页面主体分离 | 缓存设计与实现 | 公共页面不再因 cookies 全页动态化；内容更新后可按 tag 正确失效 |
| P2-06 | Core Web Vitals | 优化 LCP 图片、Blob 图片尺寸、首屏 CSS/JS、字体、第三方脚本、TikTok 和评论轮播；检查移动端 | Lighthouse 与真实用户性能报告 | 真实用户第 75 百分位目标：LCP ≤ 2.5s、INP ≤ 200ms、CLS ≤ 0.1 |
| P2-07 | 图片 SEO | 商品图使用准确文件名和 alt；提供宽高；生成 WebP/AVIF；为重要商品提供多角度图；优化 OG 图 | 图片检查表 | 无布局跳动；无关键缺失 alt；主要图片 URL 可抓取；OG 分享正常 |
| P2-08 | Breadcrumb Schema | 为集合、商品和文章输出与可见导航一致的 `BreadcrumbList` | Breadcrumb Schema | 所有相关页面通过结构化数据检查，且链接使用 canonical URL |

### P2 内容处理原则

- 不以固定字数判断质量，以是否完整解决搜索问题为准。
- 不为每个轻微关键词变体创建新页面。
- 合并搜索意图相同、内容高度重合的文章，并对旧 URL 做 308。
- 商品配方或页面无法支持的关键词不得强行加入标题和正文。
- 医疗、治疗、修复疾病或改变皮肤结构的表述必须删除或经过合规审查。

### P2 完成门槛

- [ ] 4 个集合页上线并具备独立价值。
- [ ] 首页、集合、商品和文章形成清晰内链层级。
- [ ] 现有 14 篇文章全部完成保留/更新/合并/撤下决定。
- [ ] 保留文章全部符合新的作者、来源和事实核查规范。
- [ ] 公共页面缓存策略上线且更新机制正常。
- [ ] Core Web Vitals 达到目标，或有明确记录的剩余阻塞项与修复日期。
- [ ] 商品和文章面包屑通过验证。

---

## 7. P3：增长验证与运营机制

**目标：** 在技术和内容基础稳定后，用小规模实验验证哪些主题和渠道值得长期投入。

### P3 任务清单

| ID | 任务 | 具体动作 | 交付物 | 验收标准 |
| --- | --- | --- | --- | --- |
| P3-01 | 首批内容集群 | 根据 Search Console 和商品利润选择 6–8 个高意图主题；优先 PDRN、Snail Mucin、Tranexamic Acid/Niacinamide 的比较与使用问题 | 6–8 篇高质量内容 | 每篇有唯一意图、来源、内部链接和商业承接页；不批量自动发布 |
| P3-02 | 真实评测获取 | 建立售后邀请、真实购买者评论、创作者送测和披露流程；禁止用奖励换取指定正面倾向 | 评论与送测 SOP | 评论可追溯；激励不与好评绑定；所有合作按要求披露 |
| P3-03 | 数字 PR 试点 | 准备品牌事实页、产品资料包、成分来源、高清图片和样品流程；联系小规模美容编辑、配方师和真实创作者 | PR 资料包、联系记录 | 获得首批真实提及、测评或自然链接；不购买垃圾外链 |
| P3-04 | 自然流量 CRO | 对自然入口商品页检查首屏卖点、价格、库存、配送、真实评论、CTA、移动端加购；一次只测试一个主要变量 | CRO 实验清单 | GA4 能区分实验；有完整浏览、加购和购买数据；结果达到统计/业务判断门槛 |
| P3-05 | SEO 自动检查 | 为 canonical、robots、sitemap、标题、描述、H1、状态码和 JSON-LD 建立上线前 smoke test | 自动检查脚本或 CI 任务 | 部署前可发现域名、noindex、404、Schema 和 metadata 回归问题 |
| P3-06 | SEO 周/月报 | 建立按主题、页面类型、设备和国家拆分的 Search Console + GA4 + Merchant Center 看板 | 报表模板 | 能回答自然流量来自什么查询、落到什么页面、产生多少加购和收入 |
| P3-07 | 90 天复盘 | 对比基线：索引、非品牌展示/点击、CTR、Top 20 关键词、商品自然会话、加购率、收入和 CWV | 90 天复盘文档 | 明确保留、加码、调整和停止的主题及渠道 |

### P3 建议首批主题池

最终选题必须以 Search Console 数据确认，候选包括：

- PDRN serum vs PDRN cream
- How to use PDRN serum with niacinamide
- PDRN skincare routine for dry, dehydrated-looking skin
- 96% snail mucin serum routine
- Snail mucin serum vs cream
- Can snail mucin and niacinamide be used together?
- Tranexamic acid and niacinamide layering guide
- Kojic acid vs alpha arbutin for uneven-looking tone
- Morning vs night routine for uneven-looking tone
- NAD peptide serum AM/PM routine

### P3 完成门槛

- [ ] 首批内容已发布并经过人工事实核查。
- [ ] 真实评论和创作者合作 SOP 已执行。
- [ ] 已完成小规模数字 PR 试点。
- [ ] 至少完成一轮自然流量 CRO 测试。
- [ ] SEO 自动检查进入部署流程。
- [ ] 周/月报可以连接查询、页面、转化和收入。
- [ ] 完成 90 天复盘，并形成长期投入决策。

---

## 8. P0–P3 完成后：长期 SEO 路线

长期工作只有在 P0–P3 全部门槛通过后启动。长期阶段不追求无上限发布，而追求主题权威、真实品牌需求和自然搜索收入。

### 8.1 持续内容运营

- 每月依据 Search Console 数据更新旧内容，而不是只发布新内容。
- 维持每月 2–4 篇经过人工审核的高质量文章。
- 逐步建立 PDRN、Snail Mucin、Tone Support、Hydration、NAD/Peptide 五个主题集群。
- 每季度检查关键词蚕食、过时信息、失效外链和配方变更。
- 对排名 5–20 位且有商业价值的页面优先更新。

### 8.2 品牌权威与自然链接

- 持续向美容媒体、配方师、成分研究者和真实创作者提供准确资料和样品。
- 发布有独特价值的品牌资产，例如成分来源说明、配方透明度、消费者使用调查或质地对比。
- 建立品牌报道、奖项和真实专家引用页面。
- 定期检查品牌名、产品名和图片被提及但未链接的机会。
- 不购买站群链接、批量 guest post 或低质量目录链接。

### 8.3 Merchant Center 与购物搜索

- 保持价格、库存、促销、配送和退货信息与站内实时一致。
- 每周检查 Feed 拒登、价格不一致和图片问题。
- 优化商品主图和附加图片，以支持 Google Images、Lens 和免费商品列表。
- 按商品利润和自然表现决定是否扩展 Shopping 广告，而不是用广告替代 SEO 修复。

### 8.4 长期 CRO

- 按设备和流量来源持续测试商品页首屏、产品对比、套装、订阅和优惠表达。
- 追踪自然访问的首次购买、复购和客户生命周期价值。
- 将内容页辅助转化纳入归因，不只看最后点击。
- 每次只测试有限变量，保留实验记录和业务结论。

### 8.5 技术维护

- 每月自动爬取生产站点，检查状态码、canonical、noindex、重定向链、孤立页和 Schema。
- 每季度复查 Core Web Vitals、依赖升级和第三方脚本。
- 商品下架时优先保留有价值的页面并推荐替代品；永久无替代品时使用 410。
- 站点改版、域名或 URL 变化前先制定 SEO 迁移表。

### 8.6 AI 使用治理

- AI 只用于研究辅助、提纲、草稿和质量检查，不得伪造消费者、专家、测试、实验或引用。
- AI 文章不得自动发布；必须经过人工事实核查、品牌审核和合规审核。
- 不以关键词变体批量生产近似页面。
- 保留内容来源、编辑人和最后审核时间记录。

### 8.7 国际化条件

在满足以下条件前，不启动多语言或多国家目录：

- 美国站自然搜索与转化已经稳定。
- 目标市场有库存、配送、客服、退货和合规能力。
- 有原生或专业本地化资源，而不是直接机器翻译。
- 可以为各语言版本实施自引用 canonical 和双向 `hreflang`。

---

## 9. KPI 与报告口径

### 技术 KPI

- 首选域名一致率：100%。
- 商业与内容页面错误 noindex：0。
- sitemap 无重定向、404、流程页和重复 URL。
- 商品结构化数据关键错误：0。
- Core Web Vitals 真实用户第 75 百分位：LCP ≤ 2.5s、INP ≤ 200ms、CLS ≤ 0.1。

### 搜索 KPI

- 非品牌自然展示、点击和 CTR。
- 进入 Top 3、Top 10、Top 20 的查询数量。
- Google-selected canonical 与声明 canonical 的一致率。
- 商品、集合、文章的有效索引率。
- 旧 WordPress URL 的展示和收录下降趋势。

### 商业 KPI

- Organic `view_item → add_to_cart → begin_checkout → purchase` 漏斗。
- 自然搜索商品收入和客单价。
- 内容页辅助加购及辅助购买。
- Google 免费商品列表点击和收入。
- 自然搜索新客户占比及复购率。

增长目标应在 P0 修复完成后的首个连续 28 天建立新基线，再制定；不承诺固定排名或固定收录时间。

## 10. 当前阶段明确不做

在 P0–P3 完成前，不执行以下工作：

- 批量自动发布 AI SEO 文章。
- 创建大量只有关键词变化的集合页、成分页或地域页。
- 购买评论、虚构购买者或把非购买评论标记为 Verified Purchase。
- 购买批量外链、站群链接或低质量目录链接。
- 未经本地化直接上线多语言商城。
- 在未完成 GA4 电商归因前大规模增加内容或付费推广预算。
- 仅为追求“SEO 分数”添加用户不可见或页面不支持的结构化数据。

## 11. 官方规范参考

- [Google：Canonical 与重复 URL](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google：Redirects and Google Search](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
- [Google：Product Structured Data](https://developers.google.com/search/docs/appearance/structured-data/product)
- [Google：Merchant Listing Structured Data](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing)
- [Google：Organization / OnlineStore Schema](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Google：People-first Content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google/web.dev：Core Web Vitals](https://web.dev/articles/vitals)
- [FTC：Fake Reviews and Testimonials Rule](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials)
- [FDA：Cosmetics Labeling Claims](https://www.fda.gov/cosmetics/cosmetics-labeling/cosmetics-labeling-claims)

## 12. 状态更新规则

每个任务使用以下状态之一：

- `未开始`
- `进行中`
- `待验证`
- `已完成`
- `阻塞`

每次状态变更至少记录：负责人、开始时间、完成时间、相关 PR/提交、生产验证链接和遗留问题。任何任务只有通过生产环境验收后才能标记为“已完成”。
