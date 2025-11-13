import User from '../models/User';
import MembershipPackage from '../models/MembershipPackage';
import Notification from '../models/Notification';
import {
  sendMembershipExpiryReminder,
  sendMembershipExpiredEmail,
  sendGracePeriodReminderEmail,
} from '../utils/emailService';

export class MembershipService {
  /**
   * Check and send expiry reminders for memberships expiring in N days
   */
  static async sendExpiryReminders(daysUntilExpiry: number) {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysUntilExpiry);

      // Set to start of day
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      // Find users with memberships expiring on target date
      const users = await User.find({
        membershipStatus: 'active',
        membershipEndDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        'notificationPreferences.email': true,
        'notificationPreferences.reminderDays': daysUntilExpiry,
      }).populate('membershipPackage');

      console.log(`[MembershipService] Found ${users.length} users with memberships expiring in ${daysUntilExpiry} days`);

      for (const user of users) {
        try {
          const packageInfo = user.membershipPackage as any;
          const packageName = packageInfo?.name || user.membershipPlan || 'Your';

          // Send email reminder
          if (user.notificationPreferences.email) {
            await sendMembershipExpiryReminder(
              user.email,
              user.name,
              packageName,
              user.membershipEndDate!,
              daysUntilExpiry
            );
          }

          // Create in-app notification
          if (user.notificationPreferences.inApp) {
            await Notification.createMembershipExpiryNotification(
              user._id as any,
              `Membership Expiring Soon`,
              `Your ${packageName} membership expires in ${daysUntilExpiry} ${daysUntilExpiry === 1 ? 'day' : 'days'}. Renew now to continue without interruption.`,
              user.membershipEndDate!,
              packageName,
              daysUntilExpiry <= 3 ? 'high' : 'medium'
            );
          }

          console.log(`[MembershipService] Sent ${daysUntilExpiry}-day reminder to ${user.email}`);
        } catch (error) {
          console.error(`[MembershipService] Error sending reminder to ${user.email}:`, error);
        }
      }

      return { success: true, count: users.length };
    } catch (error) {
      console.error('[MembershipService] Error in sendExpiryReminders:', error);
      throw error;
    }
  }

  /**
   * Check and expire memberships that have passed their end date
   */
  static async expireMemberships() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find users with memberships that expired today or earlier
      const users = await User.find({
        membershipStatus: 'active',
        membershipEndDate: {
          $lt: today,
        },
      }).populate('membershipPackage');

      console.log(`[MembershipService] Found ${users.length} expired memberships to process`);

      for (const user of users) {
        try {
          const packageInfo = user.membershipPackage as any;
          const packageName = packageInfo?.name || user.membershipPlan || 'Your';

          // Update user status to grace_period
          user.membershipStatus = 'grace_period';
          await user.save();

          // Send expiry email
          if (user.notificationPreferences.email) {
            await sendMembershipExpiredEmail(
              user.email,
              user.name,
              packageName,
              user.membershipEndDate!
            );
          }

          // Create in-app notification
          if (user.notificationPreferences.inApp) {
            await Notification.create({
              user: user._id,
              title: 'Membership Expired',
              message: `Your ${packageName} membership has expired. You have a 5-day grace period to renew.`,
              type: 'membership_expiry',
              priority: 'high',
              metadata: {
                packageName,
                membershipEndDate: user.membershipEndDate,
                gracePeriodEndDate: user.gracePeriodEndDate,
                actionUrl: '/dashboard/renew',
              },
            });
          }

          console.log(`[MembershipService] Expired membership for ${user.email}`);
        } catch (error) {
          console.error(`[MembershipService] Error expiring membership for ${user.email}:`, error);
        }
      }

      return { success: true, count: users.length };
    } catch (error) {
      console.error('[MembershipService] Error in expireMemberships:', error);
      throw error;
    }
  }

  /**
   * Check and handle grace period expiry
   */
  static async handleGracePeriodExpiry() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find users in grace period that are about to expire (1 day remaining)
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const usersExpiringSoon = await User.find({
        membershipStatus: 'grace_period',
        gracePeriodEndDate: {
          $gte: today,
          $lt: tomorrow,
        },
      }).populate('membershipPackage');

      console.log(`[MembershipService] Found ${usersExpiringSoon.length} users with grace period ending tomorrow`);

      for (const user of usersExpiringSoon) {
        try {
          const packageInfo = user.membershipPackage as any;
          const packageName = packageInfo?.name || user.membershipPlan || 'Your';

          // Send final reminder
          if (user.notificationPreferences.email) {
            await sendGracePeriodReminderEmail(
              user.email,
              user.name,
              packageName,
              user.gracePeriodEndDate!
            );
          }

          // Create in-app notification
          if (user.notificationPreferences.inApp) {
            await Notification.create({
              user: user._id,
              title: 'Final Reminder: Grace Period Ending',
              message: `Your grace period ends tomorrow. Renew now to avoid account suspension.`,
              type: 'membership_expiry',
              priority: 'high',
              metadata: {
                packageName,
                gracePeriodEndDate: user.gracePeriodEndDate,
                actionUrl: '/dashboard/renew',
              },
            });
          }

          console.log(`[MembershipService] Sent grace period reminder to ${user.email}`);
        } catch (error) {
          console.error(`[MembershipService] Error sending grace period reminder to ${user.email}:`, error);
        }
      }

      // Find users whose grace period has ended
      const usersToSuspend = await User.find({
        membershipStatus: 'grace_period',
        gracePeriodEndDate: {
          $lt: today,
        },
      }).populate('membershipPackage');

      console.log(`[MembershipService] Found ${usersToSuspend.length} users to suspend`);

      for (const user of usersToSuspend) {
        try {
          const packageInfo = user.membershipPackage as any;

          // Update status to expired
          user.membershipStatus = 'expired';
          await user.save();

          // Decrement package member count
          if (packageInfo) {
            packageInfo.currentMembers = Math.max(0, packageInfo.currentMembers - 1);
            await packageInfo.save();
          }

          // Create in-app notification
          if (user.notificationPreferences.inApp) {
            await Notification.create({
              user: user._id,
              title: 'Account Suspended',
              message: `Your grace period has ended and your account has been suspended. Renew your membership to regain access.`,
              type: 'membership_expiry',
              priority: 'high',
              metadata: {
                actionUrl: '/dashboard/renew',
              },
            });
          }

          console.log(`[MembershipService] Suspended account for ${user.email}`);
        } catch (error) {
          console.error(`[MembershipService] Error suspending account for ${user.email}:`, error);
        }
      }

      return {
        success: true,
        remindersCount: usersExpiringSoon.length,
        suspendedCount: usersToSuspend.length,
      };
    } catch (error) {
      console.error('[MembershipService] Error in handleGracePeriodExpiry:', error);
      throw error;
    }
  }

  /**
   * Get membership statistics
   */
  static async getMembershipStats() {
    try {
      const totalMembers = await User.countDocuments({
        membershipStatus: { $ne: 'inactive' },
      });

      const activeMembers = await User.countDocuments({
        membershipStatus: 'active',
      });

      const gracePeriodMembers = await User.countDocuments({
        membershipStatus: 'grace_period',
      });

      const expiredMembers = await User.countDocuments({
        membershipStatus: 'expired',
      });

      // Get users expiring in next 7 days
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const expiringSoon = await User.countDocuments({
        membershipStatus: 'active',
        membershipEndDate: {
          $lte: sevenDaysFromNow,
          $gte: new Date(),
        },
      });

      return {
        totalMembers,
        activeMembers,
        gracePeriodMembers,
        expiredMembers,
        expiringSoon,
      };
    } catch (error) {
      console.error('[MembershipService] Error in getMembershipStats:', error);
      throw error;
    }
  }

  /**
   * Get users with expiring memberships (for admin dashboard)
   */
  static async getExpiringMemberships(days: number = 7) {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);

      const users = await User.find({
        membershipStatus: 'active',
        membershipEndDate: {
          $lte: targetDate,
          $gte: new Date(),
        },
      })
        .populate('membershipPackage', 'name price')
        .select('name email membershipEndDate membershipStatus membershipPlan')
        .sort({ membershipEndDate: 1 });

      return users;
    } catch (error) {
      console.error('[MembershipService] Error in getExpiringMemberships:', error);
      throw error;
    }
  }
}

export default MembershipService;
