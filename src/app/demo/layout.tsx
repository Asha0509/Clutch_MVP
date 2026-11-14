import { DemoShell } from "@/components/demo/demo-shell";

export default function DemoLayout({ children }: LayoutProps<"/demo">) {
  return <DemoShell>{children}</DemoShell>;
}
