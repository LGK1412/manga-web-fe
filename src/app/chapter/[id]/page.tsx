import ChapterContent from "@/components/ChapterContent";
import ChapterNavigation from "@/components/ChapterNavigation";
import ChapterProgress from "@/components/ChapterProgress";
import ChapterComments from "@/components/comment/ChapterComments";
import { Navbar } from "@/components/navbar";

export default function ChapterRead() {
  return (
    <>
      <Navbar />
      <div className="pt-20">
        <ChapterContent />
        <ChapterNavigation />
        <ChapterProgress />
        <ChapterComments />
      </div>
    </>
  );
}
