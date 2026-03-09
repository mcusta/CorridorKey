import Navbar from "@/components/Navbar";
import NewJobForm from "@/components/NewJobForm";

export default function NewJobPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold mb-6">New Job</h1>
        <NewJobForm />
      </main>
    </>
  );
}
