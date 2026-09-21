import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/about')({
  component: About,
})

function About() {
  return (
    <main className="px-4 py-12">
      <section className="rounded-lg border bg-card p-6 sm:p-8">
        <p className="mb-4 text-xs text-muted-foreground">About</p>
        <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          A small starter with room to grow.
        </h1>
        <p className="m-0 max-w-3xl text-base leading-8 text-muted-foreground">
          TanStack Start gives you type-safe routing, server functions, and
          modern SSR defaults. Use this as a clean foundation, then layer in
          your own routes, styling, and add-ons.
        </p>
      </section>
    </main>
  )
}
