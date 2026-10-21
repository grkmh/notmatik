import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { auth } from "@/auth";
import UploadForm from "./UploadForm";

export default async function Yukle() {
  if (!(await auth())?.user?.id) redirect("/giris");
  const maxBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 26214400);
  return <Shell><UploadForm maxBytes={maxBytes} /></Shell>;
}
