import { InspectorSheet } from "@/components/InspectorSheet";
import { LeftToolbar } from "@/components/LeftToolbar";
import { Splash } from "@/components/Splash";
import { TopBar } from "@/components/TopBar";
import { ViewSwitcher } from "@/components/ViewSwitcher";

export default function Home() {
  return (
    <>
      <TopBar />
      <LeftToolbar />
      <ViewSwitcher />
      <InspectorSheet />
      <Splash />
    </>
  );
}
