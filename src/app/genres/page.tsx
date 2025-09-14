"use client"

import { Navbar } from "@/components/navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { BookOpen, Tag } from "lucide-react"

export default function GenresPage() {
  // // Hàm để đếm số lượng truyện cho mỗi thể loại
  // const getStoryCountByGenre = (genre: string) => {
  //   return mockStories.filter((story) => story.genre.includes(genre)).length
  // }

  // return (
  //   <div className="min-h-screen bg-background">
  //     <Navbar />

  //     <div className="container mx-auto px-4 py-8 pt-20">
  //       {" "}
  //       {/* Changed pt-16 to pt-20 */}
  //       <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
  //         <Tag className="h-8 w-8" /> Explore Genres
  //       </h1>
  //       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
  //         {availableGenres.map((genre) => (
  //           <Link key={genre} href={`/stories?genre=${encodeURIComponent(genre)}`} className="block">
  //             <Card className="h-full hover:shadow-lg transition-shadow">
  //               <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
  //                 <BookOpen className="h-12 w-12 text-primary mb-4" />
  //                 <h2 className="text-xl font-semibold mb-2">{genre}</h2>
  //                 <p className="text-sm text-muted-foreground">{getStoryCountByGenre(genre)} stories</p>
  //                 <Badge variant="outline" className="mt-4">
  //                   View Stories
  //                 </Badge>
  //               </CardContent>
  //             </Card>
  //           </Link>
  //         ))}
  //       </div>
  //       {availableGenres.length === 0 && (
  //         <div className="text-center py-12">
  //           <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
  //           <h3 className="text-lg font-semibold mb-2">No genres found</h3>
  //           <p className="text-muted-foreground">It looks like there are no genres defined yet.</p>
  //         </div>
  //       )}
  //     </div>
  //   </div>
  // )
}
