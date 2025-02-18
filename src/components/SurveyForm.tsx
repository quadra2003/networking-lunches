// src/components/SurveyForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Survey Form Schema
const surveySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  department: z.string().optional(),
  availableDays: z.array(z.string()).min(1, "Select at least one day"),
  workLocation: z.enum(['In-Office', 'Remote', 'Hybrid']),
  professionalInterests: z.array(z.string()).optional()
});

type SurveyFormData = z.infer<typeof surveySchema>;

export default function SurveyForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema)
  });

  const onSubmit = async (data: SurveyFormData) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement actual submission logic
      console.log(data);
      setSubmitSuccess(true);
    } catch (error) {
      console.error('Survey submission error:', error);
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
        <p className="mt-4">We&apos;ll be in touch about your networking lunch group.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto space-y-4 p-6">
      {/* Name Input */}
      <div>
        <label className="block mb-2">Name</label>
        <input 
          {...register('name')}
          className="w-full px-3 py-2 border rounded"
          placeholder="Your full name"
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Email Input */}
      <div>
        <label className="block mb-2">Email</label>
        <input 
          {...register('email')}
          type="email"
          className="w-full px-3 py-2 border rounded"
          placeholder="your.email@company.com"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Work Location */}
      <div>
        <label className="block mb-2">Work Location</label>
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
          <p className="text-red-500 text-sm mt-1">
            {errors.workLocation.message}
          </p>
        )}
      </div>

      {/* Available Days */}
      <div>
        <label className="block mb-2">Available Days</label>
        <div className="space-y-2">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
            <label key={day} className="inline-flex items-center">
              <input
                type="checkbox"
                value={day}
                {...register('availableDays')}
                className="mr-2"
              />
              {day}
            </label>
          ))}
        </div>
        {errors.availableDays && (
          <p className="text-red-500 text-sm mt-1">
            {errors.availableDays.message}
          </p>
        )}
      </div>

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