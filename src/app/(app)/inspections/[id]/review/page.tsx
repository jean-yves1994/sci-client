'use client';

import { useParams } from 'next/navigation';
import { ReviewerReviewWorkspace } from '@/components/reviews/reviewer-review-workspace';

export default function ProfessionalReviewPage() {
  const params = useParams<{ id: string }>();
  return <ReviewerReviewWorkspace inspectionId={params.id} />;
}
