import { expect, test } from "@playwright/test";
import {
  apiGet,
  apiGetWithMeta,
  apiPost,
  apiUrl,
  authHeaders,
  expectDenied,
  expectForbidden,
  login,
  rawDelete,
  rawGet,
  rawPost,
  uniqueName,
} from "../helpers/api";

/**
 * Phase 8 P0 security flows:
 * - 8.1 Payment ownership: PENDING → AWAITING_REVIEW → PAID, only owner/admin paths
 * - 8.3 File ownership: OWNER-access file denied to non-owner without files:read
 */
test.describe("Phase 8 P0 security flows", () => {
  test("payment AWAITING_REVIEW → PAID ownership and deny attacker", async ({
    request,
  }) => {
    const owner = await login(request, "learner");
    const attacker = await login(request, "learnerTwo");
    const instructor = await login(request, "instructor");

    const catalog = await apiGetWithMeta<any[]>(request, owner, "/courses");
    const course =
      catalog.data.find((c) => c.slug === "data-literacy-for-teams") ??
      catalog.data.find((c) => c.status === "PUBLISHED");
    expect(course?.id, "seed must expose a published course").toBeTruthy();

    await apiPost(request, instructor, `/courses/${course.id}/pricing`, {
      isPaid: true,
      price: 150_000,
      currency: "IDR",
    });

    const order = await apiPost<any>(request, owner, "/orders", {
      courseIds: [course.id],
      notes: uniqueName("P0 order"),
    });
    expect(order.id).toBeTruthy();
    expect(order.payments?.length).toBeGreaterThan(0);

    const paymentId = order.payments[0].id as string;
    expect(order.payments[0].status).toBe("PENDING");

    await expectDenied(rawGet(request, attacker, `/orders/${order.id}`));
    await expectDenied(
      rawPost(request, attacker, "/payments/confirm", {
        paymentId,
        bankName: "Evil Bank",
        accountName: "Attacker",
        accountNumber: "000",
      }),
    );

    const awaiting = await apiPost<any>(request, owner, "/payments/confirm", {
      paymentId,
      bankName: "Demo Bank",
      accountName: "Learner One",
      accountNumber: "1234567890",
      notes: "P0 transfer proof",
    });
    expect(awaiting.status).toBe("AWAITING_REVIEW");

    await expectForbidden(
      request.post(apiUrl("/payments/approve"), {
        headers: authHeaders(owner),
        data: { paymentId },
      }),
    );

    await expectDenied(
      rawPost(request, attacker, "/payments/approve", { paymentId }),
    );

    const paid = await apiPost<any>(request, instructor, "/payments/approve", {
      paymentId,
      notes: "P0 approved",
    });
    expect(paid.status).toBe("PAID");

    const ownerOrder = await apiGet<any>(request, owner, `/orders/${order.id}`);
    expect(ownerOrder.payments?.[0]?.status).toBe("PAID");
    await expectDenied(rawGet(request, attacker, `/orders/${order.id}`));
  });

  test("file OWNER access denies non-owner learner get/delete/signed-url", async ({
    request,
  }) => {
    const owner = await login(request, "instructor");
    const attacker = await login(request, "learner");

    const filename = `${uniqueName("p0-secret").replace(/\s+/g, "-")}.txt`;
    const upload = await request.post(apiUrl("/files/upload"), {
      headers: authHeaders(owner),
      multipart: {
        file: {
          name: filename,
          mimeType: "text/plain",
          buffer: Buffer.from("P0 secret file content — do not leak"),
        },
        visibility: "PRIVATE",
        accessLevel: "OWNER",
        purpose: "DOCUMENT",
      },
    });
    expect(upload.ok(), await upload.text()).toBeTruthy();
    const body = await upload.json();
    const file = body?.data ?? body;
    expect(file?.id, "upload must return file id").toBeTruthy();

    const mine = await apiGet<any>(request, owner, `/files/${file.id}`);
    expect(mine.id).toBe(file.id);

    await expectDenied(rawGet(request, attacker, `/files/${file.id}`));
    await expectDenied(
      rawPost(request, attacker, `/files/${file.id}/signed-url`, {
        expiresInSeconds: 120,
      }),
    );
    await expectDenied(rawDelete(request, attacker, `/files/${file.id}`));

    await rawDelete(request, owner, `/files/${file.id}`);
  });
});
