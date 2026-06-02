import { redirect } from "next/navigation";

export default function NewListingRedirect() {
  redirect("/dashboard/listings/new");
}
