import { ID, Query, Permission, Role } from "appwrite";

import { appwriteConfig, account, databases, storage, avatars } from "./config";
import {
  IUpdatePost,
  INewPost,
  INewUser,
  IUpdateUser,
  IPost,
  IUserDoc,
  IFollow,
  ISave,
  ILike,
} from "@/types";

// Every direct post query expands `creator` into a full user object — the
// UI (PostCard, GridPostList, PostDetails...) always needs the author's
// name/avatar, and relationship fields are bare ID strings unless you
// explicitly ask Appwrite to expand them like this.
const POST_SELECT = Query.select(["*", "creator.*"]);

// ============================================================
// AUTH
// ============================================================

// ============================== SIGN UP
export async function createUserAccount(user: INewUser) {
  try {
    const newAccount = await account.create(
      ID.unique(),
      user.email,
      user.password,
      user.name
    );

    if (!newAccount) throw Error;

    // Log the new account in *before* writing its profile document. The
    // profile document's permissions grant edit/delete rights to
    // `Role.user(accountId)` — only an authenticated session for that
    // exact user is allowed to hand out that permission. Writing the
    // document first (while still a guest) is what used to cause
    // "Permissions must be one of: (any, guests)" errors.
    const session = await account.createEmailPasswordSession(
      user.email,
      user.password
    );

    if (!session) throw Error;

    const avatarUrl = avatars.getInitials(user.name);

    const newUser = await saveUserToDB({
      accountId: newAccount.$id,
      name: newAccount.name,
      email: newAccount.email,
      username: user.username,
      imageUrl: avatarUrl,
    });

    return newUser;
  } catch (error) {
    // Returning the error here (instead of undefined) used to make the
    // caller's `if (!newUser)` failure check falsely pass, since an Error
    // object is truthy. Returning nothing lets callers correctly detect
    // a failed sign-up.
    console.log(error);
  }
}

// ============================== SAVE USER TO DB
export async function saveUserToDB(user: {
  accountId: string;
  email: string;
  name: string;
  imageUrl: string;
  username?: string;
}) {
  try {
    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      // Deliberately reuse the Auth account's own ID as the profile
      // document's ID (instead of ID.unique()). This keeps a single ID
      // for "this user" everywhere in the app — the same value identifies
      // the document for relationships (creator, follower, likes...) AND
      // is the only value Appwrite will accept in a Role.user(...)
      // permission for that account. Minting a separate random document
      // ID here is what caused "Permissions must be one of: ..." errors
      // on every later write (posts, saves, follows) made by this user.
      user.accountId,
      user,
      [
        // Profiles are public to read, but only the account owner can
        // ever edit or delete their own user document.
        Permission.read(Role.any()),
        Permission.update(Role.user(user.accountId)),
        Permission.delete(Role.user(user.accountId)),
      ]
    );

    return newUser;
  } catch (error) {
    console.log(error);
  }
}

// ============================== SIGN IN
export async function signInAccount(user: { email: string; password: string }) {
  try {
    const session = await account.createEmailPasswordSession(
      user.email,
      user.password
    );

    return session;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET ACCOUNT
export async function getAccount() {
  try {
    const currentAccount = await account.get();

    return currentAccount;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET USER
export async function getCurrentUser() {
  try {
    const currentAccount = await getAccount();

    if (!currentAccount) throw Error;

    const currentUser = await databases.listDocuments<IUserDoc>(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

    if (!currentUser || currentUser.documents.length === 0) throw Error;

    return currentUser.documents[0];
  } catch (error) {
    console.log(error);
    return null;
  }
}

// ============================== SIGN OUT
export async function signOutAccount() {
  try {
    const session = await account.deleteSession("current");

    return session;
  } catch (error) {
    console.log(error);
  }
}

// ============================================================
// POSTS
// ============================================================

// ============================== CREATE POST
export async function createPost(post: INewPost) {
  try {
    // Upload file to appwrite storage
    const uploadedFile = await uploadFile(post.file[0]);

    if (!uploadedFile) throw Error;

    // Get file url
    const fileUrl = getFilePreview(uploadedFile.$id);
    if (!fileUrl) {
      await deleteFile(uploadedFile.$id);
      throw Error;
    }

    // Convert tags into array
    const tags = post.tags?.replace(/ /g, "").split(",") || [];

    // Create post
    const newPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      ID.unique(),
      {
        creator: post.userId,
        caption: post.caption,
        imageUrl: fileUrl,
        imageId: uploadedFile.$id,
        location: post.location,
        tags: tags,
      },
      [
        // Posts are public to read, but only their creator can edit or
        // delete them.
        Permission.read(Role.any()),
        Permission.update(Role.user(post.userId)),
        Permission.delete(Role.user(post.userId)),
      ]
    );

    if (!newPost) {
      await deleteFile(uploadedFile.$id);
      throw Error;
    }

    return newPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPLOAD FILE
export async function uploadFile(file: File) {
  try {
    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      file,
      [
        // Without an explicit permission here, a bucket with "File
        // Security" enabled falls back to nobody being able to read the
        // file — the post still saves fine (the URL is just a string in
        // the document), but the <img> tag silently fails to load it.
        Permission.read(Role.any()),
      ]
    );

    return uploadedFile;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET FILE URL
export function getFilePreview(fileId: string) {
  try {
    // NOTE: this intentionally uses getFileView, not getFilePreview.
    // getFilePreview applies on-the-fly resizing ("image transformations"),
    // which Appwrite Cloud blocks entirely on the Free plan — it returns a
    // URL just fine, but the browser gets a 403 when it actually tries to
    // load it, so every image silently fails to render. getFileView serves
    // the original file with no transformation and works on every plan.
    const fileUrl = storage.getFileView(appwriteConfig.storageId, fileId);

    if (!fileUrl) throw Error;

    return fileUrl;
  } catch (error) {
    console.log(error);
  }
}

// ============================== DELETE FILE
export async function deleteFile(fileId: string) {
  try {
    await storage.deleteFile(appwriteConfig.storageId, fileId);

    return { status: "ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== SEARCH POSTS
export async function searchPosts(searchTerm: string) {
  try {
    const posts = await databases.listDocuments<IPost>(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.search("caption", searchTerm), POST_SELECT]
    );

    if (!posts) throw Error;

    return posts;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET INFINITE POSTS
export async function getInfinitePosts({
  pageParam,
}: {
  pageParam?: string;
}) {
  const queries: string[] = [
    Query.orderDesc("$updatedAt"),
    Query.limit(9),
    POST_SELECT,
  ];

  if (pageParam) {
    queries.push(Query.cursorAfter(pageParam));
  }

  try {
    const posts = await databases.listDocuments<IPost>(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      queries
    );

    if (!posts) throw Error;

    return posts;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET POST BY ID
export async function getPostById(postId?: string) {
  if (!postId) throw Error;

  try {
    const post = await databases.getDocument<IPost>(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      [POST_SELECT]
    );

    if (!post) throw Error;

    return post;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPDATE POST
export async function updatePost(post: IUpdatePost) {
  const hasFileToUpdate = post.file.length > 0;

  try {
    let image = {
      imageUrl: post.imageUrl,
      imageId: post.imageId,
    };

    if (hasFileToUpdate) {
      // Upload new file to appwrite storage
      const uploadedFile = await uploadFile(post.file[0]);
      if (!uploadedFile) throw Error;

      // Get new file url
      const fileUrl = getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }

      image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    // Convert tags into array
    const tags = post.tags?.replace(/ /g, "").split(",") || [];

    //  Update post
    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      post.postId,
      {
        caption: post.caption,
        imageUrl: image.imageUrl,
        imageId: image.imageId,
        location: post.location,
        tags: tags,
      }
    );

    // Failed to update
    if (!updatedPost) {
      // Delete new file that has been recently uploaded
      if (hasFileToUpdate) {
        await deleteFile(image.imageId);
      }

      // If no new file uploaded, just throw error
      throw Error;
    }

    // Safely delete old file after successful update
    if (hasFileToUpdate) {
      await deleteFile(post.imageId);
    }

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== DELETE POST
export async function deletePost(postId?: string, imageId?: string) {
  if (!postId || !imageId) return;

  try {
    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId
    );

    if (!statusCode) throw Error;

    await deleteFile(imageId);

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== LIKE POST
// Likes deliberately live in their OWN collection (user/post string
// columns), not as a relationship field directly on the post. Liking is an
// action taken by someone who is usually NOT the post's creator — but a
// post's write permissions only allow its creator to update it (see
// createPost). If "liking" meant updating the post document's own `likes`
// field, every like from anyone but the creator would be rejected with a
// permissions error. Creating a small, self-owned like record instead
// (same pattern as `saves`) sidesteps that entirely.
export async function likePost(userId: string, postId: string) {
  try {
    const newLike = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.likesCollectionId,
      ID.unique(),
      { userId, postId },
      [
        // Visible to anyone (so like counts are public), but only the
        // person who liked it can ever remove their own like.
        Permission.read(Role.any()),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
      ]
    );

    if (!newLike) throw Error;

    return newLike;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UNLIKE POST
export async function unlikePost(likeRecordId: string) {
  try {
    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.likesCollectionId,
      likeRecordId
    );

    if (!statusCode) throw Error;

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET LIKES FOR A POST
export async function getPostLikes(postId: string) {
  try {
    const likes = await databases.listDocuments<ILike>(
      appwriteConfig.databaseId,
      appwriteConfig.likesCollectionId,
      [Query.equal("postId", postId), Query.limit(1000)]
    );

    if (!likes) throw Error;

    return likes;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET POSTS A USER HAS LIKED
export async function getUserLikes(userId: string) {
  try {
    const likes = await databases.listDocuments<ILike>(
      appwriteConfig.databaseId,
      appwriteConfig.likesCollectionId,
      [Query.equal("userId", userId), Query.limit(1000)]
    );

    if (!likes) throw Error;

    return likes;
  } catch (error) {
    console.log(error);
  }
}

// ============================== SAVE POST
export async function savePost(userId: string, postId: string) {
  try {
    const updatedPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      ID.unique(),
      {
        user: userId,
        post: postId,
      },
      [
        // Saves are private bookmarks — only their owner can ever see,
        // change, or remove them.
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
      ]
    );

    if (!updatedPost) throw Error;

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}
// ============================== DELETE SAVED POST
export async function deleteSavedPost(savedRecordId: string) {
  try {
    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      savedRecordId
    );

    if (!statusCode) throw Error;

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET A USER'S SAVED POSTS (join records)
// Returns the raw `saves` records (with a bare `post` ID string each) —
// not expanded. Combine with getPostsByIds to render the actual posts.
export async function getUserSaves(userId: string) {
  try {
    const saves = await databases.listDocuments<ISave>(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      [Query.equal("user", userId), Query.limit(1000)]
    );

    if (!saves) throw Error;

    return saves;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET USER'S POST
export async function getUserPosts(userId?: string) {
  if (!userId) return;

  try {
    const post = await databases.listDocuments<IPost>(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.equal("creator", userId), Query.orderDesc("$createdAt"), POST_SELECT]
    );

    if (!post) throw Error;

    return post;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET RECENT POSTS
export async function getRecentPosts() {
  try {
    const posts = await databases.listDocuments<IPost>(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(20), POST_SELECT]
    );

    if (!posts) throw Error;

    return posts;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET POSTS BY ID (batch)
// Used to hydrate join-table records (saves, likes) into full post objects
// in one request, instead of either an N+1 loop of getPostById calls or
// relying on Appwrite to auto-expand a relationship two levels deep.
export async function getPostsByIds(postIds: string[]) {
  if (postIds.length === 0) return { documents: [] as IPost[] };

  try {
    const posts = await databases.listDocuments<IPost>(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.equal("$id", postIds), Query.limit(postIds.length), POST_SELECT]
    );

    if (!posts) throw Error;

    return posts;
  } catch (error) {
    console.log(error);
  }
}

// ============================================================
// USER
// ============================================================

// ============================== GET USERS
export async function getUsers(limit?: number) {
  const queries: string[] = [Query.orderDesc("$createdAt")];

  if (limit) {
    queries.push(Query.limit(limit));
  }

  try {
    const users = await databases.listDocuments<IUserDoc>(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      queries
    );

    if (!users) throw Error;

    return users;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET USER BY ID
export async function getUserById(userId: string) {
  try {
    const user = await databases.getDocument<IUserDoc>(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId
    );

    if (!user) throw Error;

    return user;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPDATE USER
export async function updateUser(user: IUpdateUser) {
  const hasFileToUpdate = user.file.length > 0;
  try {
    let image = {
      imageUrl: user.imageUrl,
      imageId: user.imageId,
    };

    if (hasFileToUpdate) {
      // Upload new file to appwrite storage
      const uploadedFile = await uploadFile(user.file[0]);
      if (!uploadedFile) throw Error;

      // Get new file url
      const fileUrl = getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }

      image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    //  Update user
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      user.userId,
      {
        name: user.name,
        bio: user.bio,
        imageUrl: image.imageUrl,
        imageId: image.imageId,
      }
    );

    // Failed to update
    if (!updatedUser) {
      // Delete new file that has been recently uploaded
      if (hasFileToUpdate) {
        await deleteFile(image.imageId);
      }
      // If no new file uploaded, just throw error
      throw Error;
    }

    // Safely delete old file after successful update
    if (user.imageId && hasFileToUpdate) {
      await deleteFile(user.imageId);
    }

    return updatedUser;
  } catch (error) {
    console.log(error);
  }
}

// ============================================================
// FOLLOWS
// ============================================================

// ============================== FOLLOW USER
export async function followUser(followerId: string, followingId: string) {
  try {
    const newFollow = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      ID.unique(),
      {
        follower: followerId,
        following: followingId,
      },
      [
        // Follow records are public (so follower/following counts and
        // lists work for anyone), but only the follower who created the
        // link can remove it.
        Permission.read(Role.any()),
        Permission.update(Role.user(followerId)),
        Permission.delete(Role.user(followerId)),
      ]
    );

    if (!newFollow) throw Error;

    return newFollow;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UNFOLLOW USER
export async function unfollowUser(followRecordId: string) {
  try {
    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      followRecordId
    );

    if (!statusCode) throw Error;

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET FOLLOWERS OF A USER
export async function getFollowers(userId: string) {
  try {
    const followers = await databases.listDocuments<IFollow>(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("following", userId), Query.limit(1000)]
    );

    if (!followers) throw Error;

    return followers;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET USERS A USER IS FOLLOWING
export async function getFollowing(userId: string) {
  try {
    const following = await databases.listDocuments<IFollow>(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("follower", userId), Query.limit(1000)]
    );

    if (!following) throw Error;

    return following;
  } catch (error) {
    console.log(error);
  }
}
