const NotificationService = require('../services/notificationService');
const connectDB = require('../config/database');

/**
 * Background notification processor
 * This utility can be run as a cron job or background process
 * to automatically process queued notifications
 */

/**
 * Process notification queue with configurable options
 * @param {Object} options - Processing options
 * @param {number} options.batchSize - Number of notifications to process per batch
 * @param {number} options.intervalMs - Interval between processing batches in milliseconds
 * @param {boolean} options.continuous - Whether to run continuously
 * @param {string} options.priority - Priority filter for notifications
 */
async function processNotificationQueue(options = {}) {
  const {
    batchSize = 10,
    intervalMs = 5000, // 5 seconds
    continuous = false,
    priority = null
  } = options;

  try {
      if (options.shouldConnect !== false) {
         await connectDB();
      }
  } catch(e) { console.error("DB Connect error", e); }


  console.log('🔔 Starting notification processor...');
  console.log(`📊 Configuration: batchSize=${batchSize}, interval=${intervalMs}ms, continuous=${continuous}`);

  const processBatch = async () => {
    try {
      const result = await NotificationService.processNotificationQueue({
        limit: batchSize,
        priority
      });

      if (result.success) {
        if (result.data.processedCount > 0) {
          console.log(`✅ Processed ${result.data.processedCount} notifications`);
          
          // Log any failed deliveries
          const failedDeliveries = result.data.results.filter(r => !r.result.success);
          if (failedDeliveries.length > 0) {
            console.warn(`⚠️  ${failedDeliveries.length} notifications failed to deliver`);
            failedDeliveries.forEach(failed => {
              console.warn(`   - Notification ${failed.notificationId}: ${failed.result.message}`);
            });
          }
        } else {
          // Silent if empty to avoid log spam in continuous mode, or log sparsely
          // console.log('📭 No notifications to process');
        }
      } else {
        console.error('❌ Failed to process notification queue:', result.message);
      }
    } catch (error) {
      console.error('💥 Error processing notification queue:', error.message);
    }
  };

  // Process initial batch
  await processBatch();

  // If continuous mode, set up interval
  if (continuous) {
    console.log(`🔄 Running in continuous mode with ${intervalMs}ms interval`);
    const intervalId = setInterval(processBatch, intervalMs);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, shutting down notification processor...');
      clearInterval(intervalId);
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down notification processor...');
      clearInterval(intervalId);
      process.exit(0);
    });

    // Keep the process alive
    return new Promise(() => {}); // Never resolves, keeps running
  }

  console.log('✅ Notification processing completed');
}

/**
 * Get notification queue statistics
 */
async function getQueueStatistics() {
  try {
    await connectDB();
    const stats = await NotificationService.getQueueStatistics();
    return stats;
  } catch (error) {
    console.error('Error getting queue statistics:', error);
    return null;
  }
}

/**
 * Clean up old notifications
 * @param {Object} options - Cleanup options
 * @param {number} options.olderThanDays - Remove notifications older than this many days
 * @param {boolean} options.onlyDelivered - Only remove delivered notifications
 */
async function cleanupOldNotifications(options = {}) {
  try {
     await connectDB();
     const count = await NotificationService.cleanupOldNotifications(options);
     console.log(`🧹 Cleaned up ${count} old notifications`);
     return count;
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
    return 0;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'process': {
      const batchSize = parseInt(args[1]) || 10;
      const continuous = args.includes('--continuous');
      const priority = args.find(arg => arg.startsWith('--priority='))?.split('=')[1];
      
      processNotificationQueue({
        batchSize,
        continuous,
        priority,
        intervalMs: 5000,
        shouldConnect: true
      }).catch(console.error);
      break;
    }

    case 'stats': {
      getQueueStatistics().then(stats => {
        if (stats) {
          console.log('\n📊 Notification Queue Statistics:');
          console.log('Summary:', stats.summary);
          console.log('\nBreakdown:');
          console.table(stats.breakdown);
          process.exit(0);
        }
      }).catch(err => { console.error(err); process.exit(1); });
      break;
    }

    case 'cleanup': {
      const days = parseInt(args[1]) || 30;
      const onlyDelivered = !args.includes('--all');
      
      cleanupOldNotifications({ olderThanDays: days, onlyDelivered })
        .then(() => process.exit(0))
        .catch(err => { console.error(err); process.exit(1); });
      break;
    }

    default:
      console.log('Usage: node notificationProcessor.js <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  process [batchSize] [--continuous] [--priority=high|medium|low]');
      console.log('    Process notification queue');
      console.log('    --continuous: Run continuously with 5s interval');
      console.log('    --priority: Only process notifications with specific priority');
      console.log('');
      console.log('  stats');
      console.log('    Show notification queue statistics');
      console.log('');
      console.log('  cleanup [days] [--all]');
      console.log('    Clean up old notifications (default: 30 days, delivered only)');
      console.log('    --all: Clean up all notifications, not just delivered ones');
      console.log('');
      console.log('Examples:');
      console.log('  node notificationProcessor.js process 20 --continuous');
      console.log('  node notificationProcessor.js process --priority=high');
      console.log('  node notificationProcessor.js stats');
      console.log('  node notificationProcessor.js cleanup 7 --all');
  }
}

module.exports = {
  processNotificationQueue,
  getQueueStatistics,
  cleanupOldNotifications
};