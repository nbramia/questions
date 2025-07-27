'use client';

interface WhyThisQuestionProps {
  rationale: string;
}

export function WhyThisQuestion({ rationale }: WhyThisQuestionProps) {
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-blue-900 mb-1">
            Why this question?
          </h4>
          <p className="text-sm text-blue-800">
            {rationale}
          </p>
        </div>
      </div>
    </div>
  );
}
