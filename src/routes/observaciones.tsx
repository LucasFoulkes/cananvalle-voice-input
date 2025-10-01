import { createFileRoute } from '@tanstack/react-router'
import { DynamicTable } from "@/components/dynamic-table"

export const Route = createFileRoute('/observaciones')({
  component: RouteComponent,
})

function RouteComponent() {
  const observaciones = JSON.parse(localStorage.getItem("observaciones") || "[]");

  return (
    <DynamicTable data={observaciones} />
  )
}
