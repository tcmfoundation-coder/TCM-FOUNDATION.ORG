import { ApplicationFieldsManager } from "@/components/admin/application-fields-manager";

export default async function AdminApplicationFieldsPage({
  params,
}: PageProps<"/admin/applications/[id]/fields">) {
  const { id } = await params;
  return <ApplicationFieldsManager callForApplicationId={id} />;
}
