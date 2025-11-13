"use client";

import { use, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";

interface Policy {
  _id: string;
  title: string;
  slug: string;
  mainType: string;
  subCategory: string;
  description: string;
  content: string;
  status: string;
  isPublic: boolean;
  updatedAt?: string;
}

interface Heading {
  id: string;
  text: string;
  type: "subCategory" | "title";
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:3333";

export default function PolicyPage({
  params,
}: {
  params: Promise<{ mainType: string }>;
}) {
  // ✅ Unwrap params Promise (Next.js 15+)
  const { mainType } = use(params);
  const mainTypeUpper = (mainType ?? "").toUpperCase(); // TERM | PRIVACY

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>("");

  const formatSubCategory = (slug: string) => {
    switch (slug) {
      case "account":
        return "Tài khoản và đăng nhập";
      case "comment":
        return "Bình luận và tương tác";
      case "posting":
        return "Đăng truyện và tác quyền";
      case "general":
        return "Điều khoản chung";
      default:
        return slug;
    }
  };

  useEffect(() => {
    if (!mainTypeUpper) return;

    const fetchPolicies = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/policies`, {
          params: { mainType: mainTypeUpper },
        });
        const data: Policy[] = res.data || [];

        // ✅ Nhóm theo subCategory
        const grouped: Record<string, Policy[]> = {};
        data.forEach((item) => {
          if (!grouped[item.subCategory]) grouped[item.subCategory] = [];
          grouped[item.subCategory].push(item);
        });

        // ✅ Tạo TOC
        const toc: Heading[] = [];
        Object.keys(grouped).forEach((sub, i) => {
          toc.push({
            id: `section-${sub}`,
            text: `${i + 1}. ${formatSubCategory(sub)}`,
            type: "subCategory",
          });
          grouped[sub].forEach((p, j) =>
            toc.push({
              id: `policy-${p._id}`,
              text: `${i + 1}.${j + 1} ${p.title}`,
              type: "title",
            })
          );
        });

        setPolicies(data);
        setHeadings(toc);
        setActive(toc[0]?.id || "");
      } catch (err) {
        console.error("Failed to fetch policies:", err);
      }
    };

    fetchPolicies();
  }, [mainTypeUpper]);

  // ✅ Đặt useMemo TRƯỚC mọi early return để giữ thứ tự hook ổn định
  const groupedPolicies = useMemo(() => {
    return policies.reduce((acc, p) => {
      if (!acc[p.subCategory]) acc[p.subCategory] = [];
      acc[p.subCategory].push(p);
      return acc;
    }, {} as Record<string, Policy[]>);
  }, [policies]);

  // (Có thể vẫn return sớm, nhưng hook đã được gọi ổn định trước đó)
  if (!policies.length)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Đang tải hoặc không có chính sách hợp lệ...
      </div>
    );

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">MW</span>
            </div>
            <span className="font-bold text-gray-900">MangaWords</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Quay lại</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar TOC */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase">Mục lục</h3>
                <nav className="space-y-2">
                  {headings.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => {
                        document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth" });
                        setActive(h.id);
                      }}
                      className={`block text-sm transition-colors w-full text-left px-3 py-2 rounded ${
                        active === h.id
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                      style={{ paddingLeft: h.type === "title" ? "28px" : "12px" }}
                    >
                      {h.text}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Support Card */}
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">Cần giúp đỡ?</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Nếu bạn có câu hỏi hoặc thắc mắc về chính sách này, vui lòng liên hệ đội ngũ hỗ trợ MangaWords.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Liên hệ hỗ trợ
                </Link>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="lg:col-span-3">
            <article className="bg-white rounded-lg border border-gray-200 p-8 sm:p-12">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-8">
                {mainTypeUpper === "TERM" ? "Điều khoản sử dụng" : "Chính sách bảo mật"}
              </h1>

              {Object.entries(groupedPolicies).map(([sub, items], i) => (
                <section key={sub} id={`section-${sub}`} className="mb-10">
                  <h2 className="text-2xl font-bold text-blue-700 mb-4">
                    {i + 1}. {formatSubCategory(sub)}
                  </h2>

                  {items.map((p, j) => (
                    <div key={p._id} id={`policy-${p._id}`} className="mb-8 pl-4 border-l border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {i + 1}.{j + 1} {p.title}
                      </h3>
                      {p.description && <p className="text-sm text-gray-500 mb-2">{p.description}</p>}
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">{p.content}</p>
                    </div>
                  ))}
                </section>
              ))}
            </article>
          </main>
        </div>
      </div>
    </div>
  );
}
