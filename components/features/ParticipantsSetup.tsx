"use client";

import { useMovieContext } from "@/contexts/MovieContext";
import { useRouter } from "next/navigation";

const MAX_PARTICIPANTS = 10;

const ParticipantsSetup = () => {
  const router = useRouter();

  const {
    timeAvailable,
    setGroupTimeAvailable,
    totalParticipants,
    setTotalParticipants,
    setParticipantsData,
    setRecommendations,
  } = useMovieContext();

  const handleStart = () => {
    setParticipantsData([]);
    setRecommendations(null);
    router.push("/movieForm");
  };

  return (
    <div className="text-center w-full">
      <label
        htmlFor="participants-range"
        className="label-text text-secondary text-start text-lg mb-2 block"
      >
        How many people?
      </label>
      <div className="mb-6">
        <input
          id="participants-range"
          type="range"
          min="1"
          max={MAX_PARTICIPANTS}
          value={totalParticipants}
          onChange={(e) => setTotalParticipants(Number(e.target.value))}
          className="range"
          step="1"
          aria-valuetext={`${totalParticipants} ${totalParticipants === 1 ? "person" : "people"}`}
        />
        <div className="flex w-full justify-between px-2 text-base" aria-hidden="true">
          {Array.from({ length: MAX_PARTICIPANTS }, (_, i) => (
            <span key={i + 1}>{i + 1}</span>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label
          htmlFor="time-available"
          className="label-text text-secondary text-start text-lg mb-2 block"
        >
          How much time do you have?
        </label>
        <input
          id="time-available"
          type="text"
          value={timeAvailable}
          onChange={(e) => setGroupTimeAvailable(e.target.value)}
          placeholder="How much time do you have?"
          className="input input-bordered w-full bg-info text-lg"
        />
      </div>

      <button
        onClick={handleStart}
        className="btn btn-primary block mx-auto w-full text-3xl font-display"
      >
        Start
      </button>
    </div>
  );
};

export default ParticipantsSetup;
