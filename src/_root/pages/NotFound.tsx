import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex-center w-full h-screen flex-col gap-6 bg-aurora px-5 text-center">
      <p className="text-primary-500 small-semibold tracking-[0.3em] uppercase">
        404
      </p>
      <h1 className="h1-bold md:h1-semibold text-light-1">
        This page ghosted us.
      </h1>
      <p className="body-medium text-light-3 max-w-md">
        The page you're looking for doesn't exist, was moved, or never made
        it out of drafts.
      </p>
      <Link
        to="/"
        className="shad-button_primary px-8 h-11 rounded-lg flex-center mt-2">
        Back to Home
      </Link>
    </div>
  );
};

export default NotFound;
