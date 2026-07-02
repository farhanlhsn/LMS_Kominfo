import Link from 'next/link';
import { BookOpen, Brain, Trophy, Users } from 'lucide-react';

export default function HomePage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-foreground">Kominfo AI-LMS</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Daftar
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 pt-20 pb-32 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            Belajar Lebih Cerdas
            <br />
            <span className="text-primary">dengan AI</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Platform pembelajaran digital dengan asisten AI yang membantu Anda memahami materi lebih
            cepat, kapan saja, di mana saja.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Mulai Belajar
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-base font-medium hover:bg-accent transition-colors"
            >
              Masuk
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 pb-32">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={BookOpen}
              title="Materi Lengkap"
              description="Video, PDF, kuis, dan tugas tersusun rapi per modul pembelajaran."
            />
            <FeatureCard
              icon={Brain}
              title="AI Assistant"
              description="Tanya AI untuk penjelasan, ringkasan, atau latihan soal dari materi."
            />
            <FeatureCard
              icon={Trophy}
              title="Leaderboard"
              description="Bersaing sehat antar peserta dan region. Raih XP dan badge."
            />
            <FeatureCard
              icon={Users}
              title="Multi Region"
              description="Mendukung program pembelajaran di Aceh, Medan, Lampung, Bengkulu."
            />
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Kominfo AI Learning Management System
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}): React.ReactElement {
  return (
    <div className="rounded-lg border bg-card p-6 text-left">
      <Icon className="h-10 w-10 text-primary mb-4" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
