import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";

import { QUERY_KEYS } from "@/lib/react-query/queryKeys";
import {
  createUserAccount,
  signInAccount,
  getCurrentUser,
  signOutAccount,
  getUsers,
  createPost,
  getPostById,
  updatePost,
  getUserPosts,
  deletePost,
  getUserById,
  updateUser,
  getRecentPosts,
  getInfinitePosts,
  searchPosts,
  savePost,
  deleteSavedPost,
  getUserSaves,
  likePost,
  unlikePost,
  getPostLikes,
  getUserLikes,
  getPostsByIds,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from "@/lib/appwrite/api";
import { INewPost, INewUser, IUpdatePost, IUpdateUser } from "@/types";

// ============================================================
// AUTH QUERIES
// ============================================================

export const useCreateUserAccount = () => {
  return useMutation({
    mutationFn: (user: INewUser) => createUserAccount(user),
  });
};

export const useSignInAccount = () => {
  return useMutation({
    mutationFn: (user: { email: string; password: string }) =>
      signInAccount(user),
  });
};

export const useSignOutAccount = () => {
  return useMutation({
    mutationFn: signOutAccount,
  });
};

// ============================================================
// POST QUERIES
// ============================================================

export const useGetPosts = () => {
  return useInfiniteQuery({
    queryKey: [QUERY_KEYS.GET_INFINITE_POSTS],
    queryFn: getInfinitePosts,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      // If there's no data, there are no more pages.
      if (!lastPage || lastPage.documents.length === 0) {
        return undefined;
      }

      // Use the $id of the last document as the cursor.
      const lastId = lastPage.documents[lastPage.documents.length - 1].$id;
      return lastId;
    },
  });
};

export const useSearchPosts = (searchTerm: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.SEARCH_POSTS, searchTerm],
    queryFn: () => searchPosts(searchTerm),
    enabled: !!searchTerm,
  });
};

export const useGetRecentPosts = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
    queryFn: getRecentPosts,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: INewPost) => createPost(post),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_INFINITE_POSTS],
      });
    },
  });
};

export const useGetPostById = (postId?: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_POST_BY_ID, postId],
    queryFn: () => getPostById(postId),
    enabled: !!postId,
  });
};

export const useGetUserPosts = (userId?: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_USER_POSTS, userId],
    queryFn: () => getUserPosts(userId),
    enabled: !!userId,
  });
};

export const useUpdatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: IUpdatePost) => updatePost(post),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_POST_BY_ID, data?.$id],
      });
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, imageId }: { postId?: string; imageId: string }) =>
      deletePost(postId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_INFINITE_POSTS],
      });
    },
  });
};

export const useGetPostLikes = (postId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_POST_LIKES, postId],
    queryFn: () => getPostLikes(postId),
    enabled: !!postId,
  });
};

export const useGetUserLikes = (userId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_USER_LIKES, userId],
    queryFn: () => getUserLikes(userId),
    enabled: !!userId,
  });
};

export const useLikePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, postId }: { userId: string; postId: string }) =>
      likePost(userId, postId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_POST_LIKES, variables.postId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_USER_LIKES, variables.userId],
      });
    },
  });
};

export const useUnlikePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ likeRecordId }: { likeRecordId: string; userId: string; postId: string }) =>
      unlikePost(likeRecordId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_POST_LIKES, variables.postId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_USER_LIKES, variables.userId],
      });
    },
  });
};

export const useGetUserSaves = (userId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_USER_SAVES, userId],
    queryFn: () => getUserSaves(userId),
    enabled: !!userId,
  });
};

export const useSavePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, postId }: { userId: string; postId: string }) =>
      savePost(userId, postId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_USER_SAVES, variables.userId],
      });
    },
  });
};

export const useDeleteSavedPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ savedRecordId }: { savedRecordId: string; userId: string }) =>
      deleteSavedPost(savedRecordId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_USER_SAVES, variables.userId],
      });
    },
  });
};

// Hydrates a list of post IDs (from saves/likes join records) into full
// post objects in a single request. See api.ts getPostsByIds.
export const useGetPostsByIds = (postIds: string[]) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_POSTS_BY_IDS, ...postIds],
    queryFn: () => getPostsByIds(postIds),
    enabled: postIds.length > 0,
  });
};

// ============================================================
// USER QUERIES
// ============================================================

export const useGetCurrentUser = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_CURRENT_USER],
    queryFn: getCurrentUser,
  });
};

export const useGetUsers = (limit?: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_USERS],
    queryFn: () => getUsers(limit),
  });
};

export const useGetUserById = (userId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_USER_BY_ID, userId],
    queryFn: () => getUserById(userId),
    enabled: !!userId,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user: IUpdateUser) => updateUser(user),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_CURRENT_USER],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_USER_BY_ID, data?.$id],
      });
    },
  });
};

// ============================================================
// FOLLOW QUERIES
// ============================================================

export const useGetFollowers = (userId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_FOLLOWERS, userId],
    queryFn: () => getFollowers(userId),
    enabled: !!userId,
  });
};

export const useGetFollowing = (userId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_FOLLOWING, userId],
    queryFn: () => getFollowing(userId),
    enabled: !!userId,
  });
};

export const useFollowUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      followerId,
      followingId,
    }: {
      followerId: string;
      followingId: string;
    }) => followUser(followerId, followingId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_FOLLOWERS, variables.followingId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_FOLLOWING, variables.followerId],
      });
    },
  });
};

export const useUnfollowUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ followRecordId }: { followRecordId: string; followerId: string; followingId: string }) =>
      unfollowUser(followRecordId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_FOLLOWERS, variables.followingId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_FOLLOWING, variables.followerId],
      });
    },
  });
};
