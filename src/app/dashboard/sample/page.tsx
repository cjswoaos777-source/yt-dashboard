import { ArrowRight, BarChart3, LineChart, Sparkles, TrendingUp, Zap, Clock, Users, PlayCircle, Home, LayoutDashboard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

export default function DashboardSamplePage() {
    return (
        <div className="flex min-h-screen bg-background text-foreground selection:bg-stone-200">
            {/* Sidebar */}
            <aside className="hidden w-64 flex-col border-r border-border bg-card p-6 md:flex">
                <div className="flex items-center gap-2 mb-10">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <TrendingUp className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold font-serif text-heading">TubeInsight</span>
                </div>

                <nav className="flex flex-col gap-2">
                    <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-neutral-100 hover:text-heading transition-colors">
                        <Home className="h-4 w-4" />
                        Landing Page
                    </Link>
                    <Link href="/dashboard/sample" className="flex items-center gap-3 rounded-xl bg-neutral-100 px-3 py-2 text-sm font-medium text-heading">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard Sample
                    </Link>
                    <Link href="#" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-neutral-100 hover:text-heading transition-colors">
                        <Settings className="h-4 w-4" />
                        Settings
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-12 overflow-y-auto">
                <div className="mx-auto max-w-5xl space-y-8">

                    {/* Header Section */}
                    <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-serif font-bold text-heading">Welcome back, Creator</h1>
                            <p className="text-muted-foreground mt-2">Here is what is happening with your videos today.</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button variant="outline" className="rounded-full hidden sm:flex">
                                <Clock className="w-4 h-4 mr-2" />
                                Last 7 Days
                            </Button>
                            <Button className="group shadow-lg hover:shadow-xl transition-all">
                                <Sparkles className="w-4 h-4 mr-2" />
                                Find Trends
                                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                            </Button>
                            <Avatar className="h-10 w-10 border border-border">
                                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                                <AvatarFallback>CR</AvatarFallback>
                            </Avatar>
                        </div>
                    </header>

                    {/* Bento Grid layout */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Main Stats Card */}
                        <Card className="md:col-span-2 border-border shadow-sm min-h-[400px]">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg text-heading">Total Impressions</CardTitle>
                                <CardDescription>Views across all your channels</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col h-[calc(100%-70px)]">
                                <div className="flex items-end gap-4 mb-6">
                                    <h2 className="text-5xl font-serif font-bold text-heading">2.4M</h2>
                                    <Badge variant="secondary" className="mb-2 bg-green-100 text-green-800 hover:bg-green-100/80 rounded-full border-none px-3">
                                        +14.5%
                                    </Badge>
                                </div>

                                {/* Dummy Chart Area */}
                                <div className="flex-1 w-full flex items-end gap-2 mt-auto rounded-xl">
                                    {[40, 60, 30, 80, 50, 90, 100, 70, 85, 45, 65, 95].map((height, i) => (
                                        <div key={i} className="flex-1 rounded-t-sm bg-border hover:bg-primary transition-colors cursor-pointer" style={{ height: `${height}%` }}></div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Stats Column */}
                        <div className="flex flex-col gap-6">
                            <Card className="flex-1 border-border shadow-sm">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg text-heading">Subscribers</CardTitle>
                                        <Users className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-serif font-bold text-heading mt-2">14,203</div>
                                    <p className="text-sm text-green-600 mt-2 font-medium">+1,200 this week</p>
                                </CardContent>
                            </Card>

                            <Card className="flex-1 border-border shadow-sm">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg text-heading">Avg. Duration</CardTitle>
                                        <PlayCircle className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-serif font-bold text-heading mt-2">4m 12s</div>
                                    <p className="text-sm text-muted-foreground mt-2 font-medium">-12s from average</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Viral Videos list */}
                        <Card className="md:col-span-3 border-border shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-heading">Trending Opportunities</CardTitle>
                                <CardDescription>Videos with viral potential based on your niche</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        { title: "How to build a SaaS in 24 hours (Realistic)", views: "250K", score: 98, channel: "CodeMaster" },
                                        { title: "Next.js 15 Full Course 2026", views: "1.2M", score: 95, channel: "WebDevPro" },
                                        { title: "Why I stopped using Tailwind CSS", views: "850K", score: 92, channel: "FrontendDaily" }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex flex-col justify-between gap-4 p-5 rounded-2xl bg-card border border-border hover:border-ring hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all group">
                                            <div className="space-y-3">
                                                <div className="w-full aspect-video bg-neutral-100 rounded-xl overflow-hidden relative flex items-center justify-center group-hover:bg-neutral-200 transition-colors">
                                                    <PlayCircle className="w-8 h-8 text-neutral-400 group-hover:scale-110 transition-transform" />
                                                    <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-lg bg-white/90 text-xs font-bold text-heading shadow-sm backdrop-blur-sm">
                                                        {idx + 1}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-heading mb-1 line-clamp-2 leading-snug">{item.title}</h4>
                                                    <p className="text-xs text-muted-foreground font-medium">{item.channel}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
                                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                                                    <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-heading" /> {item.views} views</span>
                                                    <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" /> Score: {item.score}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </main>
        </div>
    );
}
