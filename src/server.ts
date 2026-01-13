import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import { getClient } from "./server/db/client";

// Start connecting at server startup
getClient();

export default createServerEntry({
  async fetch(request) {
    await getClient();
    return handler.fetch(request);
  },
});
