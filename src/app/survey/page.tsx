// src/app/survey/page.tsx
import SurveyForm from '@/components/SurveyForm';

export default function SurveyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          Networking Lunch Survey
        </h1>
        <div className="bg-white rounded-lg shadow">
          <SurveyForm />
        </div>
      </div>
    </div>
  );
}
