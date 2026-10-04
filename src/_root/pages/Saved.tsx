import { GridPostList, Loader } from "@/components/shared";
import { useUserContext } from "@/context/AuthContext";
import { useGetUserSaves, useGetPostsByIds } from "@/lib/react-query/queries";

const Saved = () => {
  const { user } = useUserContext();

  const { data: saves, isLoading: isLoadingSaves } = useGetUserSaves(user.id);
  const postIds = saves?.documents.map((save) => save.post) ?? [];

  const { data: posts, isLoading: isLoadingPosts } =
    useGetPostsByIds(postIds);

  // Newest-saved-first: saves come back in creation order, so reverse it.
  const savedPosts = [...(posts?.documents ?? [])].reverse();

  const isLoading = isLoadingSaves || (postIds.length > 0 && isLoadingPosts);

  return (
    <div className="saved-container">
      <div className="flex gap-2 w-full max-w-5xl">
        <img
          src="/assets/icons/save.svg"
          width={36}
          height={36}
          alt="edit"
          className="invert-white"
        />
        <h2 className="h3-bold md:h2-bold text-left w-full">Saved Posts</h2>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <ul className="w-full flex justify-center max-w-5xl gap-9">
          {savedPosts.length === 0 ? (
            <p className="text-light-4">No available posts</p>
          ) : (
            <GridPostList posts={savedPosts} showStats={false} />
          )}
        </ul>
      )}
    </div>
  );
};

export default Saved;
