import { createServerFn } from "@tanstack/react-start";

import { connectDB } from "../db/connection";
import { Box } from "../db/models";

export const listBoxes = createServerFn({ method: "GET" }).handler(
  async () => {
    await connectDB();
    const boxes = await Box.find().sort({ order: 1 }).lean();
    return JSON.parse(JSON.stringify(boxes));
  },
);
