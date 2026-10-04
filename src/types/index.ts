import { Models } from "appwrite";

export type INavLink = {
  imgURL: string;
  route: string;
  label: string;
};

export type IUpdateUser = {
  userId: string;
  name: string;
  bio: string;
  imageId: string;
  imageUrl: string;
  file: File[];
};

export type INewPost = {
  userId: string;
  caption: string;
  file: File[];
  location?: string;
  tags?: string;
};

export type IUpdatePost = {
  postId: string;
  caption: string;
  imageId: string;
  imageUrl: string;
  file: File[];
  location?: string;
  tags?: string;
};

export type IUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  imageUrl: string;
  bio: string;
};

export type INewUser = {
  name: string;
  email: string;
  username: string;
  password: string;
};

// ============================================================
// APPWRITE DOCUMENT SHAPES
// ============================================================
// IMPORTANT: by default, Appwrite relationship attributes come back as a
// bare related-document ID (a string) — NOT a populated object — unless
// the query explicitly asks for expansion with Query.select(["*", "key.*"]).
// To keep this predictable, this app only expands `creator` on posts
// (via Query.select in api.ts, since the UI needs the creator's name/avatar
// everywhere a post is shown) and otherwise treats every other
// relationship field as a plain ID string, comparing IDs directly instead
// of assuming a nested object with its own `.$id`.

/** A user document as stored in the `users` collection. */
export type IUserDoc = Models.Document & {
  accountId: string;
  name: string;
  username: string;
  email: string;
  imageUrl: string;
  imageId?: string;
  bio?: string;
};

/** A post document as stored in the `posts` collection. `creator` is always
 * fetched expanded (see api.ts) since the UI needs the author's details. */
export type IPost = Models.Document & {
  creator: IUserDoc;
  caption: string;
  tags: string[];
  imageUrl: string;
  imageId: string;
  location?: string;
};

/** A "saved post" join document as stored in the `saves` collection.
 * `user` and `post` are plain IDs — not expanded. */
export type ISave = Models.Document & {
  user: string;
  post: string;
};

/** A "like" join document as stored in the dedicated `likes` collection
 * (plain string columns, not an Appwrite relationship — see SETUP.md for
 * why likes live in their own collection instead of as a field on posts). */
export type ILike = Models.Document & {
  userId: string;
  postId: string;
};

/** A "follow" join document as stored in the `follows` collection.
 * `follower` and `following` are plain IDs — not expanded. */
export type IFollow = Models.Document & {
  follower: string;
  following: string;
};
