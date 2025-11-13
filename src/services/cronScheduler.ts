import cron from 'node-cron';
import MembershipService from './membershipService';

export class CronScheduler {
  /**
   * Initialize all cron jobs
   */
  static initializeJobs() {
    console.log('[CronScheduler] Initializing cron jobs...');

    // Run membership expiry check every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('[CronScheduler] Running daily membership expiry check at 9:00 AM');
      try {
        await MembershipService.expireMemberships();
        console.log('[CronScheduler] Membership expiry check completed');
      } catch (error) {
        console.error('[CronScheduler] Error in expiry check:', error);
      }
    });

    // Send 7-day reminder every day at 10:00 AM
    cron.schedule('0 10 * * *', async () => {
      console.log('[CronScheduler] Sending 7-day expiry reminders at 10:00 AM');
      try {
        await MembershipService.sendExpiryReminders(7);
        console.log('[CronScheduler] 7-day reminders sent');
      } catch (error) {
        console.error('[CronScheduler] Error sending 7-day reminders:', error);
      }
    });

    // Send 3-day reminder every day at 11:00 AM
    cron.schedule('0 11 * * *', async () => {
      console.log('[CronScheduler] Sending 3-day expiry reminders at 11:00 AM');
      try {
        await MembershipService.sendExpiryReminders(3);
        console.log('[CronScheduler] 3-day reminders sent');
      } catch (error) {
        console.error('[CronScheduler] Error sending 3-day reminders:', error);
      }
    });

    // Send 1-day reminder every day at 12:00 PM (noon)
    cron.schedule('0 12 * * *', async () => {
      console.log('[CronScheduler] Sending 1-day expiry reminders at 12:00 PM');
      try {
        await MembershipService.sendExpiryReminders(1);
        console.log('[CronScheduler] 1-day reminders sent');
      } catch (error) {
        console.error('[CronScheduler] Error sending 1-day reminders:', error);
      }
    });

    // Handle grace period expiry every day at 8:00 AM
    cron.schedule('0 8 * * *', async () => {
      console.log('[CronScheduler] Running grace period check at 8:00 AM');
      try {
        await MembershipService.handleGracePeriodExpiry();
        console.log('[CronScheduler] Grace period check completed');
      } catch (error) {
        console.error('[CronScheduler] Error in grace period check:', error);
      }
    });

    console.log('[CronScheduler] All cron jobs initialized successfully');
    console.log('[CronScheduler] Schedule:');
    console.log('  - 08:00 AM: Grace period expiry check');
    console.log('  - 09:00 AM: Membership expiry check');
    console.log('  - 10:00 AM: 7-day expiry reminders');
    console.log('  - 11:00 AM: 3-day expiry reminders');
    console.log('  - 12:00 PM: 1-day expiry reminders');
  }

  /**
   * Run all checks manually (for testing purposes)
   */
  static async runAllChecksNow() {
    console.log('[CronScheduler] Running all checks manually...');

    try {
      console.log('[CronScheduler] 1. Checking grace period expiry...');
      await MembershipService.handleGracePeriodExpiry();

      console.log('[CronScheduler] 2. Checking membership expiry...');
      await MembershipService.expireMemberships();

      console.log('[CronScheduler] 3. Sending 7-day reminders...');
      await MembershipService.sendExpiryReminders(7);

      console.log('[CronScheduler] 4. Sending 3-day reminders...');
      await MembershipService.sendExpiryReminders(3);

      console.log('[CronScheduler] 5. Sending 1-day reminders...');
      await MembershipService.sendExpiryReminders(1);

      console.log('[CronScheduler] All checks completed successfully');
      return { success: true };
    } catch (error) {
      console.error('[CronScheduler] Error running manual checks:', error);
      throw error;
    }
  }
}

export default CronScheduler;
