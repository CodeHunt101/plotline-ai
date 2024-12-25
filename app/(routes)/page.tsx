'use client'

import React, { useState } from 'react';
import { useActionState } from "react";
import { useRouter } from 'next/navigation';
import { useMovieContext } from '@/contexts/MovieContext';
// import { getMovieRecommendation } from '@/lib/utils/movie';
import TextAreaField from '@/components/ui/TextAreaField';
import { getMovieRecommendation } from '@/lib/utils/movie';

export type ParticipantData = {
  favouriteMovie: string;
  mood: string;
  preference: string;
};

export default function Home() {
  const router = useRouter();
  const { timeAvailable, setParticipantsData, setGroupTimeAvailable, setRecommendations } = useMovieContext();
  
  // State for initial setup
  const [showParticipantSelect, setShowParticipantSelect] = useState(true);
  const [totalParticipants, setTotalParticipants] = useState(1);
  const [currentParticipant, setCurrentParticipant] = useState(1);
  
  // Store all participants' data
  const [allParticipantsData, setAllParticipantsData] = useState<ParticipantData[]>([]);
  
  // Current form data
  const [formData, setFormData] = useState<ParticipantData>({
    favouriteMovie: '',
    mood: '',
    preference: ''
  });
  
  const [validationErrors, setValidationErrors] = useState({
    favouriteMovie: false,
    mood: false,
    preference: false
  });

  const handleParticipantSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalParticipants(Number(e.target.value));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setGroupTimeAvailable(value);
  };

  const startForms = () => {
    setShowParticipantSelect(false);
  };

  const [error, submitAction, isPending] = useActionState(
    async (_prevState: unknown, formDataObj: FormData) => {
      try {
        // Extract form data
        const favouriteMovie = formDataObj.get('favouriteMovie')?.toString() || '';
        const mood = formDataObj.get('mood')?.toString() || '';
        const preference = formDataObj.get('preference')?.toString() || '';

        const newValidationErrors = {
          favouriteMovie: !favouriteMovie,
          mood: !mood,
          preference: !preference
        };
        
        setValidationErrors(newValidationErrors);

        if (!favouriteMovie || !mood || !preference) {
          throw new Error('Please fill out all fields');
        }

        const currentData = {
          favouriteMovie,
          mood,
          preference
        };

        // Add current participant's data to the array
        const updatedParticipantsData = [...allParticipantsData, currentData];
        setAllParticipantsData(updatedParticipantsData);
        console.log({ updatedParticipantsData });
        if (currentParticipant < totalParticipants) {
          // Move to next participant
          setCurrentParticipant(prev => prev + 1);
          // Reset form for next participant
          setFormData({
            favouriteMovie: '',
            mood: '',
            preference: ''
          });
        } else {
          // All participants have submitted, make API call
          const recommendedMovies = await getMovieRecommendation({timeAvailable, participantsData: updatedParticipantsData});

          console.log({ recommendedMovies });
          
          setParticipantsData(updatedParticipantsData);
          setRecommendations(recommendedMovies);
          router.push('/recommendations');
        }
      } catch (err) {
        if (err instanceof Error) {
          return err.message;
        }
        return 'An unknown error occurred';
      }
      return null;
    },
    null
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (validationErrors[name as keyof typeof validationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  if (showParticipantSelect) {
    return (
      <div className="text-center">
        <h2 className="text-2xl mb-4">Let&apos;s set up your movie night!</h2>
        <div className="mb-6">
          <input type="range" min="1" max="10" value={totalParticipants} onChange={handleParticipantSelect} className="range" step="1" />
            <div className="flex w-full justify-between px-2 text-xs">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => <span key={num}>{num}</span>) }
            </div>
        </div>
        
        <div className="mb-6">
          <input
            type="text"
            value={timeAvailable}
            onChange={handleTimeChange}
            placeholder="How much time do you have?"
            className="input input-bordered w-full max-w-xs"
          />
        </div>

        <button
          onClick={startForms}
          className="btn btn-primary block mx-auto"
        >
          Start
        </button>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl mb-4 text-center">Person #{currentParticipant}</h2>
      <form action={submitAction}>
        <fieldset>
          <TextAreaField
            label="What's your favorite movie and why?"
            name="favouriteMovie"
            value={formData.favouriteMovie}
            onChange={handleChange}
            error={validationErrors.favouriteMovie}
            placeholder="What's your favorite movie and why?"
          />
          <TextAreaField
            label="Are you in the mood for something new or a classic?"
            name="mood"
            value={formData.mood}
            onChange={handleChange}
            error={validationErrors.mood}
            placeholder="Are you in the mood for something new or a classic?"
          />
          <TextAreaField
            label="Do you wanna have fun or do you want something serious?"
            name="preference"
            value={formData.preference}
            onChange={handleChange}
            error={validationErrors.preference}
            placeholder="Do you wanna have fun or do you want something serious?"
          />
        </fieldset>
        <button
          disabled={isPending}
          type="submit"
          className="btn btn-primary block my-3 mx-auto text-3xl w-full mt-12"
        >
          {currentParticipant === totalParticipants ? 'Get Movie' : 'Next'}
        </button>
        {error && <p className="text-red-500">{error}</p>}
      </form>
    </>
  );
}