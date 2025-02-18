'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const LOCATIONS = [
  'Irvine/Costa Mesa/John Wayne Airport',
  'Tustin',
  'Downtown Santa Ana',
  'Irvine Spectrum',
  'Buena Park/Fullerton/Brea'
];

const surveySchema = z.object({
  name: z.string().min(2, "Name is required and must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  department: z.string().optional(),
  meetingPreference: z.array(z.enum(['lunch', 'dinner'])).min(1, "Please select at least one meal preference"),
  timePreference: z.array(z.enum(['weekdays', 'weekends'])).min(1, "Please select at least one time preference"),
  useDifferentMealLocations: z.boolean().optional().default(false),
  useDifferentTimeLocations: z.boolean().optional().default(false),
  // For single location preferences
  locations: z.array(z.string()).min(1, "Please select at least one location"),
  // For meal-specific locations
  lunchLocations: z.array(z.string()).optional(),
  dinnerLocations: z.array(z.string()).optional(),
  // For time-specific locations
  weekdayLocations: z.array(z.string()).optional(),
  weekendLocations: z.array(z.string()).optional()
}).refine((data) => {
  if (!data.useDifferentMealLocations && !data.useDifferentTimeLocations) {
    return data.locations.length > 0;
  }
  if (data.useDifferentMealLocations) {
    if (data.meetingPreference.includes('lunch') && (!data.lunchLocations || data.lunchLocations.length === 0)) {
      return false;
    }
    if (data.meetingPreference.includes('dinner') && (!data.dinnerLocations || data.dinnerLocations.length === 0)) {
      return false;
    }
  }
  if (data.useDifferentTimeLocations) {
    if (data.timePreference.includes('weekdays') && (!data.weekdayLocations || data.weekdayLocations.length === 0)) {
      return false;
    }
    if (data.timePreference.includes('weekends') && (!data.weekendLocations || data.weekendLocations.length === 0)) {
      return false;
    }
  }
  return true;
}, {
  message: "Please select at least one location for each selected preference"
});

type SurveyFormData = z.infer<typeof surveySchema>;

export default function SurveyForm() {
  const { 
    register, 
    handleSubmit, 
    watch,
    formState: { errors } 
  } = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      meetingPreference: [],
      timePreference: [],
      locations: [],
      lunchLocations: [],
      dinnerLocations: [],
      weekdayLocations: [],
      weekendLocations: [],
      useDifferentMealLocations: false,
      useDifferentTimeLocations: false
    }
  });

  const meetingPreference = watch('meetingPreference');
  const timePreference = watch('timePreference');
  const useDifferentMealLocations = watch('useDifferentMealLocations');
  const useDifferentTimeLocations = watch('useDifferentTimeLocations');

  const bothMealsSelected = meetingPreference?.includes('lunch') && meetingPreference?.includes('dinner');
  const bothTimesSelected = timePreference?.includes('weekdays') && timePreference?.includes('weekends');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const onSubmit = async (data: SurveyFormData) => {
    setIsSubmitting(true);
    try {
      console.log('Submitting form data:', data);
      
      const { db } = await import('@/lib/firebase');
      const { collection, addDoc } = await import('firebase/firestore');
      
      const surveyRef = collection(db, 'survey-responses');
      const docRef = await addDoc(surveyRef, {
        ...data,
        submittedAt: new Date()
      });
      
      console.log('Document written with ID:', docRef.id);
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
      <div className="max-w-md mx-auto p-8 text-center">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-green-600 mb-4">
            Thank you for submitting your preferences!
          </h2>
          <p className="text-gray-600 mb-6">
            We&apos;ll use your preferences to match you with networking opportunities that work best for you.
          </p>
          <p className="text-gray-600">
            You&apos;ll receive an email when your group has been formed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto space-y-6 p-6">
      {/* Name Input */}
      <div>
        <label className="block mb-2 font-medium">
          Name <span className="text-red-500">*</span>
        </label>
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
        <label className="block mb-2 font-medium">
          Email <span className="text-red-500">*</span>
        </label>
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

      {/* Meeting Preference */}
      <div>
        <label className="block mb-2 font-medium">
          Meeting Preference <span className="text-red-500">*</span>
        </label>
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

      {/* Time Preference */}
      <div>
        <label className="block mb-2 font-medium">
          Time Preference <span className="text-red-500">*</span>
        </label>
        <div className="space-x-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              value="weekdays"
              {...register('timePreference')}
              className="mr-2"
            />
            <span>Weekdays</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              value="weekends"
              {...register('timePreference')}
              className="mr-2"
            />
            <span>Weekends</span>
          </label>
        </div>
        {errors.timePreference && (
          <p className="text-red-500 text-sm mt-1">{errors.timePreference.message}</p>
        )}
      </div>

      {/* Different Locations Options */}
      {(bothMealsSelected || bothTimesSelected) && (
        <div className="space-y-2">
          {bothMealsSelected && (
            <div>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  {...register('useDifferentMealLocations')}
                  className="mr-2"
                />
                <span>Use different locations for lunch and dinner</span>
              </label>
            </div>
          )}
          {bothTimesSelected && (
            <div>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  {...register('useDifferentTimeLocations')}
                  className="mr-2"
                />
                <span>Use different locations for weekdays and weekends</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Location Preferences */}
      {!useDifferentMealLocations && !useDifferentTimeLocations && (
        <div>
          <label className="block mb-2 font-medium">
            Preferred Locations <span className="text-red-500">*</span>
          </label>
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

      {/* Meal-specific Locations */}
      {useDifferentMealLocations && (
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
            </div>
          )}
        </>
      )}

      {/* Time-specific Locations */}
      {useDifferentTimeLocations && (
        <>
          {timePreference?.includes('weekdays') && (
            <div>
              <label className="block mb-2 font-medium">Weekday Locations</label>
              <div className="grid grid-cols-1 gap-2">
                {LOCATIONS.map((location) => (
                  <label key={location} className="flex items-center p-2 rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      value={location}
                      {...register('weekdayLocations')}
                      className="mr-3"
                    />
                    <span>{location}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {timePreference?.includes('weekends') && (
            <div>
              <label className="block mb-2 font-medium">Weekend Locations</label>
              <div className="grid grid-cols-1 gap-2">
                {LOCATIONS.map((location) => (
                  <label key={location} className="flex items-center p-2 rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      value={location}
                      {...register('weekendLocations')}
                      className="mr-3"
                    />
                    <span>{location}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Submit Button */}
      <button 
        type="submit" 
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
      >
        Submit Survey
      </button>
    </form>
  );
}
