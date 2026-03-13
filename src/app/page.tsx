import Link from "next/link";
import { ArrowRight, BarChart3, LineChart, Sparkles, TrendingUp, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFC] text-[#1A1A1A] font-sans selection:bg-stone-200">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 border-b border-neutral-200 bg-[#FDFDFC]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight font-serif">TubeInsight</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">
              로그인
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-stone-800 hover:shadow-lg"
            >
              대시보드로 이동
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm font-medium text-stone-600 shadow-sm mb-8">
            <Sparkles className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span>AI 기반 유튜브 성과 분석 솔루션</span>
          </div>
          
          <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.15] tracking-tight font-serif sm:text-7xl mb-8 text-[#1A1A1A]">
            유튜브 알고리즘, <br />
            <span className="italic text-stone-500">감으로 하지 마세요.</span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg text-stone-600 leading-relaxed mb-10">
            데이터로 증명된 떡상 공식을 찾아드립니다. <br />
            실시간 트렌드 분석부터 내 채널의 숨은 기회까지, 튜브인사이트와 함께하세요.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-20">
            <Link
              href="/dashboard"
              className="group relative flex h-14 items-center justify-center gap-2 overflow-hidden rounded-full bg-stone-900 px-8 text-lg font-bold text-white shadow-xl transition-all hover:bg-black hover:scale-105"
            >
              <span className="relative z-10">무료로 내 채널 분석하기</span>
              <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="text-sm text-stone-500 mt-4 sm:mt-0 sm:ml-4">
              * 신용카드 등록 없이 즉시 시작 가능
            </p>
          </div>

          {/* Dashboard Mockup */}
          <div className="relative mx-auto max-w-6xl rounded-2xl border border-stone-200 bg-white p-2 shadow-2xl sm:p-4">
            <div className="absolute top-0 left-1/2 h-1.5 w-1/3 -translate-x-1/2 rounded-b-xl bg-stone-100/50"></div>
            <div className="overflow-hidden rounded-xl border border-stone-100 bg-stone-50">
              {/* Mockup Header */}
              <div className="flex items-center gap-4 border-b border-stone-200 bg-white px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400"></div>
                  <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                  <div className="h-3 w-3 rounded-full bg-green-400"></div>
                </div>
                <div className="h-6 flex-1 rounded-md bg-stone-100"></div>
              </div>
              
              {/* Mockup Body */}
              <div className="flex h-[400px] sm:h-[600px]">
                {/* Mockup Sidebar */}
                <div className="hidden w-64 flex-col border-r border-stone-200 bg-white p-4 sm:flex">
                  <div className="mb-6 h-8 w-32 rounded-lg bg-stone-200"></div>
                  <div className="space-y-3">
                    <div className="h-10 w-full rounded-lg bg-stone-100"></div>
                    <div className="h-10 w-full rounded-lg bg-white"></div>
                    <div className="h-10 w-full rounded-lg bg-white"></div>
                  </div>
                </div>
                
                {/* Mockup Content */}
                <div className="flex-1 p-6 bg-[#F5F5F4]">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="h-8 w-48 rounded-lg bg-stone-200"></div>
                    <div className="h-10 w-32 rounded-lg bg-stone-200"></div>
                  </div>
                  
                  <div className="grid gap-6 sm:grid-cols-3">
                    {/* Card 1 */}
                    <div className="rounded-xl bg-white p-6 shadow-sm">
                      <div className="mb-4 h-10 w-10 rounded-full bg-amber-100"></div>
                      <div className="mb-2 h-4 w-24 rounded bg-stone-100"></div>
                      <div className="h-8 w-32 rounded bg-stone-200"></div>
                    </div>
                     {/* Card 2 */}
                     <div className="rounded-xl bg-white p-6 shadow-sm">
                      <div className="mb-4 h-10 w-10 rounded-full bg-blue-100"></div>
                      <div className="mb-2 h-4 w-24 rounded bg-stone-100"></div>
                      <div className="h-8 w-32 rounded bg-stone-200"></div>
                    </div>
                     {/* Card 3 */}
                     <div className="rounded-xl bg-white p-6 shadow-sm">
                      <div className="mb-4 h-10 w-10 rounded-full bg-green-100"></div>
                      <div className="mb-2 h-4 w-24 rounded bg-stone-100"></div>
                      <div className="h-8 w-32 rounded bg-stone-200"></div>
                    </div>
                  </div>
                  
                  <div className="mt-6 h-64 w-full rounded-xl bg-white p-6 shadow-sm">
                     <div className="mb-4 h-6 w-48 rounded bg-stone-100"></div>
                     <div className="flex h-full items-end gap-4 pb-4">
                        <div className="h-[40%] w-full rounded-t bg-stone-100"></div>
                        <div className="h-[60%] w-full rounded-t bg-stone-200"></div>
                        <div className="h-[80%] w-full rounded-t bg-stone-800"></div>
                        <div className="h-[50%] w-full rounded-t bg-stone-100"></div>
                        <div className="h-[70%] w-full rounded-t bg-stone-200"></div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Overlay Label */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-stone-200 bg-white px-4 py-1 text-xs font-bold text-stone-500 shadow-sm">
              Dashboard Preview
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Section */}
      <section className="bg-[#F9F9F9] py-24 border-t border-neutral-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold font-serif mb-4">데이터가 알려주는 성장의 비밀</h2>
            <p className="text-stone-600">유튜브 성장에 필요한 모든 도구가 준비되어 있습니다.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="group rounded-3xl border border-neutral-100 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 group-hover:bg-orange-100 transition-colors">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold font-serif">실시간 떡상 영상 포착</h3>
              <p className="text-stone-600 leading-relaxed">
                지금 이 순간 반응이 터지고 있는 영상을 실시간으로 발견하세요. 
                조회수 급상승 알고리즘을 분석해 기회를 놓치지 않습니다.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-3xl border border-neutral-100 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold font-serif">내 채널 심층 분석</h3>
              <p className="text-stone-600 leading-relaxed">
                단순한 조회수 확인을 넘어, 시청자의 이탈 지점과 재방문율을 분석합니다.
                데이터 기반의 의사결정으로 성장을 가속화하세요.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-3xl border border-neutral-100 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                <LineChart className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold font-serif">키워드 트렌드 추적</h3>
              <p className="text-stone-600 leading-relaxed">
                경쟁도 낮고 검색량은 높은 황금 키워드를 발굴해드립니다.
                남들보다 먼저 트렌드를 선점하고 노출 기회를 잡으세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-stone-400" />
            <span className="text-lg font-bold text-stone-400 font-serif">TubeInsight</span>
          </div>
          <p className="text-sm text-stone-400">
            © 2026 TubeInsight. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
