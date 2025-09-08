"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Eye } from "lucide-react"
import Link from "next/link"
import type { Story } from "@/lib/types"

interface StoryCarouselProps {
  stories: Story[]
  title: string
}

export function StoryCarousel({ stories, title }: StoryCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying || stories.length === 0) return
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % stories.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [stories.length, isAutoPlaying])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
  }

  if (stories.length === 0) return null

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8 text-center">{title}</h2>

        <div className="relative max-w-4xl mx-auto">
          {/* Main Carousel */}
          <div className="relative overflow-hidden rounded-lg">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {stories.map((story) => (
                <div key={story.id} className="w-full flex-shrink-0">
                  <Link href={`/story/${story.id}`}>
                    <Card className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
                      <div className="relative h-96 md:h-80">
                        <img
                          src={story.coverImage || "/placeholder.svg?height=640&width=480&query=story-cover"}
                          alt={story.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                        {/* Story Info Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="bg-white/20 text-white">
                              #{currentIndex + 1}
                            </Badge>
                            <Badge variant={story.status === "completed" ? "default" : "secondary"}>
                              {story.status}
                            </Badge>
                          </div>

                          <h3 className="text-2xl font-bold mb-2 line-clamp-1">{story.title}</h3>
                          <p className="text-sm text-gray-200 mb-2">by {story.author.name}</p>
                          <p className="text-sm text-gray-300 mb-4 line-clamp-2">{story.description}</p>

                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span>{story.rating}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              <span>{story.viewsCount.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {story.genre.slice(0, 2).map((g) => (
                                <Badge
                                  key={g}
                                  variant="outline"
                                  className="text-xs bg-white/10 text-white border-white/20"
                                >
                                  {g}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center mt-6 gap-2">
            {stories.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex ? "bg-primary" : "bg-gray-300"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
