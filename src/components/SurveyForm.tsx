'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const LOCATIONS = [
  'Irvine/John Wayne Airport',
  'Tustin',
  'Downtown Santa Ana',
  'Irvine Spectrum',
  'Buena Park/Fullerton/Brea'
];

const locationSchema = z.array(z.string()).min(1, "Select at least one location");

const surveySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  department: z.string().optional(),
  workLocation: z.enum(['In-Office', 'Remote', 'Hybrid']),
  meetingPreference: z.array(z.enum(['lunch', 'dinner'])).min(1, "Select at least one meeting time"),
  useDifferentLocations: z.boolean().optional(),
  locations: locationSchema,
  lunchLocations: locationSchema.optional(),
  dinnerLocations: locationSchema.optional()
});

type SurveyFormData = z.infer<typeof surveySchema>;

export default function SurveyForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showDifferentLocations, setShowDifferentLocations] = useState(false);

  const { 
    register, 
    handleSubmit, 
    watch,
    formState: { errors } 
  } = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      useDifferentLocations: false,
      meetingPreference: [],
      locations: [],
      lunchLocations: [],
      dinnerLocations: []
    }
  });

  const meetingPreference = watch('meetingPreference');
  const useDifferentLocations = watch('useDifferentLocations');
  const bothMealsSelected = meetingPreference?.includes('lunch') && meetingPreference?.includes('dinner');

  const onSubmit = async (data: SurveyFormData) => {
    setIsSubmitting(true);
    try {
      console.log('Submitting form data:', data);
      
      const { db } = await import('@/lib/firebase');
      const { collection, addDoc, getDocs, query, where } = await import('firebase/firestore');
      
      const surveyRef = collection(db, 'survey-responses');
      const docRef = await addDoc(surveyRef, {
        ...data,
        submittedAt: new Date()
      });
      
      console.log('Document written with ID:', docRef.id);
      
      const verifyQuery = query(surveyRef, where('email', '==', data.email));
      const querySnapshot = await getDocs(verifyQuery);
      
      if (!querySnapshot.empty) {
        console.log('Submission verified in Firestore:', 
          querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        );
      }
      
      setSubmitSuccess(true);
    } catch (error) {
      console.error('Survey submission error:', error);
      alert('There was an error submitting your survey. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-green-600">
          Thank you for submitting your survey!
        </h2>
        <p className="mt-4">We&apos;ll be in touch about your networking group.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto space-y-6 p-6">
      {/* Name Input */}
      <div>
        <label className="block mb-2 font-medium">Name</label>
        <input 
          {...register('name')}
          className="w-full px-3 py-2 border rounded"
          placeholder="Your full name"
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Email Input */}
      <div>
        <label className="block mb-2 font-medium">Email</label>
        <input 
          {...register('email')}
          type="email"
          className="w-full px-3 py-2 border rounded"
          placeholder="your.email@company.com"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Work Location */}
      <div>
        <label className="block mb-2 font-medium">Work Location</label>
        <select 
          {...register('workLocation')}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="">Select Work Location</option>
          <option value="In-Office">In-Office</option>
          <option value="Remote">Remote</option>
          <option value="Hybrid">Hybrid</option>
        </select>
        {errors.workLocation && (
          <p className="text-red-500 text-sm mt-1">{errors.workLocation.message}</p>
        )}
      </div>

      {/* Meeting Preference */}
      <div>
        <label className="block mb-2 font-medium">Meeting Preference</label>
        <div className="space-x-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              value="lunch"
              {...register('meetingPreference')}
              className="mr-2"
            />
            <span>Lunch</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              value="dinner"
              {...register('meetingPreference')}
              className="mr-2"
            />
            <span>Dinner</span>
          </label>
        </div>
        {errors.meetingPreference && (
          <p className="text-red-500 text-sm mt-1">{errors.meetingPreference.message}</p>
        )}
      </div>

      {/* Different Locations Option */}
      {bothMealsSelected && (
        <div>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              {...register('useDifferentLocations')}
              className="mr-2"
            />
            <span>Use different geographical preferences for lunch and dinner</span>
          </label>
        </div>
      )}

      {/* Location Preferences */}
      {!useDifferentLocations && (
        <div>
          <label className="block mb-2 font-medium">Preferred Locations</label>
          <div className="grid grid-cols-1 gap-2">
            {LOCATIONS.map((location) => (
              <label key={location} className="flex items-center p-2 rounded hover:bg-gray-50">
                <input
                  type="checkbox"
                  value={location}
                  {...register('locations')}
                  className="mr-3"
                />
                <span>{location}</span>
              </label>
            ))}
          </div>
          {errors.locations && (
            <p className="text-red-500 text-sm mt-1">{errors.locations.message}</p>
          )}
        </div>
      )}

      {/* Separate Lunch and Dinner Locations */}
      {useDifferentLocations && (
        <>
          {meetingPreference?.includes('lunch') && (
            <div>
              <label className="block mb-2 font-medium">Lunch Locations</label>
              <div className="grid grid-cols-1 gap-2">
                {LOCATIONS.map((location) => (
                  <label key={location} className="flex items-center p-2 rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      value={location}
                      {...register('lunchLocations')}
                      className="mr-3"
                    />
                    <span>{location}</span>
                  </label>
                ))}
              </div>
              {errors.lunchLocations && (
                <p className="text-red-500 text-sm mt-1">{errors.lunchLocations.message}</p>
              )}
            </div>
          )}

          {meetingPreference?.includes('dinner') && (
            <div>
              <label className="block mb-2 font-medium">Dinner Locations</label>
              <div className="grid grid-cols-1 gap-2">
                {LOCATIONS.map((location) => (
                  <label key={location} className="flex items-center p-2 rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      value={location}
                      {...register('dinnerLocations')}
                      className="mr-3"
                    />
                    <span>{location}</span>
                  </label>
                ))}
              </div>
              {errors.dinnerLocations && (
                <p className="text-red-500 text-sm mt-1">{errors.dinnerLocations.message}</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Submit Button */}
      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Survey'}
      </button>
    </form>
  );
}
