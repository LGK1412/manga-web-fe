"use client";

import { useEffect, useState, useLayoutEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Star, BookOpen, Eye, Clock, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

interface Genre {
  _id: string;
  name: string;
}

interface Style {
  _id: string;
  name: string;
}

interface LatestChapter {
  title: string;
  order: number;
  createdAt: string;
}

interface Manga {
  _id: string;
  title: string;
  summary: string;
  coverImage: string;
  styles: Style[];
  genres: Genre[];
  status: string;
  views: number;
  rating_avg: number;
  chapters_count: number;
  latest_chapter?: LatestChapter;
}

export default function StoryRecomment() {
  const [userId, setUserId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Manga[]>([]);
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  // Get userId from cookie
  useLayoutEffect(() => {
    const raw = Cookies.get("user_normal_info");
    if (raw) {
      try {
        const decoded = decodeURIComponent(raw);
        const parsed = JSON.parse(decoded);
        setUserId(parsed.user_id);
      } catch {
        console.error("Invalid cookie data");
      }
    }
  }, []);

  // Fetch recommendation list when userId is available
  useEffect(() => {
    if (userId) {
      const fetchRecommendations = async () => {
        setLoading(true);
        try {
          const res = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/manga/recomment/user/${userId}`
          );
          setRecommendations(res.data?.data || []);

        } catch (err) {
          console.error("Error fetching recommendations", err);
        } finally {
          setLoading(false);
        }
      };
      fetchRecommendations();
    }
  }, [userId]);

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return (views / 1000000).toFixed(1) + "M";
    } else if (views >= 1000) {
      return (views / 1000).toFixed(1) + "K";
    }
    return views.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === "dark" ? "bg-[#1F1F1F]" : "bg-white"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-600 font-medium">Loading personalized story recommendations for you...</span>
            </div>
          </div>

          {/* Loading skeleton */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="h-64 bg-gray-200 animate-pulse"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="flex space-x-2">
                    <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div

          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-4">
            <TrendingUp className="h-8 w-8 text-blue-500 dark:text-blue-400 mr-3" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Recommendation</h2>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Discover amazing titles selected specifically for your reading taste.
          </p>
          <div className="mt-4 h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto"></div>
        </motion.div>

        {/* Manga Horizontal Scroll */}
        <div className="flex gap-4 overflow-x-auto py-4 flex-nowrap snap-x snap-mandatory no-scrollbar">

          {recommendations.map((manga) => (
            <motion.div
              key={manga._id}
              onClick={() => router.push(`/story/${manga._id}`)}
              className={`w-48 flex-shrink-0 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer snap-start
              ${theme === "dark" ? "bg-gray-800 text-gray-100" : "bg-gray-100 text-gray-900"}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Cover Image */}
              <div className="relative overflow-hidden">
                <div className="aspect-[3/4] relative">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL}/assets/coverImages/${manga.coverImage}`}
                    alt={manga.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>

                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                  ${manga.status === 'Đang cập nhật'
                      ? (theme === "dark" ? 'bg-green-700 text-green-200' : 'bg-green-100 text-green-800')
                      : (theme === "dark" ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800')}`}>
                    {manga.status === 'Đang cập nhật' ? 'Ongoing' : manga.status}
                  </span>
                </div>

                {/* Rating */}
                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span className="text-white text-xs font-semibold">{manga.rating_avg.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                  {manga.title}
                </h3>
                <div className="flex flex-wrap gap-1 mb-3">
                  {manga.genres.slice(0, 2).map((genre) => (
                    <span key={genre._id} className={`inline-block px-2 py-1 text-xs rounded-md font-medium
                    ${theme === "dark" ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                      {genre.name}
                    </span>
                  ))}
                  {manga.genres.length > 2 && (
                    <span className={`inline-block px-2 py-1 text-xs rounded-md font-medium
                    ${theme === "dark" ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                      +{manga.genres.length - 2}
                    </span>
                  )}
                </div>
                {/* <p className="text-sm mb-4 line-clamp-2 leading-relaxed">{manga.summary}</p> */}
                <div className="flex items-center justify-between text-sm mb-3">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{formatViews(manga.views)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{manga.chapters_count} chapters</span>
                  </div>
                </div>

                {manga.latest_chapter && (
                  <div className={`border-t pt-3 ${theme === "dark" ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-start space-x-2">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {/* <p className="text-sm font-medium truncate">{manga.latest_chapter.title}</p> */}
                        <p className="text-xs">{formatDate(manga.latest_chapter.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}