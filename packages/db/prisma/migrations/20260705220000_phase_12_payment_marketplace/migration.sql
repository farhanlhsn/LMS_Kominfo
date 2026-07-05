-- Phase 12: Payment & Marketplace
-- Add pricing fields to Course
ALTER TABLE "Course" ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Course" ADD COLUMN "price" INTEGER;
ALTER TABLE "Course" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'IDR';

-- Coupon
CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "code" TEXT NOT NULL, "description" TEXT,
  "discountPercent" INTEGER NOT NULL DEFAULT 0, "discountAmount" INTEGER DEFAULT 0,
  "maxUses" INTEGER DEFAULT 0, "currentUses" INTEGER NOT NULL DEFAULT 0, "maxPerUser" INTEGER NOT NULL DEFAULT 1,
  "courseId" TEXT, "minAmount" INTEGER DEFAULT 0, "validFrom" TIMESTAMP(3), "validUntil" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Coupon_organizationId_code_key" ON "Coupon"("organizationId", "code");
CREATE INDEX "Coupon_organizationId_isActive_idx" ON "Coupon"("organizationId", "isActive");

-- Order
CREATE TABLE "Order" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "subtotal" INTEGER NOT NULL DEFAULT 0, "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'IDR',
  "couponId" TEXT, "notes" TEXT, "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_organizationId_createdAt_idx" ON "Order"("organizationId", "createdAt");
CREATE INDEX "Order_organizationId_userId_idx" ON "Order"("organizationId", "userId");
CREATE INDEX "Order_organizationId_status_idx" ON "Order"("organizationId", "status");

-- OrderItem
CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "courseId" TEXT NOT NULL,
  "price" INTEGER NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'IDR',
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrderItem_orderId_courseId_key" ON "OrderItem"("orderId", "courseId");

-- Payment
CREATE TABLE "Payment" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "orderId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'MANUAL', "providerPaymentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING', "amount" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'IDR', "proofImageUrl" TEXT, "bankName" TEXT,
  "accountName" TEXT, "accountNumber" TEXT, "paidAt" TIMESTAMP(3),
  "confirmedById" TEXT, "confirmedAt" TIMESTAMP(3), "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Payment_organizationId_status_idx" ON "Payment"("organizationId", "status");
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- SubscriptionPlan
CREATE TABLE "SubscriptionPlan" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
  "price" INTEGER NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'IDR',
  "interval" TEXT NOT NULL DEFAULT 'MONTHLY', "intervalCount" INTEGER NOT NULL DEFAULT 1,
  "courseAccess" TEXT NOT NULL DEFAULT 'ALL', "maxEnrollments" INTEGER DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SubscriptionPlan_organizationId_isActive_idx" ON "SubscriptionPlan"("organizationId", "isActive");

-- UserSubscription
CREATE TABLE "UserSubscription" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "currentPeriodStart" TIMESTAMP(3), "currentPeriodEnd" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserSubscription_organizationId_userId_planId_key" ON "UserSubscription"("organizationId", "userId", "planId");
CREATE INDEX "UserSubscription_organizationId_userId_idx" ON "UserSubscription"("organizationId", "userId");
CREATE INDEX "UserSubscription_organizationId_status_idx" ON "UserSubscription"("organizationId", "status");

-- Foreign keys
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
