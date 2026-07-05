import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Inject, UseGuards, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { ReviewsService } from "./reviews.service";
import type { CreateReviewDto, ModerateReviewDto, AddWishlistDto, FavoriteInstructorDto, ReviewQueryDto } from "./dto/reviews.dto";

@Controller("api/v1")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class ReviewsController {
  constructor(@Inject(ReviewsService) private readonly reviews: ReviewsService) {}

  // ── Reviews ─────────────────────────────────────────

  @Post("reviews")
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateReviewDto) {
    return { data: await this.reviews.create(req.organization!, req.user.id, dto) };
  }

  @Patch("reviews/:id")
  async update(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: CreateReviewDto) {
    return { data: await this.reviews.update(req.organization!, req.user.id, id, dto) };
  }

  @Delete("reviews/:id")
  async delete(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return await this.reviews.delete(req.organization!, req.user.id, id);
  }

  @Get("courses/:courseId/reviews")
  async listForCourse(@Req() req: AuthenticatedRequest, @Param("courseId") courseId: string, @Query() query: ReviewQueryDto) {
    return this.reviews.listForCourse(req.organization!, courseId, query);
  }

  @Get("admin/reviews")
  async listModeration(@Req() req: AuthenticatedRequest, @Query() query: ReviewQueryDto) {
    return this.reviews.listModeration(req.organization!, query);
  }

  @Patch("admin/reviews/:id/moderate")
  async moderate(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ModerateReviewDto) {
    return { data: await this.reviews.moderate(req.organization!, req.user.id, id, dto) };
  }

  // ── Wishlist ────────────────────────────────────────

  @Post("wishlist")
  async addWishlist(@Req() req: AuthenticatedRequest, @Body() dto: AddWishlistDto) {
    return { data: await this.reviews.addWishlist(req.organization!, req.user.id, dto) };
  }

  @Delete("wishlist/:courseId")
  async removeWishlist(@Req() req: AuthenticatedRequest, @Param("courseId") courseId: string) {
    return await this.reviews.removeWishlist(req.organization!, req.user.id, courseId);
  }

  @Get("wishlist")
  async listWishlist(@Req() req: AuthenticatedRequest) {
    return { data: await this.reviews.listWishlist(req.organization!, req.user.id) };
  }

  // ── Favorite Instructors ────────────────────────────

  @Post("favorite-instructors")
  async addFavorite(@Req() req: AuthenticatedRequest, @Body() dto: FavoriteInstructorDto) {
    return { data: await this.reviews.addFavoriteInstructor(req.organization!, req.user.id, dto) };
  }

  @Delete("favorite-instructors/:instructorId")
  async removeFavorite(@Req() req: AuthenticatedRequest, @Param("instructorId") instructorId: string) {
    return await this.reviews.removeFavoriteInstructor(req.organization!, req.user.id, instructorId);
  }

  @Get("favorite-instructors")
  async listFavorites(@Req() req: AuthenticatedRequest) {
    return { data: await this.reviews.listFavoriteInstructors(req.organization!, req.user.id) };
  }

  // ── Recently Viewed ─────────────────────────────────

  @Post("recently-viewed/:courseId")
  async trackView(@Req() req: AuthenticatedRequest, @Param("courseId") courseId: string) {
    return { data: await this.reviews.trackView(req.organization!, req.user.id, courseId) };
  }

  @Get("recently-viewed")
  async listRecentlyViewed(@Req() req: AuthenticatedRequest) {
    return { data: await this.reviews.listRecentlyViewed(req.organization!, req.user.id) };
  }

  // ── Notes Export ────────────────────────────────────

  @Get("notes/export")
  async exportNotes(@Req() req: AuthenticatedRequest) {
    return await this.reviews.exportNotes(req.organization!, req.user.id);
  }
}
