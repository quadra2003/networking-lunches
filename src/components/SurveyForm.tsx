'use client';

import React, { useState } from 'react';
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
  useDifferentMealLocations: z.boolean().default(false),
  useDifferentTimeLocations: z.boolean().default(false),
  locations: z.array(z.string()),
  lunchLocations: z.array(z.string()).default([]),
  dinnerLocations: z.array(z.string()).default([]),
  weekdayLocations: z.array(z.string()).default([]),
  weekendLocations: z.array(z.string()).default([])
}).refine((data) => {
  if (!data.useDifferentMealLocations && !data.useDifferentTimeLocations) {
    return data.locations.length > 0;
  }

  if (data.useDifferentTimeLocations) {
    // Check weekday locations if weekdays are selected
    if (data.timePreference.includes('weekdays')) {
      if (data.weekdayLocations.length === 0) {
        return false;
      }
    }
    
    // Check weekend locations if weekends are selected
    if (data.timePreference.includes('weekends')) {
      if (data.weekendLocations.length === 0) {
        return false;
      }
    }
  }

  return true;
}, {
  message: "Please select at least one location for each selected preference"
});

type SurveyFormData = z.infer<typeof surveySchema>;

const steps = [
  {
    title: "Basic Information",
    description: "Your contact details"
  },
  {
    title: "Meeting Preferences",
    description: "When you'd like to meet"
  },
  {
    title: "Location Preferences",
    description: "Where you'd like to meet"
  }
];

export default function SurveyForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { 
    register, 
    handleSubmit, 
    watch,
    formState: { errors } 
  } = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    mode: "onChange",
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

  const onSubmit = async (data: SurveyFormData) => {
    console.log('Submit attempt:', {
      timePreference: data.timePreference,
      useDifferentTimeLocations: data.useDifferentTimeLocations,
      weekdayLocations: data.weekdayLocations,
      weekendLocations: data.weekendLocations
    });
    setIsSubmitting(true);
    try {
        const { db } = await import('@/lib/firebase');
        const { collection, addDoc } = await import('firebase/firestore');
        
        // Prevent default form behavior
        // e.preventDefault();
        
        const surveyRef = collection(db, 'survey-responses');
        await addDoc(surveyRef, {
          ...data,
          submittedAt: new Date()
        });
        
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

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
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
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
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
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {(bothMealsSelected || bothTimesSelected) && (
              <div className="space-y-2 bg-gray-50 p-4 rounded">
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
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit((data) => {
      console.log('Form submitted', data);
      onSubmit(data);
    })}>
      <div className="max-w-2xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex justify-between mb-4">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className={`flex-1 text-center ${
                index === currentStep
                  ? 'text-blue-600'
                  : index < currentStep
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <div className="h-1 w-full bg-gray-200 absolute top-4 left-0" />
                <div
                  className={`h-1 absolute top-4 left-0 transition-all duration-500 ${
                    index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  style={{ width: index <= currentStep ? '100%' : '0%' }}
                />
                <div
                  className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center relative z-10 ${
                    index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index < currentStep ? '✓' : index + 1}
                </div>
              </div>
              <div className="mt-2 text-sm font-medium">{step.title}</div>
              <div className="text-xs text-gray-500">{step.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        {renderStepContent(currentStep)}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={() => setCurrentStep(current => current - 1)}
          disabled={currentStep === 0 || isSubmitting}
          className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {currentStep === steps.length - 1 ? (
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentStep(current => current + 1)}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            Next
          </button>
        )}    
        
      </div>
    </div>
      </form>
  );
}
