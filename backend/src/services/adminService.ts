import { prisma } from '@/lib/database';
import { Listing, Report, User } from '@/types';
import { notificationService } from './notificationService';

export interface ModerationStats {
  pendingListings: number;
  pendingReports: number;
  totalUsers: number;
  verifiedUsers: number;
  totalListings: number;
  activeListings: number;
}

export interface ListingModerationAction {
  listingId: string;
  action: 'APPROVE' | 'REJECT';
  reason?: string;
  adminNotes?: string;
}

export interface UserVerificationAction {
  userId: string;
  kycStatus: 'VERIFIED' | 'REJECTED';
  reason?: string;
  trustBadge?: boolean;
}

export interface ReportAction {
  reportId: string;
  action: 'RESOLVE' | 'DISMISS';
  adminNotes?: string;
}

class AdminService {
  /**
   * Get moderation dashboard statistics
   */
  async getModerationStats(): Promise<ModerationStats> {
    const [
      pendingListings,
      pendingReports,
      totalUsers,
      verifiedUsers,
      totalListings,
      activeListings
    ] = await Promise.all([
      prisma.listing.count({ where: { status: 'PENDING' } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.user.count(),
      prisma.user.count({ where: { kycStatus: 'VERIFIED' } }),
      prisma.listing.count(),
      prisma.listing.count({ where: { status: 'LIVE', isActive: true } })
    ]);

    return {
      pendingListings,
      pendingReports,
      totalUsers,
      verifiedUsers,
      totalListings,
      activeListings
    };
  }

  /**
   * Get pending listings for moderation
   */
  async getPendingListings(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where: { status: 'PENDING' },
        include: {
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              kycStatus: true,
              trustScore: true
            }
          },
          category: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit
      }),
      prisma.listing.count({ where: { status: 'PENDING' } })
    ]);

    return {
      listings,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Moderate a listing (approve or reject)
   */
  async moderateListing(action: ListingModerationAction, adminId: string) {
    const { listingId, action: moderationAction, reason, adminNotes } = action;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { seller: true }
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.status !== 'PENDING') {
      throw new Error('Listing is not pending moderation');
    }

    const newStatus = moderationAction === 'APPROVE' ? 'LIVE' : 'REJECTED';
    
    // Update listing status
    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: newStatus,
        updatedAt: new Date()
      }
    });

    // Create moderation log
    await prisma.moderationLog.create({
      data: {
        adminId,
        listingId,
        action: moderationAction,
        reason: reason || null,
        adminNotes: adminNotes || null
      }
    });

    // Send notification to seller
    const notificationType = moderationAction === 'APPROVE' ? 'LISTING_APPROVED' : 'LISTING_REJECTED';
    const notificationTitle = moderationAction === 'APPROVE' 
      ? 'Listing Approved' 
      : 'Listing Rejected';
    const notificationMessage = moderationAction === 'APPROVE'
      ? `Your listing "${listing.title}" has been approved and is now live.`
      : `Your listing "${listing.title}" has been rejected. ${reason ? `Reason: ${reason}` : ''}`;

    await notificationService.createNotification({
      userId: listing.sellerId,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      data: {
        listingId: listing.id,
        reason: reason || null
      }
    });

    return updatedListing;
  }

  /**
   * Get flagged content and reports
   */
  async getFlaggedContent(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { status: 'PENDING' },
        include: {
          reporter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          listing: {
            select: {
              id: true,
              title: true,
              status: true,
              seller: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit
      }),
      prisma.report.count({ where: { status: 'PENDING' } })
    ]);

    return {
      reports,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Handle report action (resolve or dismiss)
   */
  async handleReport(action: ReportAction, adminId: string) {
    const { reportId, action: reportAction, adminNotes } = action;

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { listing: true, reporter: true }
    });

    if (!report) {
      throw new Error('Report not found');
    }

    if (report.status !== 'PENDING') {
      throw new Error('Report is not pending review');
    }

    const newStatus = reportAction === 'RESOLVE' ? 'RESOLVED' : 'DISMISSED';

    // Update report status
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        updatedAt: new Date()
      }
    });

    // If resolving and it's a listing report, take action on the listing
    if (reportAction === 'RESOLVE' && report.listing) {
      await prisma.listing.update({
        where: { id: report.listingId! },
        data: {
          status: 'REJECTED',
          isActive: false
        }
      });

      // Notify listing owner
      await notificationService.createNotification({
        userId: report.listing.sellerId,
        type: 'LISTING_REJECTED',
        title: 'Listing Removed',
        message: `Your listing "${report.listing.title}" has been removed due to a report. Reason: ${report.reason}`,
        data: {
          listingId: report.listing.id,
          reportReason: report.reason
        }
      });
    }

    // Log moderation action
    await prisma.moderationLog.create({
      data: {
        adminId,
        reportId,
        action: reportAction,
        adminNotes: adminNotes || null
      }
    });

    return updatedReport;
  }

  /**
   * Get users pending verification
   */
  async getUsersForVerification(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { 
          kycStatus: 'PENDING',
          isActive: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          company: true,
          kycStatus: true,
          phoneVerified: true,
          emailVerified: true,
          trustScore: true,
          createdAt: true,
          city: true,
          state: true
        },
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit
      }),
      prisma.user.count({ 
        where: { 
          kycStatus: 'PENDING',
          isActive: true
        }
      })
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update user verification status
   */
  async updateUserVerification(action: UserVerificationAction, adminId: string) {
    const { userId, kycStatus, reason, trustBadge } = action;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Update user KYC status and trust score
    const trustScoreUpdate = kycStatus === 'VERIFIED' 
      ? (trustBadge ? 85 : 70) 
      : Math.max(user.trustScore - 20, 0);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus,
        trustScore: trustScoreUpdate,
        updatedAt: new Date()
      }
    });

    // Log verification action
    await prisma.moderationLog.create({
      data: {
        adminId,
        userId,
        action: kycStatus,
        reason: reason || null,
        adminNotes: trustBadge ? 'Trust badge awarded' : null
      }
    });

    // Send notification to user
    const notificationTitle = kycStatus === 'VERIFIED' 
      ? 'Account Verified' 
      : 'Verification Rejected';
    const notificationMessage = kycStatus === 'VERIFIED'
      ? `Your account has been verified! ${trustBadge ? 'You have been awarded a trust badge.' : ''}`
      : `Your verification request has been rejected. ${reason ? `Reason: ${reason}` : ''}`;

    await notificationService.createNotification({
      userId: user.id,
      type: 'SYSTEM',
      title: notificationTitle,
      message: notificationMessage,
      data: {
        kycStatus,
        trustBadge: trustBadge || false,
        reason: reason || null
      }
    });

    return updatedUser;
  }

  /**
   * Get moderation activity logs
   */
  async getModerationLogs(page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.moderationLog.findMany({
        include: {
          admin: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          listing: {
            select: {
              id: true,
              title: true,
              status: true
            }
          },
          report: {
            select: {
              id: true,
              reason: true,
              status: true
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              kycStatus: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.moderationLog.count()
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Bulk approve listings
   */
  async bulkApproveListing(listingIds: string[], adminId: string) {
    const results = [];

    for (const listingId of listingIds) {
      try {
        const result = await this.moderateListing({
          listingId,
          action: 'APPROVE',
          reason: 'Bulk approval'
        }, adminId);
        results.push({ listingId, success: true, result });
      } catch (error) {
        results.push({ 
          listingId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return results;
  }

  /**
   * Get content validation results for automated checks
   */
  async getAutomatedContentChecks(listingId: string) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { seller: true }
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    // Import content validation service
    const { contentValidationService } = await import('./contentValidationService');

    // Validate title and description
    const titleValidation = contentValidationService.validateTitle(listing.title);
    const descriptionValidation = contentValidationService.validateText(listing.description);
    const priceValidation = contentValidationService.validatePrice(Number(listing.price));
    
    // Check for duplicates
    const duplicateCheck = await contentValidationService.checkForDuplicates(
      listing.title,
      listing.description,
      listing.sellerId
    );

    // Calculate overall score
    const checks = [titleValidation, descriptionValidation, priceValidation, duplicateCheck];
    const passedChecks = checks.filter(check => check.isValid).length;
    const overallScore = passedChecks / checks.length;

    // Determine recommendation
    let recommendation: 'APPROVE' | 'REVIEW' | 'REJECT' = 'APPROVE';
    const hasHighSeverityIssues = checks.some(check => check.severity === 'high');
    const hasMediumSeverityIssues = checks.some(check => check.severity === 'medium');

    if (hasHighSeverityIssues) {
      recommendation = 'REJECT';
    } else if (hasMediumSeverityIssues || overallScore < 0.7) {
      recommendation = 'REVIEW';
    }

    return {
      listingId,
      checks: {
        titleValidation: {
          passed: titleValidation.isValid,
          issues: titleValidation.issues,
          severity: titleValidation.severity
        },
        descriptionValidation: {
          passed: descriptionValidation.isValid,
          issues: descriptionValidation.issues,
          severity: descriptionValidation.severity
        },
        priceValidation: {
          passed: priceValidation.isValid,
          issues: priceValidation.issues,
          severity: priceValidation.severity
        },
        duplicateCheck: {
          passed: duplicateCheck.isValid,
          issues: duplicateCheck.issues,
          severity: duplicateCheck.severity
        }
      },
      overallScore,
      recommendation,
      listing: {
        title: listing.title,
        description: listing.description,
        price: listing.price,
        seller: {
          name: `${listing.seller.firstName} ${listing.seller.lastName}`,
          trustScore: listing.seller.trustScore,
          kycStatus: listing.seller.kycStatus
        }
      }
    };
  }
}

export const adminService = new AdminService();