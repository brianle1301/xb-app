import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  getDocumentBySlugAdmin,
  listAllDocuments,
  publishDocument,
  unpublishDocument,
  updateDocument,
} from "@/server/rpc/documents";
import type { LocalizedText } from "@/types/shared";

export const allDocumentsQuery = () =>
  queryOptions({
    queryKey: ["documents", "list"],
    queryFn: () => listAllDocuments(),
  });

export const documentBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["documents", "slug", slug],
    queryFn: () => getDocumentBySlugAdmin({ data: slug }),
  });

export const useUpdateDocumentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      slug: string;
      title: LocalizedText;
      content: LocalizedText;
    }) => updateDocument({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["documents", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["documents", "slug", variables.slug],
      });
    },
  });
};

export const usePublishDocumentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => publishDocument({ data: slug }),
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: ["documents", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["documents", "slug", slug],
      });
    },
  });
};

export const useUnpublishDocumentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => unpublishDocument({ data: slug }),
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: ["documents", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["documents", "slug", slug],
      });
    },
  });
};
