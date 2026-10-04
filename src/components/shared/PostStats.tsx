import { useState } from "react";
import { useLocation } from "react-router-dom";

import {
  useLikePost,
  useUnlikePost,
  useGetPostLikes,
  useSavePost,
  useDeleteSavedPost,
  useGetUserSaves,
} from "@/lib/react-query/queries";
import { IPost } from "@/types";

type PostStatsProps = {
  post: IPost;
  userId: string;
};

const PostStats = ({ post, userId }: PostStatsProps) => {
  const location = useLocation();

  // Optimistic overrides: null means "trust the server value", true/false
  // means "we just clicked, show this instantly while the mutation is in
  // flight". Avoids syncing derived state via an effect.
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(
    null
  );
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(
    null
  );

  const { data: postLikes } = useGetPostLikes(post.$id);
  const { mutate: likePost } = useLikePost();
  const { mutate: unlikePost } = useUnlikePost();

  const { data: userSaves } = useGetUserSaves(userId);
  const { mutate: savePost } = useSavePost();
  const { mutate: deleteSavePost } = useDeleteSavedPost();

  const myLikeRecord = postLikes?.documents.find(
    (like) => like.userId === userId
  );
  const isLiked = optimisticLiked ?? !!myLikeRecord;
  // The displayed count always reflects real server data, nudged by one
  // while an optimistic click is in flight, so it never looks "stuck".
  const likeCount =
    (postLikes?.documents.length ?? 0) +
    (optimisticLiked === true && !myLikeRecord
      ? 1
      : optimisticLiked === false && myLikeRecord
      ? -1
      : 0);

  const savedRecord = userSaves?.documents.find(
    (save) => save.post === post.$id
  );
  const isSaved = optimisticSaved ?? !!savedRecord;

  const handleLikePost = (
    e: React.MouseEvent<HTMLImageElement, MouseEvent>
  ) => {
    e.stopPropagation();

    if (myLikeRecord) {
      setOptimisticLiked(false);
      unlikePost({ likeRecordId: myLikeRecord.$id, userId, postId: post.$id });
    } else {
      setOptimisticLiked(true);
      likePost({ userId, postId: post.$id });
    }
  };

  const handleSavePost = (
    e: React.MouseEvent<HTMLImageElement, MouseEvent>
  ) => {
    e.stopPropagation();

    if (savedRecord) {
      setOptimisticSaved(false);
      deleteSavePost({ savedRecordId: savedRecord.$id, userId });
      return;
    }

    savePost({ userId, postId: post.$id });
    setOptimisticSaved(true);
  };

  const containerStyles = location.pathname.startsWith("/profile")
    ? "w-full"
    : "";

  return (
    <div
      className={`flex justify-between items-center z-20 ${containerStyles}`}>
      <div className="flex gap-2 mr-5">
        <img
          src={
            isLiked ? "/assets/icons/liked.svg" : "/assets/icons/like.svg"
          }
          alt="like"
          width={20}
          height={20}
          onClick={(e) => handleLikePost(e)}
          className="cursor-pointer"
        />
        <p className="small-medium lg:base-medium">{likeCount}</p>
      </div>

      <div className="flex gap-2">
        <img
          src={isSaved ? "/assets/icons/saved.svg" : "/assets/icons/save.svg"}
          alt="share"
          width={20}
          height={20}
          className="cursor-pointer"
          onClick={(e) => handleSavePost(e)}
        />
      </div>
    </div>
  );
};

export default PostStats;
