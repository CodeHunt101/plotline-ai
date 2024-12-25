'use client'

import React, { useState } from 'react';
import { useActionState } from "react";
import { useRouter } from 'next/navigation';
import { useMovieContext } from '@/contexts/MovieContext';
import { getMovieRecommendation } from '@/lib/utils/movie';
import TextAreaField from '@/components/ui/TextAreaField';

export default function Home() {
  const router = useRouter();
  const { setRecommendation } = useMovieContext();
  const [formData, setFormData] = useState({
    favouriteMovie: '',
    mood: '',
    preference: ''
  });
  
  const [validationErrors, setValidationErrors] = useState({
    favouriteMovie: false,
    mood: false,
    preference: false
  });

  const [error, submitAction, isPending] = useActionState(
    async (_prevState: unknown, formDataObj: FormData) => {
      try {
        // Extract form data
        const favouriteMovie = formDataObj.get('favouriteMovie')?.toString() || '';
        const mood = formDataObj.get('mood')?.toString() || '';
        const preference = formDataObj.get('preference')?.toString() || '';

        // Update local state with current values
        setFormData({
          favouriteMovie,
          mood,
          preference
        });

        const newValidationErrors = {
          favouriteMovie: !favouriteMovie,
          mood: !mood,
          preference: !preference
        };
        
        setValidationErrors(newValidationErrors);

        if (!favouriteMovie || !mood || !preference) {
          throw new Error('Please fill out all fields');
        }

        const recommendedMovie = await getMovieRecommendation(formData)
        console.log({ recommendedMovie });
        
        setRecommendation(recommendedMovie);

        router.push('/recommendations');
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
    // Clear validation error when user starts typing
    if (validationErrors[name as keyof typeof validationErrors]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  return (
    <>
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
          Let&apos;s go
        </button>
        {error && <p className="text-red-500">{error}</p>}
      </form>
    </>
  );
}