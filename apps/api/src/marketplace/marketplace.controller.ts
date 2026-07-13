import { Controller, Get, Post, Body, Param, Query, Inject, UseGuards, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@lms/shared";
import type { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { MarketplaceService } from "./marketplace.service";
import { SetCoursePricingDto, CreateCouponDto, CreateOrderDto, ConfirmPaymentDto, ApprovePaymentDto, CreateSubscriptionPlanDto, MarketplaceQueryDto } from "./dto/marketplace.dto";

@ApiTags("Marketplace")
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class MarketplaceController {
  constructor(
    @Inject(MarketplaceService) private readonly marketplace: MarketplaceService
  ) {}

  // ── Course Pricing ─────────────────────────────────

  @Post("courses/:courseId/pricing")
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.coursesUpdate)
  async setPricing(@Req() req: AuthenticatedRequest, @Param("courseId") courseId: string, @Body() dto: SetCoursePricingDto) {
    return { data: await this.marketplace.setCoursePricing(req.organization!, courseId, dto) };
  }

  // ── Coupons ─────────────────────────────────────────

  @Post("coupons")
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.coursesUpdate)
  async createCoupon(@Req() req: AuthenticatedRequest, @Body() dto: CreateCouponDto) {
    return { data: await this.marketplace.createCoupon(req.organization!, req.user.id, dto) };
  }

  @Get("coupons")
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.analyticsView)
  async listCoupons(@Req() req: AuthenticatedRequest) {
    return { data: await this.marketplace.listCoupons(req.organization!) };
  }

  @Post("coupons/validate")
  async validateCoupon(@Req() req: AuthenticatedRequest, @Body() body: { code: string; courseIds?: string[] }) {
    return { data: await this.marketplace.validateCoupon(req.organization!, body.code, body.courseIds) };
  }

  // ── Orders ─────────────────────────────────────────

  @Post("orders")
  @ApiOperation({ summary: "Create order for course IDs" })
  async createOrder(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    return { data: await this.marketplace.createOrder(req.organization!, req.user.id, dto) };
  }

  @Get("orders/mine")
  @ApiOperation({ summary: "List my orders (paginated)" })
  async myOrders(@Req() req: AuthenticatedRequest, @Query() query: MarketplaceQueryDto) {
    return this.marketplace.getUserOrders(req.organization!, req.user.id, query);
  }

  @Get("orders/:id")
  @ApiOperation({ summary: "Get own order by id" })
  async getOrder(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return { data: await this.marketplace.getOrder(req.organization!, req.user.id, id) };
  }

  @Get("admin/orders")
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.analyticsView)
  async allOrders(@Req() req: AuthenticatedRequest, @Query() query: MarketplaceQueryDto) {
    return this.marketplace.getAllOrders(req.organization!, query);
  }

  // ── Payments ───────────────────────────────────────

  @Post("payments/confirm")
  @ApiOperation({ summary: "Submit payment proof (PENDING → AWAITING_REVIEW)" })
  async confirmPayment(@Req() req: AuthenticatedRequest, @Body() dto: ConfirmPaymentDto) {
    return { data: await this.marketplace.confirmPayment(req.organization!, req.user.id, dto) };
  }

  @Post("payments/approve")
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.coursesUpdate)
  @ApiOperation({ summary: "Admin approve payment (AWAITING_REVIEW → PAID)" })
  async approvePayment(@Req() req: AuthenticatedRequest, @Body() dto: ApprovePaymentDto) {
    return { data: await this.marketplace.approvePayment(req.organization!, req.user.id, dto) };
  }

  @Get("admin/payments")
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.analyticsView)
  async allPayments(@Req() req: AuthenticatedRequest, @Query() query: MarketplaceQueryDto) {
    return this.marketplace.getPayments(req.organization!, query);
  }

  // ── Subscription Plans ─────────────────────────────

  @Post("subscription-plans")
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.coursesCreate)
  async createPlan(@Req() req: AuthenticatedRequest, @Body() dto: CreateSubscriptionPlanDto) {
    return { data: await this.marketplace.createPlan(req.organization!, dto) };
  }

  @Get("subscription-plans")
  async listPlans(@Req() req: AuthenticatedRequest) {
    return { data: await this.marketplace.listPlans(req.organization!) };
  }

  @Post("subscription-plans/:planId/subscribe")
  async subscribe(@Req() req: AuthenticatedRequest, @Param("planId") planId: string) {
    return { data: await this.marketplace.subscribe(req.organization!, req.user.id, planId) };
  }

  @Get("subscriptions/mine")
  async mySubscriptions(@Req() req: AuthenticatedRequest) {
    return { data: await this.marketplace.getUserSubscription(req.organization!, req.user.id) };
  }
}
