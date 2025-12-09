import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import { getDB } from "./server/db/client";

// Start connecting at server startup
getDB();

export default createServerEntry({
  async fetch(request) {
    await getDB();
    return handler.fetch(request);
  },
});
