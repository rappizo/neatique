# Neatique Beauty

First-phase brand website for `neatiquebeauty.com`, built with Next.js, Prisma, SQLite, and Stripe-ready checkout.

## Included in this phase

- English storefront pages: Home, Shop, Beauty Tips, Contact
- Product detail pages for the four launch products
- Customer accounts with order, points, and review visibility
- Product reviews with verified-buyer submission and admin moderation
- SMTP email configuration for contact forms and account emails
- Professional global header and footer
- Admin portal for products, orders, users, points, and SEO posts
- Stripe checkout route and webhook handler
- SEO basics with article pages, sitemap, and robots

## Local setup

1. Copy `.env.example` to `.env`.
2. Fill in your admin credentials and Stripe keys.
3. Install dependencies:

```bash
npm install
```

4. Generate the database and seed starter data:

```bash
npm run db:push
npm run db:seed
```

5. Start development:

```bash
npm run dev
```

## Notes

- Current checkout is restricted to the United States.
- Product and post images are local SVG placeholders and can be replaced at any time.
- When you provide real product pricing, photography, and final copy, the existing admin and storefront structure can be updated directly without rebuilding the site architecture.
"# neaitque" 
