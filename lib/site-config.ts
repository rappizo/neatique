export const siteConfig = {
  name: "Neatique",
  url: "https://neatiquebeauty.com",
  title: "Neatique Beauty",
  description:
    "Bright, comforting skincare essentials crafted for smooth texture, hydration, and everyday glow.",
  accentColor: "#ed7361",
  supportEmail: "support@neatiquebeauty.com",
  phone: "+1 (213) 555-0148",
  nav: [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/comic", label: "Comic" },
    { href: "/beauty-tips", label: "Beauty Tips" },
    { href: "/contact", label: "Contact" }
  ],
  adminNav: [
    { href: "/admin", label: "Dashboard" },
    {
      href: "/admin/products",
      label: "Products",
      children: [
        { href: "/admin/products", label: "All Products" },
        { href: "/admin/products/new", label: "Add Product" },
        { href: "/admin/reviews", label: "Product Reviews" },
        { href: "/admin/coupons", label: "Coupons by Product" }
      ]
    },
    {
      href: "/admin/omb-claims",
      label: "OMB Claim",
      children: [
        { href: "/admin/omb-claims#all-claims", label: "All Claims" },
        { href: "/admin/omb-claims#email-following-settings", label: "Email Following Setting" }
      ]
    },
    { href: "/admin/forms", label: "Forms" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/customers", label: "Users" },
    {
      href: "/admin/rewards",
      label: "Points & Rewards",
      children: [
        { href: "/admin/rewards#ryo", label: "RYO" },
        { href: "/admin/rewards#redemption", label: "Redemption" },
        { href: "/admin/rewards#point-adjustment", label: "Point Adjustment" },
        { href: "/admin/rewards#mascot-setting", label: "Mascot Setting" },
        { href: "/admin/rewards#following-email", label: "Following Email" },
        { href: "/admin/rewards#rewards-ledger", label: "Rewards Ledger" }
      ]
    },
    {
      href: "/admin/posts",
      label: "Posts",
      children: [
        { href: "/admin/posts#post-library", label: "All Posts" },
        { href: "/admin/posts/new", label: "Add Post" },
        { href: "/admin/posts#ai-seo-posts", label: "AI SEO Posts" },
        { href: "/admin/posts#post-library", label: "Post Images" },
        { href: "/admin/posts#seo-automation", label: "SEO Automation" }
      ]
    },
    {
      href: "/admin/comic",
      label: "Comic",
      children: [
        { href: "/admin/comic", label: "Comic Overview" },
        { href: "/admin/comic/publish-center", label: "Publish Center" },
        { href: "/admin/comic/prompt-studio", label: "Prompt Studio" },
        { href: "/admin/comic/seasons", label: "Seasons & Chapters" },
        { href: "/admin/comic/characters", label: "Characters" },
        { href: "/admin/comic/scenes", label: "Scenes" },
        { href: "/admin/comic/project", label: "Project Bible" }
      ]
    },
    {
      href: "/admin/email-marketing",
      label: "Email Marketing",
      children: [
        { href: "/admin/email-marketing#campaign-report", label: "Campaign Reports" },
        { href: "/admin/email-marketing#campaigns", label: "Campaigns" },
        { href: "/admin/email-marketing#audience-sync", label: "Audience Lists" },
        { href: "/admin/email-marketing#ai-drafting", label: "AI Drafting" },
        { href: "/admin/email-marketing#audience-sync", label: "Brevo Sync" },
        { href: "/admin/email-marketing#brevo-connection", label: "Settings" }
      ]
    },
    {
      href: "/admin/settings",
      label: "Settings",
      children: [
        { href: "/admin/email", label: "Email Inbox & Delivery" },
        { href: "/admin/email-marketing#brevo-connection", label: "Brevo Connection" }
      ]
    }
  ],
  footerLinks: {
    shop: [
      { href: "/shop", label: "All Products" },
      { href: "/shop/at13-arbutin-tranexamic-cream", label: "AT13 Cream" },
      { href: "/shop/pdrn-cream", label: "PDRN Cream" },
      { href: "/shop/snail-mucin-serum", label: "Snail Mucin Serum" }
    ],
    discover: [
      { href: "/comic", label: "Comic" },
      { href: "/beauty-tips", label: "Beauty Tips" },
      { href: "/mascot", label: "Mascot Rewards" },
      { href: "/contact", label: "Contact Us" },
      { href: "/cart", label: "Cart" },
      { href: "/account", label: "My Account" }
    ],
    policies: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms-of-use", label: "Terms of Use" },
      { href: "/shipping-policy", label: "Shipping Policy" },
      { href: "/return-policy", label: "Return Policy" }
    ]
  }
};
