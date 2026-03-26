# Neatique Beauty

First-phase brand website for `neatiquebeauty.com`, built with Next.js, Prisma, Supabase Postgres, and Stripe-ready checkout.

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
2. Fill in your Supabase database connection strings, admin credentials, and Stripe keys.
3. Install dependencies:

```bash
npm install
```

4. Point `DATABASE_URL` and `DIRECT_URL` to your Supabase Postgres database, then generate the database and starter data:

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
- This app uses Prisma with Supabase Postgres. Use the Supabase connection strings from `Project Settings -> Database -> Connection string`.
- For Vercel and other serverless environments, `DATABASE_URL` should use the Supabase transaction pooler string on port `6543`, with `pgbouncer=true&connection_limit=5&pool_timeout=30`.
- For Prisma schema operations such as `prisma db push`, `DIRECT_URL` should use the Supabase session pooler string on port `5432`.
- The app runtime uses `DATABASE_URL`, while `DIRECT_URL` is reserved for Prisma schema operations.
- Avoid using the direct `db.<project-ref>.supabase.co:5432` connection string on Vercel unless your environment supports IPv6 or you have the Supabase IPv4 add-on.
- The Supabase project API URL is not used by the current app because authentication and data access run through Prisma, not the Supabase JS client.
- When you provide real product pricing, photography, and final copy, the existing admin and storefront structure can be updated directly without rebuilding the site architecture.

## Vercel Deployment

1. Create or open your Supabase project database.
2. In Vercel, add both `DATABASE_URL` and `DIRECT_URL` from Supabase, plus the existing Stripe and admin variables.
3. Deploy the GitHub repository.

The repo includes [`vercel.json`](./vercel.json), so Vercel will automatically run:

```bash
npm run vercel-build
```

That command generates Prisma Client, runs `prisma db push`, and then builds the Next.js app.

After the schema is in place, the app automatically bootstraps starter products, posts, store settings, and sample reviews into an empty production database on first build/request.
