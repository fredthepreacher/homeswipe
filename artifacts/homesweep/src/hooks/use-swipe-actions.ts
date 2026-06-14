import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSwipeListing, getGetListingsQueryKey, getGetSavedListingsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function useSwipeActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const swipeMutation = useSwipeListing({
    mutation: {
      onSuccess: (data, variables) => {
        // Invalidate both lists so they refresh in the background
        queryClient.invalidateQueries({ queryKey: getGetListingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSavedListingsQueryKey() });
        
        if (variables.data.direction === "right") {
          toast({
            title: "Saved to favorites!",
            description: "You can view this property in your saved list.",
            duration: 2000,
          });
        }
      },
      onError: (error) => {
        toast({
          title: "Action failed",
          description: "There was a problem recording your swipe. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const handleSwipe = async (id: number, direction: "left" | "right") => {
    return swipeMutation.mutateAsync({
      id,
      data: { direction }
    });
  };

  return {
    handleSwipe,
    isPending: swipeMutation.isPending
  };
}
