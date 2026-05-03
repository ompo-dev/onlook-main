"use client";

import { observer } from "mobx-react-lite";
import { BranchDisplay } from "./branch";
import { ProjectBreadcrumb } from "./project-breadcrumb";

export const TopBar = observer(() => {
  return (
    <div className="flex h-10 items-center justify-between border-b border-white/5 bg-background-onlook/10 px-2 backdrop-blur-xl">
      <div className="flex min-w-0 flex-row items-center">
        <ProjectBreadcrumb />
        <span className="text-foreground-secondary/50 text-small">/</span>
        <BranchDisplay />
      </div>
    </div>
  );
});
