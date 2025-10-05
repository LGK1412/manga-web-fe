import ChapterComments from "@/components/comment/ChapterComments";
import { Navbar } from "@/components/navbar";

export default function ChapterRead() {
    return (
        <>
            <Navbar />
            <div className="pt-20">
                <ChapterComments />
            </div>

        </>

    )
}
