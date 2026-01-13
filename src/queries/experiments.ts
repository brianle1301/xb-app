import { queryOptions } from "@tanstack/react-query";

import { getExperiment } from "@/server/rpc/experiments";

export const experimentDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["experiments", "detail", id],
    queryFn: () => getExperiment({ data: id }),
  });
