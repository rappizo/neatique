# Neatique Beauty

First-phase brand website for `neatiquebeauty.com`, built with Next.js, Prisma, PostgreSQL, and Stripe-ready checkout.

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

4. Point `DATABASE_URL` to a PostgreSQL database, then generate the database and starter data:

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
- Product images, blog images, and home-banner assets are read from the local `images/` folders.
- When you provide real product pricing, photography, and final copy, the existing admin and storefront structure can be updated directly without rebuilding the site architecture.

## Vercel Deployment

1. Create a PostgreSQL database for production.
   Recommended: Vercel Postgres or another hosted PostgreSQL provider such as Neon or Supabase.
2. In Vercel, add your `DATABASE_URL` environment variable plus the existing Stripe, admin, and email variables.
3. Deploy the GitHub repository.

The repo includes [`vercel.json`](./vercel.json), so Vercel will automatically run:

```bash
npm run vercel-build
```

That command generates Prisma Client, runs `prisma db push`, and then builds the Next.js app.

After the schema is in place, the app automatically bootstraps starter products, posts, store settings, and sample reviews into an empty production database on first build/request.
