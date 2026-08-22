import { ApplicationSubmissionsList } from "@/components/admin/application-submissions-list";

export default async function AdminApplicationSubmissionsPage({
  params,
}: PageProps<"/admin/applications/[id]/submissions">) {
  const { id } = await params;
  return <ApplicationSubmissionsList callForApplicationId={id} />;
}
