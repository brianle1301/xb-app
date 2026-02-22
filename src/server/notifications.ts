import admin from "firebase-admin";
import { createServerOnlyFn } from "@tanstack/react-start";

import { getDevices, getSubscriptions } from "@/server/db/client";

function getFirebaseApp() {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT || "{}",
  );
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const sendDailyReminders = createServerOnlyFn(async () => {
  const firebase = admin.messaging(getFirebaseApp());
  const subscriptions = await getSubscriptions();
  const devices = await getDevices();

  // Find all users with active subscriptions
  const activeSubscriptions = await subscriptions
    .find({ status: "started" })
    .toArray();

  const userIds = [...new Set(activeSubscriptions.map((s) => s.userId))];
  if (userIds.length === 0) return { sent: 0 };

  // Get all device tokens for these users in one query
  const userDevices = await devices
    .find({ userId: { $in: userIds } })
    .toArray();

  if (userDevices.length === 0) return { sent: 0 };

  const messages = userDevices.map((device) => ({
    token: device.token,
    notification: {
      title: "Daily Reminder",
      body: "You have tasks waiting for you today!",
    },
  }));

  const response = await firebase.sendEach(messages);

  // Clean up invalid tokens
  const tokensToRemove: string[] = [];
  response.responses.forEach((res, index) => {
    if (
      res.error &&
      (res.error.code === "messaging/invalid-registration-token" ||
        res.error.code === "messaging/registration-token-not-registered")
    ) {
      tokensToRemove.push(userDevices[index].token);
    }
  });

  if (tokensToRemove.length > 0) {
    await devices.deleteMany({ token: { $in: tokensToRemove } });
  }

  return { sent: response.successCount };
});
