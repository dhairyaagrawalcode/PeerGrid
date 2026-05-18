import Sidebar from "@/app/components/layout/sidebar";
import Navbar from "@/app/components/layout/navbar";
import { notFound } from "next/navigation";
import { colleges } from "@/app/data/collages_dummy_data";
import CollegeDetailPage from "@/app/colleges/collagedeatil";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function page({ params }: PageProps) {
  const resolvedParams = await params;
  const currentUrlId = resolvedParams.id;

  const targetCollege = colleges.find((item) => item.id === currentUrlId);

  if (!targetCollege) {
    notFound();
  }
  return (
    <div>
      <Navbar />
      <div className="bg-bg text-font flex justify-center py-20">
        <div className="flex justify-between xl:w-2/3 w-full gap-3 mx-4">
          <Sidebar />
          <CollegeDetailPage
            key={targetCollege.id}
            renderdata={targetCollege}
          />
        </div>
      </div>
    </div>
  );
}
