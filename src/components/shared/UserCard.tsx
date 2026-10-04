import { Link } from "react-router-dom";

import { Button } from "../ui/button";
import { IUserDoc } from "@/types";
import { useUserContext } from "@/context/AuthContext";
import {
  useGetFollowers,
  useFollowUser,
  useUnfollowUser,
} from "@/lib/react-query/queries";

type UserCardProps = {
  user: IUserDoc;
};

const UserCard = ({ user }: UserCardProps) => {
  const { user: currentUser } = useUserContext();
  const isSelf = currentUser.id === user.$id;

  const { data: followers } = useGetFollowers(user.$id);
  const { mutate: follow, isPending: isFollowing } = useFollowUser();
  const { mutate: unfollow, isPending: isUnfollowing } = useUnfollowUser();

  // `record.follower` is a plain ID string (not an expanded object) unless
  // explicitly selected — compare directly rather than via `.follower.$id`.
  const followRecord = followers?.documents.find(
    (record) => record.follower === currentUser.id
  );
  const isFollowed = !!followRecord;

  const handleFollowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser.id) return;

    if (isFollowed && followRecord) {
      unfollow({
        followRecordId: followRecord.$id,
        followerId: currentUser.id,
        followingId: user.$id,
      });
    } else {
      follow({ followerId: currentUser.id, followingId: user.$id });
    }
  };

  return (
    <Link to={`/profile/${user.$id}`} className="user-card">
      <img
        src={user.imageUrl || "/assets/icons/profile-placeholder.svg"}
        alt="creator"
        className="rounded-full w-14 h-14"
      />

      <div className="flex-center flex-col gap-1">
        <p className="base-medium text-light-1 text-center line-clamp-1">
          {user.name}
        </p>
        <p className="small-regular text-light-3 text-center line-clamp-1">
          @{user.username}
        </p>
      </div>

      {!isSelf && (
        <Button
          type="button"
          size="sm"
          onClick={handleFollowClick}
          disabled={isFollowing || isUnfollowing}
          variant={isFollowed ? "outline" : "default"}
          className={isFollowed ? "px-5" : "shad-button_primary px-5"}>
          {isFollowed ? "Following" : "Follow"}
        </Button>
      )}
    </Link>
  );
};

export default UserCard;
