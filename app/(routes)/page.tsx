'use client'

import React, { useState } from 'react';
import { useActionState } from "react";
import { useRouter } from 'next/navigation';
import { useMovie } from "../contexts/MovieContext";
import { createEmbedding, getChatCompletion } from '../services/openai';
import { findNearestMatch } from '../services/supabase';

export default function Home() {
  const router = useRouter();
  const { setRecommendation } = useMovie();
  const [formData, setFormData] = useState({
    favoriteMovie: '',
    mood: '',
    preference: ''
  });
  
  const [validationErrors, setValidationErrors] = useState({
    favoriteMovie: false,
    mood: false,
    preference: false
  });

  const [error, submitAction, isPending] = useActionState(
    async (_prevState: unknown, formDataObj: FormData) => {
      try {
        // Extract form data
        const favoriteMovie = formDataObj.get('favoriteMovie')?.toString() || '';
        const mood = formDataObj.get('mood')?.toString() || '';
        const preference = formDataObj.get('preference')?.toString() || '';

        // Update local state with current values
        setFormData({
          favoriteMovie,
          mood,
          preference
        });

        const newValidationErrors = {
          favoriteMovie: !favoriteMovie,
          mood: !mood,
          preference: !preference
        };
        
        setValidationErrors(newValidationErrors);

        if (!favoriteMovie || !mood || !preference) {
          throw new Error('Please fill out all fields');
        }

        const embedding = await createEmbedding(
          `Favorite movie: ${favoriteMovie}\nMood: ${mood}\nPreference: ${preference}`
        );
        const match = await findNearestMatch(embedding);
        const result = await getChatCompletion(
          match,
          `Favorite movie: ${favoriteMovie}\nMood: ${mood}\nPreference: ${preference}`
        ) || 'Sorry, I could not find any relevant information about that.';
        
        setRecommendation({
          favoriteMovie,
          mood,
          preference,
          result
        });
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
          <label className="form-control">
            <div className="label">
              <span className="label-text text-secondary text-base">
                What&apos;s your favorite movie and why?
              </span>
            </div>
            <textarea
              name="favoriteMovie"
              className={`textarea h-24 placeholder-secondary text-sm ${
                validationErrors.favoriteMovie ? 'border-2 border-red-500' : ''
              }`}
              placeholder="What's your favorite movie and why?"
              value={formData.favoriteMovie}
              onChange={handleChange}
            ></textarea>
            {validationErrors.favoriteMovie && (
              <p className="text-red-500 text-sm mt-1">This field is required</p>
            )}
          </label>
          <label className="form-control">
            <div className="label">
              <span className="label-text text-secondary text-base">
                Are you in the mood for something new or a classic?
              </span>
            </div>
            <textarea
              name="mood"
              className={`textarea h-24 placeholder-secondary text-sm ${
                validationErrors.mood ? 'border-2 border-red-500' : ''
              }`}
              placeholder="Are you in the mood for something new or a classic?"
              value={formData.mood}
              onChange={handleChange}
            ></textarea>
            {validationErrors.mood && (
              <p className="text-red-500 text-sm mt-1">This field is required</p>
            )}
          </label>
          <label className="form-control">
            <div className="label">
              <span className="label-text text-secondary text-base">
                Do you wanna have fun or do you want something serious?
              </span>
            </div>
            <textarea
              name="preference"
              className={`textarea h-24 placeholder-secondary text-sm ${
                validationErrors.preference ? 'border-2 border-red-500' : ''
              }`}
              placeholder="Do you wanna have fun or do you want something serious?"
              value={formData.preference}
              onChange={handleChange}
            ></textarea>
            {validationErrors.preference && (
              <p className="text-red-500 text-sm mt-1">This field is required</p>
            )}
          </label>
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