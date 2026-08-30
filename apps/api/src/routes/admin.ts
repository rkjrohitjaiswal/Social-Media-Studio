import { Router, Response } from "express";
import prisma from "@ai-social/database";
import { AuthenticatedRequest, requireAuth, requireAdmin } from "../middleware/auth.js";
import { SAAS_PLANS_REGISTRY, SubscriptionPlan } from "@ai-social/shared";

export const adminRouter = Router();

// Enforce both session auth and application admin checks across all endpoints in this router
adminRouter.use(requireAuth as any);
adminRouter.use(requireAdmin as any);

/**
 * GET /api/admin/stats
 * Overview analytics for the admin dashboard.
 */
adminRouter.get("/stats", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    
    const activeSubscriptions = await prisma.subscription.count({
      where: { status: "ACTIVE" },
    });

    const paidUsers = await prisma.subscription.count({
      where: {
        status: "ACTIVE",
        plan: { in: ["PRO", "ADVANCED", "PREMIUM", "BUSINESS"] },
      },
    });

    const freeUsers = Math.max(0, totalUsers - paidUsers);

    return res.json({
      success: true,
      stats: {
        totalUsers,
        paidUsers,
        freeUsers,
        activeSubscriptions,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: `Failed to fetch stats: ${msg}` });
  }
});

/**
 * GET /api/admin/users
 * Paginated list of users with subscription & credit details, plus optional plan/source filters.
 */
adminRouter.get("/users", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20"), 10)));
    const search = String(req.query.search || "").trim();
    const planFilter = String(req.query.plan || "").trim().toUpperCase();
    const sourceFilter = String(req.query.source || "").trim().toUpperCase();

    const whereConditions: any[] = [];

    if (search) {
      whereConditions.push({
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { fullName: { contains: search, mode: "insensitive" } },
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (planFilter) {
      if (planFilter === "FREE") {
        whereConditions.push({
          OR: [
            { subscription: null },
            { subscription: { status: { not: "ACTIVE" } } },
            { subscription: { plan: "FREE" } },
          ],
        });
      } else {
        whereConditions.push({
          subscription: {
            status: "ACTIVE",
            plan: planFilter,
          },
        });
      }
    }

    if (sourceFilter) {
      whereConditions.push({
        subscription: {
          subscriptionSource: sourceFilter,
        },
      });
    }

    const whereClause = whereConditions.length > 0 ? { AND: whereConditions } : {};

    const [total, users] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          fullName: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          isAdmin: true,
          createdAt: true,
          subscription: true,
          usage: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const formattedUsers = users.map((u: any) => {
      const sub = u.subscription;
      const usage = u.usage;
      const plan = sub && sub.status === "ACTIVE" ? sub.plan : "FREE";
      const totalCredits = usage ? usage.freeCreditsTotal : 10;
      const usedCredits = usage ? usage.freeCreditsUsed : 0;
      const remainingCredits = Math.max(0, totalCredits - usedCredits);

      return {
        id: u.id,
        email: u.email,
        name: u.fullName || u.firstName || u.email.split("@")[0],
        avatarUrl: u.avatarUrl,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt.toISOString(),
        currentPlan: plan,
        subscriptionStatus: sub?.status || "EXPIRED",
        subscriptionSource: sub?.subscriptionSource || "RAZORPAY",
        currentPeriodEnd: sub?.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
        creditsTotal: totalCredits,
        creditsUsed: usedCredits,
        creditsRemaining: remainingCredits,
      };
    });

    return res.json({
      success: true,
      users: formattedUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: `Failed to fetch users: ${msg}` });
  }
});

/**
 * POST /api/admin/users/:id/subscription
 * Grants or changes a subscription plan for a target user (ADMIN_GRANT).
 */
adminRouter.post("/users/:id/subscription", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const { plan, durationDays = 30, notes } = req.body;

    const validPlans: SubscriptionPlan[] = ["PRO", "ADVANCED", "PREMIUM", "BUSINESS"];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        error: `Invalid plan. Must be one of: ${validPlans.join(", ")}`,
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { subscription: true, usage: true },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, error: "Target user not found" });
    }

    const previousPlan = targetUser.subscription?.status === "ACTIVE" ? targetUser.subscription.plan : "FREE";
    const now = new Date();
    const durationMs = parseInt(String(durationDays), 10) * 86400000;
    const expiresAt = new Date(now.getTime() + durationMs);

    // 1. Upsert Subscription record with ADMIN_GRANT source
    const updatedSub = await prisma.subscription.upsert({
      where: { userId: targetUserId },
      update: {
        plan,
        status: "ACTIVE",
        subscriptionSource: "ADMIN_GRANT",
        grantedByUserId: req.user!.id,
        grantedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: expiresAt,
        notes: notes || `Granted by admin ${req.user!.email}`,
      },
      create: {
        userId: targetUserId,
        provider: "ADMIN_GRANT",
        subscriptionSource: "ADMIN_GRANT",
        grantedByUserId: req.user!.id,
        grantedAt: now,
        plan,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: expiresAt,
        notes: notes || `Granted by admin ${req.user!.email}`,
      },
    });

    // 2. Grant workflow credit entitlement corresponding to the plan
    const planEntitlement = SAAS_PLANS_REGISTRY[plan as SubscriptionPlan];
    const newCreditLimit = planEntitlement ? planEntitlement.monthlyWorkflows : 50;

    await prisma.userUsage.upsert({
      where: { userId: targetUserId },
      update: {
        monthlyCreditsAllowance: newCreditLimit,
        monthlyCreditsUsed: 0,
        lastMonthlyReset: now,
        freeCreditsTotal: newCreditLimit,
        freeCreditsUsed: 0,
        updatedAt: now,
      },
      create: {
        userId: targetUserId,
        freeCreditsTotal: newCreditLimit,
        freeCreditsUsed: 0,
        permanentCreditsTotal: 10,
        permanentCreditsUsed: 0,
        monthlyCreditsAllowance: newCreditLimit,
        monthlyCreditsUsed: 0,
        lastMonthlyReset: now,
      },
    });

    // 3. Create Audit Log Entry
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.user!.id,
        targetUserId,
        action: previousPlan === "FREE" ? "GRANT_SUBSCRIPTION" : "CHANGE_SUBSCRIPTION",
        previousPlan,
        newPlan: plan,
        subscriptionSource: "ADMIN_GRANT",
        metadataJson: { durationDays, notes },
      },
    });

    return res.json({
      success: true,
      message: `Successfully granted ${plan} plan to ${targetUser.email} for ${durationDays} days.`,
      subscription: updatedSub,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: `Failed to grant subscription: ${msg}` });
  }
});

/**
 * DELETE /api/admin/users/:id/subscription
 * Revokes an admin-granted subscription. Preserves real Razorpay subscriptions.
 */
adminRouter.delete("/users/:id/subscription", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;

    const sub = await prisma.subscription.findUnique({
      where: { userId: targetUserId },
    });

    if (!sub) {
      return res.status(404).json({ success: false, error: "No active subscription found for user" });
    }

    if (sub.subscriptionSource !== "ADMIN_GRANT") {
      return res.status(400).json({
        success: false,
        error: "Cannot revoke a paid Razorpay subscription using admin grant revoke. Use billing cancellation instead.",
      });
    }

    const previousPlan = sub.plan;
    const now = new Date();

    // 1. Reset subscription to FREE / EXPIRED
    const updatedSub = await prisma.subscription.update({
      where: { userId: targetUserId },
      data: {
        plan: "FREE",
        status: "EXPIRED",
        subscriptionSource: "RAZORPAY",
        currentPeriodEnd: now,
      },
    });

    // 2. Reset user monthly credits to FREE default (3), preserving permanent credits
    await prisma.userUsage.upsert({
      where: { userId: targetUserId },
      update: {
        monthlyCreditsAllowance: 3,
        monthlyCreditsUsed: 0,
        freeCreditsTotal: 3,
        freeCreditsUsed: 0,
        lastMonthlyReset: now,
        updatedAt: now,
      },
      create: {
        userId: targetUserId,
        freeCreditsTotal: 10,
        freeCreditsUsed: 0,
        permanentCreditsTotal: 10,
        permanentCreditsUsed: 0,
        monthlyCreditsAllowance: 3,
        monthlyCreditsUsed: 0,
        lastMonthlyReset: now,
      },
    });

    // 3. Create Audit Log Entry
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.user!.id,
        targetUserId,
        action: "REVOKE_SUBSCRIPTION",
        previousPlan,
        newPlan: "FREE",
        subscriptionSource: "ADMIN_GRANT",
      },
    });

    return res.json({
      success: true,
      message: "Admin-granted subscription revoked successfully.",
      subscription: updatedSub,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: `Failed to revoke subscription: ${msg}` });
  }
});

/**
 * POST /api/admin/users/:id/credits
 * Manually adjusts credit allowance or resets used credits for a user.
 */
adminRouter.post("/users/:id/credits", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const { bonusCredits = 0, resetUsage = false, notes } = req.body;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { usage: true, subscription: true },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, error: "Target user not found" });
    }

    const now = new Date();
    const currentTotal = targetUser.usage?.freeCreditsTotal || 10;
    const currentUsed = targetUser.usage?.freeCreditsUsed || 0;

    const newTotal = currentTotal + Math.max(0, parseInt(String(bonusCredits), 10) || 0);
    const newUsed = resetUsage ? 0 : currentUsed;

    const updatedUsage = await prisma.userUsage.upsert({
      where: { userId: targetUserId },
      update: {
        freeCreditsTotal: newTotal,
        monthlyCreditsAllowance: newTotal,
        freeCreditsUsed: newUsed,
        monthlyCreditsUsed: newUsed,
        updatedAt: now,
      },
      create: {
        userId: targetUserId,
        freeCreditsTotal: newTotal,
        freeCreditsUsed: newUsed,
        permanentCreditsTotal: newTotal,
        permanentCreditsUsed: newUsed,
        monthlyCreditsAllowance: newTotal,
        monthlyCreditsUsed: newUsed,
        lastMonthlyReset: now,
      },
    });

    // Create Audit Log Entry
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.user!.id,
        targetUserId,
        action: resetUsage ? "RESET_CREDITS" : "ADD_CREDITS",
        previousPlan: targetUser.subscription?.plan || "FREE",
        newPlan: targetUser.subscription?.plan || "FREE",
        subscriptionSource: targetUser.subscription?.subscriptionSource || "RAZORPAY",
        metadataJson: { bonusCredits, resetUsage, previousTotal: currentTotal, newTotal, notes },
      },
    });

    return res.json({
      success: true,
      message: `Successfully updated credits for ${targetUser.email}. Total: ${newTotal}, Used: ${newUsed}`,
      usage: updatedUsage,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: `Failed to adjust credits: ${msg}` });
  }
});

/**
 * GET /api/admin/audit-logs
 * Paginated list of administrative audit log actions.
 */
adminRouter.get("/audit-logs", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20"), 10)));

    const [total, logs] = await Promise.all([
      prisma.adminAuditLog.count(),
      prisma.adminAuditLog.findMany({
        select: {
          id: true,
          adminUserId: true,
          targetUserId: true,
          action: true,
          previousPlan: true,
          newPlan: true,
          subscriptionSource: true,
          metadataJson: true,
          createdAt: true,
          adminUser: {
            select: { email: true, fullName: true },
          },
          targetUser: {
            select: { email: true, fullName: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const formattedLogs = logs.map((l: any) => ({
      id: l.id,
      adminUserId: l.adminUserId,
      adminEmail: l.adminUser?.email || l.adminUserId,
      targetUserId: l.targetUserId,
      targetEmail: l.targetUser?.email || l.targetUserId,
      action: l.action,
      previousPlan: l.previousPlan,
      newPlan: l.newPlan,
      subscriptionSource: l.subscriptionSource,
      metadata: l.metadataJson,
      createdAt: l.createdAt.toISOString(),
    }));

    return res.json({
      success: true,
      logs: formattedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: `Failed to fetch audit logs: ${msg}` });
  }
});
