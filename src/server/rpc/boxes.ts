import { createServerFn } from "@tanstack/react-start";

import { Box } from "../db/models";
import { serialize } from "../db/serialize";

export const listBoxes = createServerFn({ method: "GET" }).handler(async () => {
  const boxes = await Box.find().sort({ order: 1 }).lean();
  return serialize(boxes);
});
