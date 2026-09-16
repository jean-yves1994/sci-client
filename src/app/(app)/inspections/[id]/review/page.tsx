import { AdminInspectionEditor } from '@/components/reviews/admin-inspection-editor';
import { ProfessionalReviewPanel } from '@/components/reviews/professional-review-panel';

export default async function ProfessionalReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="space-y-4"><ProfessionalReviewPanel inspectionId={id} /><AdminInspectionEditor inspectionId={id} /></div>;
}
