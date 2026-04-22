-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FULFILLED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('UNFULFILLED', 'PROCESSING', 'SHIPPED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('EARNED', 'REDEEMED', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "MascotRedemptionStatus" AS ENUM ('REQUESTED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENT', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "CouponUsageMode" AS ENUM ('SINGLE_USE', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "EmailCampaignStatus" AS ENUM ('DRAFT', 'SYNCED', 'SCHEDULED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailAudienceType" AS ENUM ('NEWSLETTER', 'CUSTOMERS', 'LEADS', 'ALL_MARKETING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FollowEmailProcess" AS ENUM ('OMB', 'RYO');

-- CreateEnum
CREATE TYPE "FollowEmailStage" AS ENUM ('WAITING_STEP_2', 'WAITING_LAST_STEP', 'COMPLETED');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "productCode" TEXT,
    "productShortName" TEXT,
    "amazonAsin" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "galleryImages" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "inventory" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER NOT NULL,
    "compareAtPriceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "pointsReward" INTEGER NOT NULL DEFAULT 0,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "readTime" INTEGER NOT NULL DEFAULT 4,
    "coverImageUrl" TEXT NOT NULL,
    "coverImageAlt" TEXT,
    "coverImageData" TEXT,
    "coverImageMimeType" TEXT,
    "previewImageData" TEXT,
    "previewImageMimeType" TEXT,
    "previewImagePrompt" TEXT,
    "previewImageGeneratedAt" TIMESTAMP(3),
    "content" TEXT NOT NULL,
    "seoTitle" TEXT NOT NULL,
    "seoDescription" TEXT NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "focusKeyword" TEXT,
    "secondaryKeywords" TEXT,
    "imagePrompt" TEXT,
    "externalLinks" TEXT,
    "generatedAt" TIMESTAMP(3),
    "sourceProductId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "passwordHash" TEXT,
    "passwordSetAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "totalSpentCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MascotReward" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL DEFAULT 1000,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MascotReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MascotRedemption" (
    "id" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "status" "MascotRedemptionStatus" NOT NULL DEFAULT 'REQUESTED',
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "adminNote" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "mascotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MascotRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailContact" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "audienceType" "EmailAudienceType" NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'BREVO_IMPORT',
    "brevoContactId" INTEGER,
    "brevoListId" INTEGER,
    "listName" TEXT,
    "emailBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "couponId" TEXT,
    "stripeCheckoutId" TEXT,
    "stripePaymentIntentId" TEXT,
    "shippingName" TEXT,
    "shippingAddress1" TEXT,
    "shippingAddress2" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingPostalCode" TEXT,
    "shippingCountry" TEXT,
    "billingName" TEXT,
    "billingAddress1" TEXT,
    "billingAddress2" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingPostalCode" TEXT,
    "billingCountry" TEXT,
    "notes" TEXT,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardEntry" (
    "id" TEXT NOT NULL,
    "type" "RewardType" NOT NULL,
    "points" INTEGER NOT NULL,
    "note" TEXT,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RyoClaim" (
    "id" TEXT NOT NULL,
    "platformKey" TEXT NOT NULL,
    "platformLabel" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "purchasedProduct" TEXT,
    "reviewRating" INTEGER,
    "commentText" TEXT,
    "reviewDestinationUrl" TEXT,
    "screenshotName" TEXT,
    "screenshotMimeType" TEXT,
    "screenshotBase64" TEXT,
    "screenshotBytes" INTEGER,
    "customerId" TEXT,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 500,
    "rewardGranted" BOOLEAN NOT NULL DEFAULT false,
    "rewardGrantedAt" TIMESTAMP(3),
    "reviewStepSubmittedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RyoClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "adminNotes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "productId" TEXT NOT NULL,
    "customerId" TEXT,
    "orderId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "combinable" BOOLEAN NOT NULL DEFAULT false,
    "appliesToAll" BOOLEAN NOT NULL DEFAULT false,
    "productCodes" TEXT,
    "discountType" "CouponDiscountType" NOT NULL,
    "percentOff" INTEGER,
    "amountOffCents" INTEGER,
    "usageMode" "CouponUsageMode" NOT NULL DEFAULT 'UNLIMITED',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "formKey" TEXT NOT NULL,
    "formLabel" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "subject" TEXT,
    "summary" TEXT,
    "message" TEXT,
    "payload" TEXT,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "handledAt" TIMESTAMP(3),
    "legacyContactSubmissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "strategyBrief" TEXT,
    "audienceType" "EmailAudienceType" NOT NULL DEFAULT 'NEWSLETTER',
    "customListIds" TEXT,
    "senderName" TEXT,
    "senderEmail" TEXT,
    "replyTo" TEXT,
    "contentHtml" TEXT NOT NULL,
    "contentText" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "status" "EmailCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "brevoCampaignId" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "lastTestedAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OmbClaim" (
    "id" TEXT NOT NULL,
    "platformKey" TEXT NOT NULL,
    "platformLabel" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "purchasedProduct" TEXT,
    "reviewRating" INTEGER,
    "commentText" TEXT,
    "reviewDestinationUrl" TEXT,
    "screenshotName" TEXT,
    "screenshotMimeType" TEXT,
    "screenshotBase64" TEXT,
    "screenshotBytes" INTEGER,
    "extraBottleAddress" TEXT,
    "giftSent" BOOLEAN NOT NULL DEFAULT false,
    "giftSentAt" TIMESTAMP(3),
    "reviewStepSubmittedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OmbClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowEmailLog" (
    "id" TEXT NOT NULL,
    "processKey" "FollowEmailProcess" NOT NULL,
    "stageKey" "FollowEmailStage" NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "ombClaimId" TEXT,
    "ryoClaimId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailboxReplyExample" (
    "id" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "replyTo" TEXT,
    "sourceSenderName" TEXT,
    "sourceSenderEmail" TEXT,
    "sourceSubject" TEXT,
    "sourceSnippet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailboxReplyExample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_productCode_key" ON "Product"("productCode");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_status_featured_createdAt_idx" ON "Product"("status", "featured", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_published_publishedAt_idx" ON "Post"("published", "publishedAt");

-- CreateIndex
CREATE INDEX "Post_aiGenerated_createdAt_idx" ON "Post"("aiGenerated", "createdAt");

-- CreateIndex
CREATE INDEX "Post_sourceProductId_createdAt_idx" ON "Post"("sourceProductId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MascotReward_sku_key" ON "MascotReward"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "MascotReward_slug_key" ON "MascotReward"("slug");

-- CreateIndex
CREATE INDEX "MascotRedemption_customerId_createdAt_idx" ON "MascotRedemption"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "MascotRedemption_status_createdAt_idx" ON "MascotRedemption"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailContact_audienceType_updatedAt_idx" ON "EmailContact"("audienceType", "updatedAt");

-- CreateIndex
CREATE INDEX "EmailContact_brevoListId_idx" ON "EmailContact"("brevoListId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailContact_email_audienceType_key" ON "EmailContact"("email", "audienceType");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeCheckoutId_key" ON "Order"("stripeCheckoutId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "RewardEntry_customerId_createdAt_idx" ON "RewardEntry"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "RewardEntry_type_createdAt_idx" ON "RewardEntry"("type", "createdAt");

-- CreateIndex
CREATE INDEX "RyoClaim_platformKey_createdAt_idx" ON "RyoClaim"("platformKey", "createdAt");

-- CreateIndex
CREATE INDEX "RyoClaim_email_createdAt_idx" ON "RyoClaim"("email", "createdAt");

-- CreateIndex
CREATE INDEX "RyoClaim_completedAt_createdAt_idx" ON "RyoClaim"("completedAt", "createdAt");

-- CreateIndex
CREATE INDEX "RyoClaim_rewardGranted_idx" ON "RyoClaim"("rewardGranted");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSession_tokenHash_key" ON "CustomerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "ProductReview_productId_reviewDate_idx" ON "ProductReview"("productId", "reviewDate");

-- CreateIndex
CREATE INDEX "ProductReview_productId_status_reviewDate_idx" ON "ProductReview"("productId", "status", "reviewDate");

-- CreateIndex
CREATE INDEX "ProductReview_customerId_reviewDate_idx" ON "ProductReview"("customerId", "reviewDate");

-- CreateIndex
CREATE INDEX "ProductReview_status_reviewDate_idx" ON "ProductReview"("status", "reviewDate");

-- CreateIndex
CREATE UNIQUE INDEX "StoreSetting_key_key" ON "StoreSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_active_expiresAt_idx" ON "Coupon"("active", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "FormSubmission_legacyContactSubmissionId_key" ON "FormSubmission"("legacyContactSubmissionId");

-- CreateIndex
CREATE INDEX "FormSubmission_formKey_createdAt_idx" ON "FormSubmission"("formKey", "createdAt");

-- CreateIndex
CREATE INDEX "FormSubmission_formKey_handled_createdAt_idx" ON "FormSubmission"("formKey", "handled", "createdAt");

-- CreateIndex
CREATE INDEX "FormSubmission_formKey_email_createdAt_idx" ON "FormSubmission"("formKey", "email", "createdAt");

-- CreateIndex
CREATE INDEX "FormSubmission_email_idx" ON "FormSubmission"("email");

-- CreateIndex
CREATE INDEX "FormSubmission_handled_idx" ON "FormSubmission"("handled");

-- CreateIndex
CREATE INDEX "EmailCampaign_status_updatedAt_idx" ON "EmailCampaign"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "EmailCampaign_audienceType_idx" ON "EmailCampaign"("audienceType");

-- CreateIndex
CREATE INDEX "EmailCampaign_scheduledAt_idx" ON "EmailCampaign"("scheduledAt");

-- CreateIndex
CREATE INDEX "OmbClaim_platformKey_createdAt_idx" ON "OmbClaim"("platformKey", "createdAt");

-- CreateIndex
CREATE INDEX "OmbClaim_email_createdAt_idx" ON "OmbClaim"("email", "createdAt");

-- CreateIndex
CREATE INDEX "OmbClaim_platformKey_purchasedProduct_createdAt_idx" ON "OmbClaim"("platformKey", "purchasedProduct", "createdAt");

-- CreateIndex
CREATE INDEX "OmbClaim_giftSent_idx" ON "OmbClaim"("giftSent");

-- CreateIndex
CREATE INDEX "OmbClaim_completedAt_createdAt_idx" ON "OmbClaim"("completedAt", "createdAt");

-- CreateIndex
CREATE INDEX "FollowEmailLog_processKey_createdAt_idx" ON "FollowEmailLog"("processKey", "createdAt");

-- CreateIndex
CREATE INDEX "FollowEmailLog_stageKey_createdAt_idx" ON "FollowEmailLog"("stageKey", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FollowEmailLog_ombClaimId_stageKey_key" ON "FollowEmailLog"("ombClaimId", "stageKey");

-- CreateIndex
CREATE UNIQUE INDEX "FollowEmailLog_ryoClaimId_stageKey_key" ON "FollowEmailLog"("ryoClaimId", "stageKey");

-- CreateIndex
CREATE INDEX "MailboxReplyExample_toEmail_createdAt_idx" ON "MailboxReplyExample"("toEmail", "createdAt");

-- CreateIndex
CREATE INDEX "MailboxReplyExample_createdAt_idx" ON "MailboxReplyExample"("createdAt");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_sourceProductId_fkey" FOREIGN KEY ("sourceProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MascotRedemption" ADD CONSTRAINT "MascotRedemption_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MascotRedemption" ADD CONSTRAINT "MascotRedemption_mascotId_fkey" FOREIGN KEY ("mascotId") REFERENCES "MascotReward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardEntry" ADD CONSTRAINT "RewardEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardEntry" ADD CONSTRAINT "RewardEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RyoClaim" ADD CONSTRAINT "RyoClaim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSession" ADD CONSTRAINT "CustomerSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowEmailLog" ADD CONSTRAINT "FollowEmailLog_ombClaimId_fkey" FOREIGN KEY ("ombClaimId") REFERENCES "OmbClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowEmailLog" ADD CONSTRAINT "FollowEmailLog_ryoClaimId_fkey" FOREIGN KEY ("ryoClaimId") REFERENCES "RyoClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

