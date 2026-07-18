import { redirect } from "next/navigation";

export default function ArchivedReviewPersonasPage() {
  redirect("/admin/reviews?status=ai-reviews-disabled");
}
