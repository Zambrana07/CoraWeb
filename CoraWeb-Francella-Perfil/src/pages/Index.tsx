import { ChevronLeft, User, Share2, Trash2 } from "lucide-react";

const stats = [
  { label: "Posts", value: 10, active: false },
  { label: "Verificados", value: 10, active: true },
  { label: "Conexiones", value: 10, active: false },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <main className="w-full max-w-md relative pb-10">
        {/* Header */}
        <header className="relative h-72 bg-[hsl(var(--header-bg))] rounded-b-[2.5rem] overflow-hidden">
          <button aria-label="Back" className="absolute top-5 left-5 text-primary-foreground">
            <ChevronLeft className="w-7 h-7" strokeWidth={2.5} />
          </button>
          <div className="absolute inset-0 flex items-center justify-center">
            <User className="w-44 h-44 text-primary-foreground" strokeWidth={1.25} />
          </div>
        </header>

        {/* Stats tabs - overlapping header */}
        <div className="absolute right-4 top-56 flex items-end">
          {stats.map((s) => (
            <div
              key={s.label}
              className={[
                "flex flex-col items-center justify-center px-4 rounded-t-2xl",
                s.active
                  ? "bg-[hsl(var(--tab-active))] text-primary-foreground h-20 w-20 z-10 -mx-1"
                  : "bg-[hsl(var(--tab-inactive))] text-foreground h-16 w-16",
              ].join(" ")}
            >
              <span className="text-xl font-bold leading-none">{s.value}</span>
              <span className="text-[10px] mt-1">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Name */}
        <section className="px-6 mt-6">
          <h1 className="text-4xl font-extrabold text-primary underline decoration-2 underline-offset-4 inline-block">
            Alan Brito
          </h1>
        </section>

        {/* About */}
        <section className="px-6 mt-8">
          <h2 className="text-2xl font-bold text-primary">Sobre Mí</h2>
          <p className="text-sm text-primary underline underline-offset-2 mt-1">
            Lore ipsum dolor sit amet blablabka uehfue e
          </p>
        </section>

        {/* Posts */}
        <section className="px-6 mt-8">
          <h2 className="text-3xl font-bold text-primary">Publicados</h2>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-[hsl(var(--card-tile))] border-2 border-border relative"
              >
                <div className="absolute top-1 right-1 left-1 flex justify-end gap-1 bg-foreground/20 rounded-md px-1 py-0.5">
                  <Share2 className="w-3.5 h-3.5 text-primary-foreground" />
                  <Trash2 className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
