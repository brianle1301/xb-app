import { queryOptions } from "@tanstack/react-query";

import { getDocumentBySlug } from "@/server/rpc/documents";

export const documentBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["documents", "slug", slug],
    queryFn: () => getDocumentBySlug({ data: slug }),
  });
