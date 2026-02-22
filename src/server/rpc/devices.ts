import { createServerFn } from "@tanstack/react-start";

import { getDevices } from "@/server/db/client";
import { authMiddleware } from "@/server/rpc/auth";

export const registerDevice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { token: string; platform: "ios" | "android" }) => data)
  .handler(async ({ data, context }) => {
    const devices = await getDevices();
    const now = new Date();

    await devices.updateOne(
      { token: data.token },
      {
        $set: {
          userId: context.user.id,
          platform: data.platform,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );
  });

export const unregisterDevice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data, context }) => {
    const devices = await getDevices();
    await devices.deleteOne({ token: data.token, userId: context.user.id });
  });
