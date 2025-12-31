&lt;?php
// backend/public/setup_auto_cleanup.php
// Run this once to enable automatic message cleanup every 10 minutes
error_reporting(E_ALL);
ini_set('display_errors', 1);
echo "&lt;h2&gt;MySQL Auto-Cleanup Setup&lt;/h2&gt;";
try {
    require_once __DIR__ . '/../src/db.php';
    $pdo = getPDO();
    echo "&lt;p&gt;✓ Connected to database&lt;/p&gt;";
    // Step 1: Enable Event Scheduler
    echo "&lt;h3&gt;Step 1: Enabling Event Scheduler&lt;/h3&gt;";
    try {
        $pdo->exec("SET GLOBAL event_scheduler = ON");
        echo "&lt;p class='success'&gt;✓ Event scheduler enabled&lt;/p&gt;";
    } catch (Exception $e) {
        echo "&lt;p class='warning'&gt;⚠ Event scheduler may already be enabled or you need admin privileges&lt;/p&gt;";
        echo "&lt;p&gt;Error: " . htmlspecialchars($e->getMessage()) . "&lt;/p&gt;";
    }
    // Step 2: Drop existing event if it exists
    echo "&lt;h3&gt;Step 2: Removing Old Cleanup Event (if exists)&lt;/h3&gt;";
    try {
        $pdo->exec("DROP EVENT IF EXISTS cleanup_old_messages");
        echo "&lt;p&gt;✓ Removed old event (if existed)&lt;/p&gt;";
    } catch (Exception $e) {
        echo "&lt;p&gt;Note: " . htmlspecialchars($e->getMessage()) . "&lt;/p&gt;";
    }
    // Step 3: Create new cleanup event
    echo "&lt;h3&gt;Step 3: Creating Auto-Cleanup Event&lt;/h3&gt;";
    $sql = "
        CREATE EVENT cleanup_old_messages
        ON SCHEDULE EVERY 10 MINUTE
        DO
          DELETE FROM messages 
          WHERE created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)
          LIMIT 100
    ";
    try {
        $pdo->exec($sql);
        echo "&lt;p class='success'&gt;✓ Auto-cleanup event created successfully!&lt;/p&gt;";
        echo "&lt;div style='background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0;'&gt;";
        echo "&lt;h4 style='margin-top: 0; color: #2e7d32;'&gt;✓ Setup Complete!&lt;/h4&gt;";
        echo "&lt;p&gt;&lt;strong&gt;What happens now:&lt;/strong&gt;&lt;/p&gt;";
        echo "&lt;ul&gt;";
        echo "&lt;li&gt;Every 10 minutes, MySQL will automatically delete old messages&lt;/li&gt;";
        echo "&lt;li&gt;Messages older than 10 minutes will be removed&lt;/li&gt;";
        echo "&lt;li&gt;Maximum 100 messages deleted per run (to prevent performance issues)&lt;/li&gt;";
        echo "&lt;li&gt;This runs in the background - no manual intervention needed&lt;/li&gt;";
        echo "&lt;/ul&gt;";
        echo "&lt;/div&gt;";
    } catch (Exception $e) {
        echo "&lt;p class='error'&gt;❌ Failed to create event: " . htmlspecialchars($e->getMessage()) . "&lt;/p&gt;";
        echo "&lt;p&gt;You may need to enable event scheduler in your MySQL configuration.&lt;/p&gt;";
    }
    // Step 4: Verify event was created
    echo "&lt;h3&gt;Step 4: Verifying Event&lt;/h3&gt;";
    try {
        $stmt = $pdo->query("SHOW EVENTS WHERE Name = 'cleanup_old_messages'");
        $event = $stmt->fetch(PDO::FETCH_ASSOC);   
        if ($event) {
            echo "&lt;p class='success'&gt;✓ Event is active and scheduled&lt;/p&gt;";
            echo "&lt;table style='border-collapse: collapse; width: 100%; margin: 10px 0;'&gt;";
            echo "&lt;tr&gt;&lt;th style='border: 1px solid #ddd; padding: 8px; background: #f5f5f5;'&gt;Property&lt;/th&gt;&lt;th style='border: 1px solid #ddd; padding: 8px; background: #f5f5f5;'&gt;Value&lt;/th&gt;&lt;/tr&gt;";
            echo "&lt;tr&gt;&lt;td style='border: 1px solid #ddd; padding: 8px;'&gt;Event Name&lt;/td&gt;&lt;td style='border: 1px solid #ddd; padding: 8px;'&gt;" . htmlspecialchars($event['Name']) . "&lt;/td&gt;&lt;/tr&gt;";
            echo "&lt;tr&gt;&lt;td style='border: 1px solid #ddd; padding: 8px;'&gt;Schedule&lt;/td&gt;&lt;td style='border: 1px solid #ddd; padding: 8px;'&gt;" . htmlspecialchars($event['Execute at']) . "&lt;/td&gt;&lt;/tr&gt;";
            echo "&lt;tr&gt;&lt;td style='border: 1px solid #ddd; padding: 8px;'&gt;Interval&lt;/td&gt;&lt;td style='border: 1px solid #ddd; padding: 8px;'&gt;" . htmlspecialchars($event['Interval value'] . ' ' . $event['Interval field']) . "&lt;/td&gt;&lt;/tr&gt;";
            echo "&lt;tr&gt;&lt;td style='border: 1px solid #ddd; padding: 8px;'&gt;Status&lt;/td&gt;&lt;td style='border: 1px solid #ddd; padding: 8px;'&gt;" . htmlspecialchars($event['Status']) . "&lt;/td&gt;&lt;/tr&gt;";
            echo "&lt;/table&gt;";
        } else {
            echo "&lt;p class='warning'&gt;⚠ Event not found in SHOW EVENTS&lt;/p&gt;";
        }
    } catch (Exception $e) {
        echo "&lt;p&gt;Could not verify event: " . htmlspecialchars($e->getMessage()) . "&lt;/p&gt;";
    }
    // Step 5: Check current message count
    echo "&lt;h3&gt;Step 5: Current Database Status&lt;/h3&gt;";
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM messages");
        $count = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
        echo "&lt;p&gt;Total messages in database: &lt;strong&gt;$count&lt;/strong&gt;&lt;/p&gt;";   
        $stmt = $pdo->query("SELECT COUNT(*) as old FROM messages WHERE created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)");
        $oldCount = $stmt->fetch(PDO::FETCH_ASSOC)['old'];
        echo "&lt;p&gt;Messages older than 10 minutes: &lt;strong&gt;$oldCount&lt;/strong&gt;&lt;/p&gt;";
        if ($oldCount > 0) {
            echo "&lt;p style='color: #ff9800;'&gt;⚠ These old messages will be cleaned up in the next scheduled run&lt;/p&gt;";
        }
    } catch (Exception $e) {
        echo "&lt;p&gt;Could not check message count: " . htmlspecialchars($e->getMessage()) . "&lt;/p&gt;";
    }
    // Manual cleanup option
    echo "&lt;h3&gt;Manual Cleanup&lt;/h3&gt;";
    echo "&lt;p&gt;Want to clean up old messages right now?&lt;/p&gt;";
    echo "&lt;form method='post' style='margin: 10px 0;'&gt;";
    echo "&lt;button type='submit' name='cleanup_now' style='background: #7b3fe4; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;'&gt;Clean Up Now&lt;/button&gt;";
    echo "&lt;/form&gt;";
    if (isset($_POST['cleanup_now'])) {
        echo "&lt;div style='background: #fff3e0; padding: 15px; border-radius: 8px; margin: 10px 0;'&gt;";
        $stmt = $pdo->prepare("DELETE FROM messages WHERE created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE) LIMIT 100");
        $stmt->execute();
        $deleted = $stmt->rowCount();
        echo "&lt;p&gt;✓ Manually cleaned up &lt;strong&gt;$deleted&lt;/strong&gt; old messages&lt;/p&gt;";
        echo "&lt;/div&gt;";
    }
} catch (Exception $e) {
    echo "&lt;p class='error'&gt;❌ Error: " . htmlspecialchars($e->getMessage()) . "&lt;/p&gt;";
}
echo "&lt;style&gt;
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 20px auto; padding: 20px; background: #f5f5f5; }
    .success { color: #2e7d32; }
    .error { color: #c62828; }
    .warning { color: #f57c00; }
    h2 { color: #333; }
    h3 { color: #555; margin-top: 25px; }
&lt;/style&gt;";
echo "&lt;hr style='margin: 30px 0;'&gt;";
echo "&lt;h3&gt;Troubleshooting&lt;/h3&gt;";
echo "&lt;p&gt;If the event scheduler didn't enable, you may need to:&lt;/p&gt;";
echo "&lt;ol&gt;";
echo "&lt;li&gt;Open phpMyAdmin&lt;/li&gt;";
echo "&lt;li&gt;Go to SQL tab&lt;/li&gt;";
echo "&lt;li&gt;Run: &lt;code&gt;SET GLOBAL event_scheduler = ON;&lt;/code&gt;&lt;/li&gt;";
echo "&lt;li&gt;Refresh this page&lt;/li&gt;";
echo "&lt;/ol&gt;";
echo "&lt;p&gt;&lt;a href='index.html' style='color: #7b3fe4;'&gt;← Back to Chat&lt;/a&gt;&lt;/p&gt;";
?&gt;