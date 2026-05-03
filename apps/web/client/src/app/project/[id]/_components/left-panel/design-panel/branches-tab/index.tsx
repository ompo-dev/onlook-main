import { useEditorEngine } from '@/components/store/editor';
import { BranchTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { timeAgo } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { BranchManagement } from './branch-management';


export const BranchesTab = observer(() => {
    const editorEngine = useEditorEngine();
    const { branches } = editorEngine;
    const [hoveredBranchId, setHoveredBranchId] = useState<string | null>(null);

    const handleBranchSwitch = async (branchId: string) => {
        if (branchId === branches.activeBranch.id) return;

        try {
            // Find a frame that belongs to this branch
            const branchFrame = editorEngine.frames.getAll().find(frameData => frameData.frame.branchId === branchId);
            if (branchFrame) {
                // Select the frame, which will trigger the reaction to update the active branch
                editorEngine.frames.select([branchFrame.frame]);
            } else {
                // Fallback to direct branch switch if no frames found
                await branches.switchToBranch(branchId);
            }
        } catch (error) {
            console.error('Failed to switch branch:', error);
        }
    };

    const handleManageBranch = (branchId: string) => {
        editorEngine.state.manageBranchId = branchId;
        editorEngine.state.branchTab = BranchTabValue.MANAGE;
    };

    if (editorEngine.state.branchTab === BranchTabValue.MANAGE && editorEngine.state.manageBranchId) {
        const manageBranch = branches.allBranches.find(b => b.id === editorEngine.state.manageBranchId);
        if (manageBranch) {
            return <BranchManagement branch={manageBranch} />;
        }
    }

    return (
        <div className="flex h-full flex-col bg-[var(--cs-bg)] text-[var(--cs-foreground)]">
            <div className="flex items-center justify-between border-b border-[var(--cs-border)] px-4 py-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium">Branches</h2>
                    <span className="text-xs text-[var(--cs-icon-muted)]">({branches.allBranches.length})</span>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <div className="space-y-2 p-3">
                    {branches.allBranches.map((branch) => {
                        const isActive = branch.id === branches.activeBranch.id;
                        const isHovered = hoveredBranchId === branch.id;

                        return (
                            <div
                                key={branch.id}
                                className={cn(
                                    "group relative flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors",
                                    isActive
                                        ? "border-[var(--cs-accent)] bg-[color:color-mix(in_srgb,var(--cs-accent)_14%,transparent)] text-[var(--cs-foreground)]"
                                        : "border-[var(--cs-border)] bg-[var(--cs-layer)] text-[var(--cs-foreground)] hover:border-[color:color-mix(in_srgb,var(--cs-accent)_35%,var(--cs-border))] hover:bg-[var(--cs-layer-hover)]"
                                )}
                                onClick={() => handleBranchSwitch(branch.id)}
                                onMouseEnter={() => setHoveredBranchId(branch.id)}
                                onMouseLeave={() => setHoveredBranchId(null)}
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {isActive ? (
                                        <Icons.CheckCircled className="h-4 w-4 flex-shrink-0 text-[var(--cs-accent)]" />
                                    ) : (
                                        <Icons.Branch className="h-4 w-4 flex-shrink-0 text-[var(--cs-icon-muted)]" />
                                    )}
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <div className="truncate text-sm font-medium">
                                            {branch.name}
                                        </div>
                                        <div className="mb-1 truncate text-[11px] text-[var(--cs-icon-muted)]">
                                            {timeAgo(branch.updatedAt)}
                                        </div>
                                    </div>
                                </div>

                                {isHovered && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 rounded-lg border border-[var(--cs-border)] bg-[var(--cs-bg-elevated)] p-2 text-[var(--cs-icon)] opacity-60 transition-opacity hover:bg-[var(--cs-layer-hover)] hover:text-[var(--cs-foreground)] hover:opacity-100"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleManageBranch(branch.id);
                                        }}
                                        title="Manage branch"
                                    >
                                        <Icons.Gear className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});
