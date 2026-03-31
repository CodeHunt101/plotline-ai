"use client";

import useMovieForm from "@/components/features/hooks/useMovieForm";
import MovieFormFields from "@/components/features/MovieFormFields";
import { useMovieContext } from "@/contexts/MovieContext";
import { MovieFormData } from "@/types/movie";
import { useRouter } from "next/navigation";
import { useState } from "react";

const INITIAL_FORM_STATE: MovieFormData = {
  favouriteMovie: "",
  favouriteFilmPerson: "",
  movieType: "new",
  moodType: "fun",
};

const MovieFormClient = () => {
  const router = useRouter();
  const { participantsData, totalParticipants, setParticipantsData } = useMovieContext();

  const [currentParticipant, setCurrentParticipant] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const {
    formData,
    validationErrors,
    handleTypeChange,
    handleTextChange,
    validateForm,
    resetForm,
  } = useMovieForm(INITIAL_FORM_STATE);

  const handleFormSubmission = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formDataObj = new FormData(e.currentTarget);
    const favouriteMovie = formDataObj.get("favouriteMovie")?.toString() || "";
    const favouriteFilmPerson = formDataObj.get("favouriteFilmPerson")?.toString() || "";

    if (!validateForm({ favouriteMovie, favouriteFilmPerson })) {
      setError("Please fill out all required fields");
      return;
    }

    const currentData = { ...formData, favouriteMovie, favouriteFilmPerson };
    const updatedParticipantsData = [...participantsData, currentData];

    if (currentParticipant < totalParticipants) {
      setParticipantsData(updatedParticipantsData);
      setCurrentParticipant((prev) => prev + 1);
      resetForm();
      return;
    }

    setParticipantsData(updatedParticipantsData);
    router.push("/recommendations");
  };

  return (
    <>
      <h2 className="text-2xl mb-4 text-center">Person #{currentParticipant}</h2>
      <form onSubmit={handleFormSubmission} className="space-y-6">
        <MovieFormFields
          formData={formData}
          validationErrors={validationErrors}
          handleTextChange={handleTextChange}
          handleTypeChange={handleTypeChange}
        />

        <button type="submit" className="btn btn-primary block w-full text-3xl">
          {currentParticipant === totalParticipants ? "Get Movie" : "Next"}
        </button>

        {error && <p className="text-red-500 text-center">{error}</p>}
      </form>
    </>
  );
};

export default MovieFormClient;
