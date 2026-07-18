# Neatique P2 内容库存审计

审计日期：2026-07-18  
范围：生产数据库中当时已发布的 14 篇 Beauty Tips 文章。

## 审计结论

- 审计时 14 篇文章的正文内链计数均为 0，文章、集合页和商品页之间没有稳定的主题路径。
- 11 篇记录为 AI-assisted，数据库中没有可验证的具名审核者记录；因此新增审核字段，并禁止 AI 内容自动发布。
- 2 篇与更完整页面搜索意图高度重叠，决定合并并使用永久 308，而不是保留竞争页面。
- 2 篇独立意图文章内容明显偏薄，保留 URL，并由页面模板补充实质性说明、集合页入口和相关阅读。
- 所有保留文章统一增加可见作者/日期、审核状态、参考资料、相关集合、相关文章、相关商品及通用美容信息免责声明。

## 逐篇处理决定

| 文章 slug | 主要意图 | 决定 | P2 处理 |
| --- | --- | --- | --- |
| `pdrn-peptide-serum-guide-smooth-hydrated-skin` | PDRN peptide serum 选择与使用 | 保留/主页面 | 作为 PDRN serum 信息主页面；接入 PDRN collection 与相关商品；待具名人工审核 |
| `what-to-look-for-in-a-barrier-repair-cream-for-dry-dehydrated-skin` | 干燥肤感面霜选择 | 保留 | 与单纯“如何使用 PDRN cream”区分；接入 dry-skin collection；待人工核查“barrier repair”措辞 |
| `body-cream-for-dry-skin` | 身体霜选择 | 保留/修正 | 修复被截断的 SEO description；接入 dry-skin collection；待具名人工审核 |
| `how-to-use-an-nad-peptide-serum-in-an-am-to-pm-skincare-routine` | NAD+ serum 早晚使用 | 保留/修正 | 修复被截断的 SEO description；接入 dry-skin collection；待核实产品包装使用方法 |
| `niacinamide-tranexamic-serum-for-uneven-looking-tone` | niacinamide + tranexamic 组合 | 保留 | 作为组合型搜索意图，接入 uneven-tone collection；待具名人工审核 |
| `how-to-use-tranexamic-serum-even-looking-complexion` | tranexamic serum 使用顺序 | 保留 | 保留“使用方法”意图，与上一页的“选择组合”区分；接入 uneven-tone collection |
| `brightening-cream-for-even-looking-glow` | tone-focused cream 选择 | 保留 | 产品类型为 cream，不与 serum collection 主意图竞争；作为相关文章入口保留 |
| `how-to-use-snail-mucin-serum-hydration-routine` | snail serum 使用方法 | 保留/主页面 | 作为 Snail Mucin serum 主指南，接入 Snail collection 与商品 |
| `snail-mucin-cream-moisturizer-routine` | snail cream 使用方法 | 保留 | 与 serum 页面按产品形态区分，接入 Snail 与 dry-skin collections |
| `pdrn-serum-lightweight-repair-serum-routine` | PDRN serum 使用 | 合并 | 撤下并 308 到 `pdrn-peptide-serum-guide-smooth-hydrated-skin`，避免同站关键词竞争 |
| `how-to-use-pdrn-cream-for-a-calm-hydrated-skin-routine` | PDRN cream 使用顺序 | 保留 | 与面霜选择页区分，接入 PDRN collection 与商品 |
| `what-is-pdrn-skincare` | PDRN 入门解释 | 保留/扩充 | 保留独立入门意图；增加产品形态、选择原则、简单步骤和事实边界说明 |
| `snail-mucin-routine-for-dry-skin` | Snail routine | 合并 | 内容过薄且与 serum/cream 指南重复；撤下并 308 到 `snail-mucin-skincare` collection |
| `serum-vs-cream-routine-order` | serum 与 cream 顺序 | 保留/扩充 | 保留跨产品的基础问题；增加顺序、简化条件和 daytime sunscreen 说明 |

## 发布与事实核查规则

1. AI 只能创建草稿，不能自动上线。
2. AI-assisted 文章重新发布前必须录入真实审核者、审核时间，并勾选 editorial review。
3. 作者或审核者 URL 只填写可公开验证的个人/组织资料页。
4. 成分浓度、完整 INCI、来源、产地、认证及产品用法以当前包装或供应商正式资料为准。
5. 医疗、治疗、修复疾病或改变皮肤结构的表述不进入美容文章。
6. 外部链接继续使用已批准的权威来源，并定期运行后台链接检查。

## 后续人工工作

- 为 12 篇保留文章安排具名编辑审核并填写作者/审核字段。
- 对 AI-assisted 文章逐篇核对产品包装、来源链接和强功效措辞。
- Search Console 积累 28 天查询数据后，再判断是否需要进一步合并 tranexamic 与 PDRN 子主题。
