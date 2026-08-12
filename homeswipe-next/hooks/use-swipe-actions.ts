"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { listingsApi } from "@/lib/listings-api";
import { getGetListingsQueryKey, getGetSavedListingsQueryKey } from "@/hooks/use-listings";
import { useToast } from "@/hooks/use-toast";

export function useSwipeActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const swipeMutation = useMutation({
    mutationFn: ({ id, direction }: { id: number; direction: "left" | "right" }) =>
      listingsApi.swipe(id, direction),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: getGetListingsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetSavedListingsQueryKey() });

      if (variables.direction === "right") {
        toast({
          title: "Saved to favorites!",
          description: "You can view this property in your saved list.",
          duration: 2000,
        });
      }
    },
    onError: () => {
      toast({
        title: "Action failed",
        description: "There was a problem recording your swipe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSwipe = async (id: number, direction: "left" | "right") => {
    return swipeMutation.mutateAsync({ id, direction });
  };

  return {
    handleSwipe,
    isPending: swipeMutation.isPending,
  };
}
