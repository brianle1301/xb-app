import { queryOptions } from "@tanstack/react-query";

import { getBox, listPublishedBoxes } from "@/server/rpc/boxes";

export const publishedBoxesQuery = () =>
  queryOptions({
    queryKey: ["boxes", "list", "published"],
    queryFn: () => listPublishedBoxes(),
  });

export const boxDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["boxes", "detail", id],
    queryFn: () => getBox({ data: id }),
  });
