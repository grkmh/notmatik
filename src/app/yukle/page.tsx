import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { auth } from "@/auth";
import UploadForm from "./UploadForm";

export default async function Yukle() {
  if (!(await auth())?.user?.id) redirect("/giris");
  return <Shell><UploadForm /></Shell>;
}
