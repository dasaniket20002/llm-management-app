import Header from '#/components/header'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="min-h-dvh">
      <Header />
      <main className="size-full grid grid-rows-[50dvh_100dvh]">
        <div className="size-full flex flex-col items-center justify-center border-b uppercase">
          <h1 className="text-9xl font-bold font-cabinet-grotesk">
            TURN <span className="italic font-bold text-primary">AI</span>
          </h1>
          <h2 className="text-6xl font-bold font-cabinet-grotesk">
            INTO ADVANTAGE
          </h2>
        </div>

        <div className="size-full place-items-center place-content-center">
          <div className="size-7/10 bg-secondary rounded-4xl shadow"></div>
        </div>
      </main>
    </div>
  )
}
