import { env } from "@/common/utils/envConfig";
import { app, logger } from "@/server";
import { initializeScheduler, shutdownScheduler } from "@/api/backup/schedulerService";

const server = app.listen(env.PORT, async () => {
  // initialize the server
  const { NODE_ENV, HOST, PORT } = env;
  logger.info(`Server (${NODE_ENV}) running on port http://${HOST}:${PORT}`);
  
  // Initialize backup scheduler
  try {
    await initializeScheduler();
    logger.info("Backup scheduler initialized successfully");
  } catch (error) {
    logger.error(error, "Failed to initialize backup scheduler");
  }
});

const onCloseSignal = () => {
  logger.info("sigint received, shutting down");
  
  // Shutdown backup scheduler
  try {
    shutdownScheduler();
    logger.info("Backup scheduler shutdown complete");
  } catch (error) {
    logger.error(error, "Error shutting down backup scheduler");
  }
  
  server.close(() => {
    logger.info("server closed");
    process.exit();
  });
  setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
};

process.on("SIGINT", onCloseSignal);
process.on("SIGTERM", onCloseSignal);
