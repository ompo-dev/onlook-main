import { api } from "@/trpc/react";
import { Icons } from "@onlook/ui/icons";
import { observer } from "mobx-react-lite";
import { useEditorEngine } from "@/components/store/editor";

export const ProjectBreadcrumb = observer(() => {
  const editorEngine = useEditorEngine();
  const { data: project } = api.project.get.useQuery({
    projectId: editorEngine.projectId,
  });

  return (
    <div className="mr-0 flex flex-row items-center gap-2 text-small">
      <span className="max-w-[60px] truncate text-small text-foreground-onlook md:max-w-[100px] lg:max-w-[220px]">
        {project?.name ?? "Project"}
      </span>
    </div>
  );
});
