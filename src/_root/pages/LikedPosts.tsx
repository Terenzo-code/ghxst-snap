import { GridPostList, Loader } from "@/components/shared";
import { useUserContext } from "@/context/AuthContext";
import { useGetUserLikes, useGetPostsByIds } from "@/lib/react-query/queries";

const LikedPosts = () => {
  const { user } = useUserContext();

  const { data: likes, isLoading: isLoadingLikes } = useGetUserLikes(user.id);
  const postIds = likes?.documents.map((like) => like.postId) ?? [];

  const { data: posts, isLoading: isLoadingPosts } =
    useGetPostsByIds(postIds);

  const likedPosts = posts?.documents ?? [];
  const isLoading = isLoadingLikes || (postIds.length > 0 && isLoadingPosts);

  if (isLoading) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }

  return (
    <>
      {likedPosts.length === 0 && (
        <p className="text-light-4">No liked posts</p>
      )}

      <GridPostList posts={likedPosts} showStats={false} />
    </>
  );
};

export default LikedPosts;
