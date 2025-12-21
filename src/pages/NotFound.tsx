import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center animate-fade-in">
        <h1 className="mb-4 text-7xl font-bold text-red-500">Ups!</h1>
        <p>Nie można znaleźć tej strony </p>
        <br /><br />
        <a href="/" className="hover:scale-110 inline-block underline transition duration-300 text-primary text-2xl">
          Wróć na stronę główną
        </a>
      </div>
    </div>
  );
};

export default NotFound;
