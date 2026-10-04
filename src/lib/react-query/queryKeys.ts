export enum QUERY_KEYS {
  // AUTH KEYS
  CREATE_USER_ACCOUNT = "createUserAccount",

  // USER KEYS
  GET_CURRENT_USER = "getCurrentUser",
  GET_USERS = "getUsers",
  GET_USER_BY_ID = "getUserById",
  GET_FOLLOWERS = "getFollowers",
  GET_FOLLOWING = "getFollowing",

  // POST KEYS
  GET_POSTS = "getPosts",
  GET_INFINITE_POSTS = "getInfinitePosts",
  GET_RECENT_POSTS = "getRecentPosts",
  GET_POST_BY_ID = "getPostById",
  GET_USER_POSTS = "getUserPosts",
  GET_FILE_PREVIEW = "getFilePreview",

  // LIKE KEYS
  GET_POST_LIKES = "getPostLikes",
  GET_USER_LIKES = "getUserLikes",

  // SAVE KEYS
  GET_USER_SAVES = "getUserSaves",

  // BATCH KEYS
  GET_POSTS_BY_IDS = "getPostsByIds",

  //  SEARCH KEYS
  SEARCH_POSTS = "getSearchPosts",
}