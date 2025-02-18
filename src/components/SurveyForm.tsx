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

const AVAILABILITY_OPTIONS = [
  'Weekday Lunch',
  'Weekday Dinner',
  'Weekend Lunch',
  'Weekend Dinner'
] as const;

const surveySchema = z.object({
  name: z.string().min(2, "Name is required and must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  department: z.string().optional(),
  availability: z.array(z.enum(AVAILABILITY_OPTIONS)).min(1, "Please select at least one availability option"),
  useSeparateLocations: z.boolean().default(false),
  // For single location preference
  locations: z.array(z.string()),
  // For separate location preferences
  weekdayLunchLocations: z.array(z.string()).default([]),
  weekdayDinnerLocations: z.array(z.string()).default([]),
  weekendLunchLocations: z.array(z.string()).default([]),
  weekendDinnerLocations: z.array(z.string()).default([])
}).refine((data) => {
  if (!data.useSeparateLocations) {
    return data.locations.length > 0;
  }

  const hasValidLocations = data.availability.every(option => {
    switch (option) {
      case 'Weekday Lunch':
        return data.weekdayLunchLocations.length > 0;
      case 'Weekday Dinner':
        return data.weekdayDinnerLocations.length > 0;
      case 'Weekend Lunch':
        return data.weekendLunchLocations.length > 0;
      case 'Weekend Dinner':
        return data.weekendDinnerLocations.length > 0;
      default:
        return false;
    }
  });

  return hasValidLocations;
}, {
  message: "Please select at least one location for each availability option"
});

type SurveyFormData = z.infer<typeof surveySchema>;

const steps = [
  {
    title: "Basic Information",
    description: "Your contact details"
  },
  {
    title: "Meeting Availability",
    description: "When you can meet"
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
    defaultValues: {
      availability: [],
      locations: [],
      useSeparateLocations: false,
      weekdayLunchLocations: [],
      weekdayDinnerLocations: [],
      weekendLunchLocations: [],
      weekendDinnerLocations: []
    }
  });

  const selectedAvailability = watch('availability');
  const useSeparateLocations = watch('useSeparateLocations');

  const onSubmit = async (data: SurveyFormData) => {
    console.log('Submit attempt:', data);
    setIsSubmitting(true);
    try {
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
                Meeting Availability <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {AVAILABILITY_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center p-2 rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      value={option}
                      {...register('availability')}
                      className="mr-3"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {errors.availability && (
                <p className="text-red-500 text-sm mt-1">{errors.availability.message}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {selectedAvailability.length > 1 && (
              <div>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    {...register('useSeparateLocations')}
                    className="mr-2"
                  />
                  <span>Specify locations for each meeting type</span>
                </label>
              </div>
            )}

            {!useSeparateLocations && (
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

            {useSeparateLocations && (
              <div className="space-y-8">
                {selectedAvailability.map((option) => (
                  <div key={option}>
                    <label className="block mb-2 font-medium">
                      {option} Locations <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {LOCATIONS.map((location) => (
                        <label key={location} className="flex items-center p-2 rounded hover:bg-gray-50">
                          <input
                            type="checkbox"
                            value={location}
                            {...register(
                              option === 'Weekday Lunch' 
                                ? 'weekdayLunchLocations' 
                                : option === 'Weekday Dinner'
                                ? 'weekdayDinnerLocations'
                                : option === 'Weekend Lunch'
                                ? 'weekendLunchLocations'
                                : 'weekendDinnerLocations'
                            )}
                            className="mr-3"
                          />
                          <span>{location}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
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
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              const currentStepValid = currentStep === 0 
                ? Boolean(watch('name') && watch('email'))
                : currentStep === 1 
                ? selectedAvailability.length > 0
                : true;
              
              if (currentStepValid) {
                setCurrentStep(current => current + 1);
              }
            }}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
