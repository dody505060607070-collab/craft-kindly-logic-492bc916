import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/quizzes/$quizId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/quizzes/$quizId"!</div>
}
