# Neatique Beauty PRD

版本：v1.0  
日期：2026-06-09  
产品形态：DTC 护肤品牌官网、电商商城、内容运营与后台管理系统

## 1. 产品定位

Neatique Beauty 是面向美国市场的护肤品牌独立站，核心定位为“专业感、舒适感、日常可坚持”的现代护肤电商体验。网站不仅承担商品展示和下单转化，也承担品牌内容种草、SEO 获客、会员积分沉淀、评论证明、漫画 IP 内容运营和后台运营管理。

### 品牌主张

- 以 PDRN、Snail Mucin、tone-correction serum/cream 等护肤品为核心，强调 hydration、smooth texture、glow、comfort。
- 视觉与内容风格偏精致、柔和、专业，不做夸张功效承诺。
- 用 Beauty Tips、Comic、Mascot Rewards 等内容与奖励机制提升品牌记忆点和复访率。

### 产品目标

- 建立可信赖的护肤品牌第一站点，承接自然流量、社媒流量和复购流量。
- 支持美国用户完成浏览、加购、结账、账户查看和评论提交。
- 支持运营团队管理商品、订单、评论、优惠券、积分、奖励、文章、邮件营销和漫画内容。
- 用 AI 内容与图片工作流降低 SEO 文章和漫画内容的生产成本。

### 成功指标

- 商业转化：商品页到加购率、加购到支付成功率、客单价、复购率。
- 内容增长：Beauty Tips 文章收录量、自然搜索点击、文章到商品点击率。
- 社群与忠诚度：RYO 提交量、积分发放量、吉祥物兑换量、评论提交量。
- 运营效率：订单处理时长、评论审核时长、AI 文章/漫画生成成功率。
- 技术稳定性：构建成功率、核心页面加载速度、数据库 egress 和存储成本可控。

## 2. 用户群体

### 2.1 新访客

画像：从搜索、广告、TikTok、Amazon/社媒内容进入网站的潜在用户。  
目标：快速理解品牌、产品卖点和是否适合自己。  
关键需求：

- 看到清晰的品牌定位和真实产品视觉。
- 能按功效、成分、质地和价格判断是否购买。
- 能阅读基础护肤内容来降低决策成本。

### 2.2 购买用户

画像：已经准备购买护肤品的美国用户。  
目标：顺利下单、确认物流和订单状态。  
关键需求：

- 商品信息、价格、库存、评价清楚。
- 结账流程简短、安全，只支持美国收货地址。
- 付款后可查看订单和账户记录。

### 2.3 会员与复购用户

画像：已经购买或参与活动的用户。  
目标：查看订单、积分、评论、奖励兑换。  
关键需求：

- 登录账户后看到订单、积分和评论相关信息。
- 通过 RYO 注册订单、TikTok follow 等动作获取积分。
- 积分达到门槛后兑换 mascot rewards。

### 2.4 内容用户

画像：对护肤知识或品牌世界观感兴趣的访客。  
目标：阅读 Beauty Tips 或 Comic，增加品牌粘性。  
关键需求：

- Beauty Tips 文章结构清楚、SEO 友好。
- Comic 章节/集数可浏览，有中英文或多语言扩展空间。
- 从内容自然跳转到产品、活动或奖励页。

### 2.5 内部运营与管理员

画像：品牌方运营、客服、内容、财务和订单处理人员。  
目标：在一个后台完成日常运营。  
关键需求：

- 管理商品、库存、订单、优惠券、评论、客户和表单。
- 审核 OMB/RYO claim、发放积分、处理吉祥物兑换。
- 管理 SEO 文章、AI 文章生成、邮件营销、Brevo 同步。
- 管理 Comic 项目、角色、场景、prompt、图片生成和发布。

## 3. 核心功能

### 3.1 品牌首页

- 展示品牌主张、核心成分故事、精选产品、内容入口和 mascot/comic 入口。
- 支持响应式视觉素材，优先使用 Vercel Blob 托管图片。
- 提供订阅入口和 coupon 引导。

### 3.2 商品商城

- 商品列表：展示 active products、图片、分类、价格、积分、评分和摘要。
- 商品详情：展示图集、详情文案、价格、库存、评价、相关内容和加购入口。
- 购物车：本地购物车体验，支持数量调整、清空和结账前确认。
- 结账：美国地址校验、Stripe Checkout、成功/取消页。

### 3.3 用户账户

- 注册、登录和会话管理。
- 展示用户订单、积分、评论和购买过的商品。
- 支持已购买用户提交 verified-buyer review。

### 3.4 评论与信任证明

- 用户提交商品评论。
- 后台审核评论状态：pending、published、hidden。
- 商品页展示已发布评论和评分聚合。

### 3.5 Beauty Tips 内容

- 内容列表和详情页。
- SEO metadata、Open Graph、sitemap 支持。
- 后台创建、编辑、发布、AI 生成文章和封面图。
- 正式封面图使用 Vercel Blob，避免大图存入数据库。

### 3.6 Mascot Rewards 与积分

- 展示 mascot rewards 目录。
- 用户通过 TikTok follow confirmation、RYO order registration 等行为获取积分。
- 用户达到积分门槛后提交 mascot redemption。
- 后台可管理 mascot、兑换状态和积分流水。

### 3.7 OMB / RYO 活动流程

- OMB：订单验证、产品体验反馈、截图/证明上传、extra bottle 地址收集和后台审核。
- RYO：订单注册、review/follow 相关信息提交、积分奖励审核。
- 支持 follow email 自动化提醒，记录邮件发送日志。

### 3.8 Comic 内容与 AI 生产系统

- 公共端：漫画季、章节、集数、页面阅读。
- 后台端：Project Bible、角色、场景、season/chapter/episode 管理。
- Prompt Studio：生成/修订大纲、脚本、prompt pack、页面图片。
- Publish Center：页面审批、中文版本、extra story、发布/取消发布。
- 图片存储：Vercel Blob 优先，数据库 base64 仅作为短期 fallback。

### 3.9 邮件与表单

- Contact、Subscribe 表单。
- SMTP/Nodemailer 发信配置和收件箱读取。
- Brevo 邮件营销：受众同步、campaign 草稿、发送、报告。

### 3.10 管理后台

- Dashboard：订单、收入、低库存、表单和关键运营状态概览。
- Products：商品、图集、库存、价格、优惠券、评论。
- Orders：订单状态、履约状态、物流、活动日志。
- Customers：客户、订单、积分、评论。
- Rewards：积分流水、RYO、mascot redemption。
- OMB Claims：活动审核和跟进邮件设置。
- Posts：文章库、AI SEO posts、封面图、外链检查。
- Comic：完整漫画内容生产后台。
- Email Marketing：Brevo 连接、受众、campaign、AI drafting。
- Finance：付款明细、付款截图附件、CSV 导出。

## 4. 页面结构

### 4.1 公共站点

```text
/
  首页：品牌定位、banner、核心成分、精选商品、Beauty Tips、Comic/Mascot 入口
/shop
  商品列表
/shop/[slug]
  商品详情、图集、价格、库存、评价、加购
/cart
  购物车
/checkout/confirmation
  收货/账单信息确认
/checkout/start
  创建 Stripe checkout session
/checkout/success
  支付成功
/checkout/cancel
  支付取消
/account
  用户账户、订单、积分、评论
/account/login
/account/register
/beauty-tips
  文章列表
/beauty-tips/[slug]
  文章详情
/comic
  漫画季/章节入口
/comic/[seasonSlug]
/comic/[seasonSlug]/[chapterSlug]
/comic/[seasonSlug]/[chapterSlug]/[episodeSlug]
  漫画阅读页
/mascot
  吉祥物积分奖励说明和目录
/rd
  mascot redeem 入口
/rd/redeem
  mascot redemption 提交
/rd/success
  redemption 成功
/ryo, /ryo2, /ryo3
  Register Your Order 分步流程
/om, /om2, /om3
  OMB claim 分步流程
/contact
  联系表单
/reviews/[id]
  评论提交/查看入口
/privacy-policy
/terms-of-use
/shipping-policy
/return-policy
```

### 4.2 后台

```text
/admin/login
/admin
  Dashboard
/admin/products
/admin/products/new
/admin/products/[id]
/admin/reviews
/admin/reviews/[slug]
/admin/coupons
/admin/coupons/[id]
/admin/orders
/admin/customers
/admin/forms
/admin/forms/[formKey]
/admin/forms/[formKey]/[id]
/admin/omb-claims
/admin/rewards
/admin/rewards/mascots/new
/admin/rewards/mascots/[id]
/admin/posts
/admin/posts/new
/admin/posts/[id]
/admin/posts/[id]/preview
/admin/email
/admin/email-marketing
/admin/email-marketing/new
/admin/email-marketing/[id]
/admin/email-marketing/audience/[audienceType]
/admin/finance
/admin/settings
/admin/comic
/admin/comic/project
/admin/comic/characters
/admin/comic/characters/new
/admin/comic/characters/[id]
/admin/comic/scenes
/admin/comic/scenes/new
/admin/comic/scenes/[id]
/admin/comic/seasons
/admin/comic/seasons/new
/admin/comic/seasons/[id]
/admin/comic/chapters/[id]
/admin/comic/outline-studio
/admin/comic/publish-center
/admin/comic/publish-center/chapters/[id]
/admin/comic/extra-story-outline
/admin/comic/extra-story-publish-center
/admin/comic/product-locks
/admin/comic/image-creation
```

### 4.3 API 和媒体路由

- `/api/checkout`、`/api/stripe/webhook`：支付和订单创建。
- `/api/contact`、`/api/subscribe`：表单提交。
- `/api/om*`、`/api/ryo*`：活动流程提交。
- `/api/admin/*`：后台异步操作、审核、导出、同步。
- `/api/cron/*`：定时任务，如 AI posts、comic tasks、follow emails。
- `/media/*`：历史本地/数据库媒体 fallback；正式大图应优先使用 Vercel Blob URL。

## 5. 数据结构

### 5.1 商品与交易

| 实体 | 说明 | 关键字段 |
| --- | --- | --- |
| Product | 商品主数据 | productCode, slug, name, category, description, imageUrl, galleryImages, status, inventory, priceCents, compareAtPriceCents, pointsReward, stripePriceId |
| Order | 订单 | orderNumber, email, status, fulfillmentStatus, totals, shipping fields, billing fields, stripeCheckoutId, stripePaymentIntentId, customerId |
| OrderItem | 订单商品行 | name, slug, quantity, unitPriceCents, lineTotalCents, imageUrl, productId |
| OrderActivityLog | 订单操作日志 | eventType, summary, detail, orderId |
| Coupon | 优惠券 | code, active, discountType, percentOff, amountOffCents, usageMode, expiresAt, productCodes |

### 5.2 用户、积分与评论

| 实体 | 说明 | 关键字段 |
| --- | --- | --- |
| Customer | 客户账户 | email, firstName, lastName, passwordHash, marketingOptIn, loyaltyPoints, totalSpentCents |
| CustomerSession | 登录会话 | tokenHash, expiresAt, customerId |
| RewardEntry | 积分流水 | type, points, note, customerId, orderId |
| ProductReview | 商品评论 | rating, title, content, displayName, status, verifiedPurchase, productId, customerId, orderId |
| MascotReward | 吉祥物奖励 | sku, name, slug, description, imageUrl, pointsCost, active |
| MascotRedemption | 吉祥物兑换 | pointsSpent, status, email, address fields, customerId, mascotId |

### 5.3 内容与营销

| 实体 | 说明 | 关键字段 |
| --- | --- | --- |
| Post | Beauty Tips 文章 | title, slug, excerpt, coverImageUrl, content, seoTitle, seoDescription, aiGenerated, imagePrompt, published |
| FormSubmission | 表单提交 | formKey, formLabel, email, name, subject, summary, message, payload, handled |
| EmailContact | 邮件受众 | email, audienceType, brevoContactId, brevoListId, emailBlacklisted |
| EmailCampaign | 邮件营销活动 | name, subject, audienceType, contentHtml, status, brevoCampaignId, scheduledAt |
| MailboxReplyExample | 邮箱回复样例 | toEmail, subject, bodyText, sourceSenderName, sourceSnippet |

### 5.4 OMB / RYO 活动

| 实体 | 说明 | 关键字段 |
| --- | --- | --- |
| OmbClaim | OMB claim | platformKey, orderId, name, email, purchasedProduct, reviewRating, screenshotBase64, extraBottleAddress, giftSent, completedAt |
| RyoClaim | Register Your Order | platformKey, orderId, name, email, purchasedProduct, screenshotBase64, pointsAwarded, rewardGranted, completedAt |
| FollowEmailLog | 活动跟进邮件日志 | processKey, stageKey, recipientEmail, subject, bodyText, ombClaimId, ryoClaimId |

### 5.5 Comic 内容系统

| 实体 | 说明 | 关键字段 |
| --- | --- | --- |
| ComicProject | 漫画项目 Bible | slug, title, shortDescription, storyOutline, worldRules, visualStyleGuide |
| ComicCharacter | 角色设定 | name, chineseName, slug, appearance, personality, speechGuide, referenceFolder |
| ComicScene | 场景设定 | name, slug, summary, visualNotes, moodNotes, referenceFolder |
| ComicSeason | 季 | seasonNumber, slug, title, summary, outline, published |
| ComicChapter | 章 | chapterNumber, slug, title, summary, outline, published |
| ComicEpisode | 集 | episodeNumber, slug, title, script, panelPlan, promptPack, requiredReferences, coverImageUrl, storyType, published |
| ComicEpisodeAsset | 漫画页面/素材 | assetType, title, imageUrl, imageStorageKey, imageByteSize, altText, sortOrder, published |
| ComicPromptRun | AI prompt 运行记录 | promptType, model, imageModel, status, inputContext, outputSummary, promptPack, errorMessage |
| ComicAiTask | AI 任务队列 | taskType, label, status, payload, attempts, lockedAt, completedAt |
| ComicImageCreation | 独立图片生成 | prompt, aspectRatio, quality, model, imageUrl, referenceImageUrl, imageStorageKey |
| ComicProductLock | 产品视觉锁定 | productId, slug, displayName, shortCode, visualNotes, usageNotes, imageUrl |

### 5.6 配置与财务

| 实体 | 说明 | 关键字段 |
| --- | --- | --- |
| StoreSetting | 运行配置 | key, value |
| ContactSubmission | 旧版联系表单兼容 | name, email, subject, message |
| FinancePaymentDetail | 财务付款明细 | paymentDate, paymentStage, sku, productName, quantity, unitPriceYuan, paymentProofBase64 |

## 6. 技术架构

### 6.1 前端

- Framework：Next.js App Router。
- UI：React 19、TypeScript、CSS modules/global CSS 风格。
- 图片：Next Image + Vercel Blob remote patterns；本地 `/media/*` 作为 fallback。
- SEO：metadata、Open Graph、Twitter Card、sitemap、robots、结构化数据。

### 6.2 后端

- Runtime：Next.js Route Handlers、Server Components、Server Actions。
- ORM：Prisma Client。
- Database：Supabase Postgres。
- Auth：
  - Admin：环境变量用户名/密码 + signed session cookie。
  - Customer：邮箱密码、CustomerSession。
- Checkout：Stripe Checkout + webhook。
- Email：
  - SMTP/Nodemailer 用于系统邮件。
  - IMAP/mailparser 用于后台邮箱读取。
  - Brevo 用于营销受众和 campaign。

### 6.3 媒体与文件

- 正式商品、首页、博客、吉祥物、漫画图片：Vercel Blob。
- `data/vercel-blob-media-manifest.generated.ts` 保存本地历史 URL 到 Blob URL 的映射。
- `/media/product`、`/media/site`、`/media/post`、`/media/comic` 保留为历史兼容和 fallback。
- 新增媒体迁移命令：`npm run media:migrate-blob -- --apply`。
- 漫画图片迁移命令：`npm run comic:migrate-images -- --apply`。

### 6.4 AI 与自动化

- APIYI 文本模型：SEO 文章、邮件草稿、漫画大纲、prompt 修订。
- APIYI 图片模型：博客封面、漫画页面、产品锁图、中文漫画页。
- Cron：
  - AI posts 自动化。
  - Comic task queue。
  - Follow emails。

### 6.5 部署

- Hosting：Vercel。
- Build：`npm run vercel-build`，包含 Prisma generate、migrate deploy、comic reference sync、Next build、trace guard。
- 必要环境变量：
  - `DATABASE_URL`、`DIRECT_URL`
  - `ADMIN_USERNAME`、`ADMIN_PASSWORD`、`ADMIN_SESSION_SECRET`
  - `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`
  - `BLOB_READ_WRITE_TOKEN`
  - `APIYI_API_KEY`、`APIYI_BASE_URL`、`AI_TEXT_MODEL`、`AI_IMAGE_MODEL`
  - `BREVO_*`
  - `CRON_SECRET`

## 7. MVP 方案

### 7.1 MVP 目标

用最小完整版本验证 Neatique 独立站是否能完成“品牌信任建立 -> 商品浏览 -> 下单支付 -> 售后/评论/积分沉淀”的闭环，同时给运营保留必要后台能力。

### 7.2 MVP 范围

必须包含：

- 首页、Shop、商品详情、Cart、Checkout、支付成功/取消。
- 用户注册登录、账户订单查看。
- 商品评论提交与后台审核。
- Beauty Tips 基础文章列表/详情。
- Contact 和 Subscribe 表单。
- Admin 后台：商品、订单、评论、客户、表单、优惠券、基础设置。
- Stripe Checkout 和 webhook。
- Supabase Postgres + Prisma。
- Vercel Blob 图片托管。
- sitemap、robots、基础 SEO metadata。

可选但建议包含：

- RYO 基础流程：订单注册、积分发放、后台审核。
- Mascot rewards 展示与 redemption 提交。
- AI SEO posts 的手动触发，不做复杂自动化。

暂缓到 MVP 后：

- Comic 全量生产系统。
- 中文漫画页自动生成。
- Brevo 完整营销报表。
- Finance payment details。
- 邮箱收件箱与 AI 回复。
- 多语言商城。
- 高级推荐、会员等级、订阅制购买。

### 7.3 MVP 用户旅程

1. 新访客进入首页，理解品牌和核心产品。
2. 进入 Shop 或商品详情页，对比成分、价格、评论和图片。
3. 加入购物车，填写美国收货地址，跳转 Stripe 支付。
4. 支付成功后生成订单，库存和积分记录更新。
5. 用户登录账户查看订单。
6. 用户提交评论，后台审核后展示在商品页。
7. 运营发布 Beauty Tips，持续获取自然搜索流量。

### 7.4 MVP 后台旅程

1. 管理员登录后台。
2. 创建/编辑商品，设置图片、库存、价格、状态。
3. 查看订单并更新履约状态、物流单号。
4. 审核评论并发布。
5. 查看联系表单和订阅名单。
6. 创建优惠券或基础文章。
7. 监控 dashboard 指标和低库存提醒。

### 7.5 MVP 验收标准

- 用户能完成从首页到支付成功的完整购买链路。
- 管理员能在后台看到订单、商品、客户、评论和表单。
- 商品页能展示至少 4 个核心商品、图片、价格、库存和评论。
- 支付成功后订单状态、库存、订单行和活动日志正确写入。
- Beauty Tips 至少支持 3 篇已发布文章。
- 所有正式图片走 Blob 或稳定 CDN URL，不把大图作为正式数据写入 Postgres。
- `npm test` 和 `npm run build` 通过。

### 7.6 MVP 里程碑

| 阶段 | 目标 | 交付物 |
| --- | --- | --- |
| M0 基础配置 | 可部署、可访问、可连数据库 | 环境变量、数据库 schema、Vercel 部署、Blob 配置 |
| M1 商品闭环 | 商品浏览到支付成功 | 首页、Shop、PDP、Cart、Checkout、Stripe webhook |
| M2 运营后台 | 可管理商品和订单 | Admin dashboard、Products、Orders、Reviews、Forms |
| M3 内容增长 | SEO 和内容入口上线 | Beauty Tips、sitemap、OG、AI 文章手动生成 |
| M4 会员沉淀 | 复购与互动机制 | Account、积分、RYO 基础、Mascot Rewards |

### 7.7 风险与约束

- 只服务美国市场时，地址校验、税费、物流策略需要保持一致。
- 护肤品文案应避免医疗化、绝对化功效表达。
- 大图片必须走 Blob/CDN，避免 Supabase egress 和数据库膨胀。
- AI 生成内容必须由运营审核后发布，尤其是功效、成分和图片。
- Stripe webhook 是订单可靠性的关键路径，需要生产环境实测。
- Admin 权限目前偏单一，后续多人协作应补角色权限。

## 8. 后续迭代建议

- 增加产品套装、routine builder 和成分筛选。
- 增加评论激励、UGC 展示和购买后自动邀评。
- 将 Mascot Rewards 与 TikTok 活动做成更自动化的审核流。
- 增加邮件生命周期：欢迎、弃购、购买后、复购提醒、评论邀请。
- 增加漫画与产品联动：每集推荐相关产品、extra story 商品落地页。
- 增加 BI 报表：流量来源、转化漏斗、活动 ROI、SEO 文章贡献。
- 增加细粒度后台权限：客服、内容、财务、管理员。
