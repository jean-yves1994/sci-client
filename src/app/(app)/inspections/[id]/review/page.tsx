import { ProfessionalReviewPanel } from '@/components/reviews/professional-review-panel';

export default async function ProfessionalReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProfessionalReviewPanel inspectionId={id} />;
}
